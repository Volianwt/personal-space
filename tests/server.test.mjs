import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedOrigin,
  createApi,
  createNewsService,
  parseFeed,
  resolveConnection,
  responseText,
} from '../server/core.mjs';

const feed = `<rss><channel><item><title><![CDATA[A &amp; B]]></title><link>https://example.com/one</link><pubDate>Tue, 27 Oct 2026 10:00:00 GMT</pubDate></item><item><title>Duplicate</title><link>https://example.com/one</link></item><item><title>Unsafe</title><link>javascript:alert(1)</link></item></channel></rss>`;
const req = (path, body) =>
  new Request(
    `http://127.0.0.1:4278${path}`,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4278' },
          body: JSON.stringify(body),
        }
      : {},
  );
test('RSS parsing decodes titles, rejects unsafe links, and deduplicates', () => {
  const items = parseFeed(feed, 'Test');
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'A & B');
  assert.equal(items[0].publishedAt, '2026-10-27T10:00:00.000Z');
});
test('news is cached within a Toronto day and stale fallback keeps its timestamp', async () => {
  let time = new Date('2026-10-27T14:00:00Z'),
    calls = 0,
    fail = false;
  const service = createNewsService({
    now: () => time,
    fetcher: async () => {
      calls++;
      if (fail) throw Error('offline');
      return new Response(feed);
    },
  });
  const first = await service.get('world');
  await service.get('world');
  assert.equal(calls, 1);
  time = new Date('2026-10-28T14:00:00Z');
  fail = true;
  const stale = await service.get('world');
  assert.equal(calls, 2);
  assert.equal(stale.stale, true);
  assert.equal(stale.fetchedAt, first.fetchedAt);
});
test('concurrent news requests share one upstream request', async () => {
  let calls = 0;
  const service = createNewsService({
    fetcher: async () => {
      calls++;
      return new Response(feed);
    },
  });
  await Promise.all([service.get('tech'), service.get('tech')]);
  assert.equal(calls, 1);
});
test('local access rejects foreign origins and host rebinding', () => {
  assert.equal(allowedOrigin('http://evil.example', '127.0.0.1:4278'), false);
  assert.equal(allowedOrigin(null, 'evil.example:4278'), false);
  assert.equal(allowedOrigin('http://127.0.0.1:4178', '127.0.0.1:4278'), true);
});
test('connection validation locks OpenAI origin and forbids insecure remote URLs', () => {
  assert.throws(() =>
    resolveConnection({ provider: 'custom', baseUrl: 'http://example.com/v1', apiKey: 'key' }),
  );
  assert.throws(() =>
    resolveConnection({ provider: 'ollama', baseUrl: 'http://192.168.1.5:11434' }),
  );
  const c = resolveConnection({
    provider: 'openai',
    baseUrl: 'https://evil.example',
    apiKey: 'test-key',
  });
  assert.equal(c.baseUrl, 'https://api.openai.com/v1');
});
test('OpenAI requests use Responses, send selected conversation, and disable remote response storage', async () => {
  let calledUrl, calledBody;
  const api = createApi({
    env: { OPENAI_API_KEY: 'test-secret' },
    fetcher: async (url, options) => {
      calledUrl = url;
      calledBody = JSON.parse(options.body);
      return Response.json({
        output: [{ type: 'message', content: [{ type: 'output_text', text: '你好' }] }],
      });
    },
  });
  const response = await api(
    req('/api/chat', {
      provider: 'openai',
      model: 'test-model',
      messages: [{ role: 'user', content: 'hello' }],
      diary: 'must-not-send',
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).content, '你好');
  assert.equal(calledUrl, 'https://api.openai.com/v1/responses');
  assert.equal(calledBody.store, false);
  assert.equal(JSON.stringify(calledBody).includes('must-not-send'), false);
  assert.equal(calledBody.input.length, 1);
});
test('Ollama model discovery and chat use native API shapes', async () => {
  const urls = [];
  const api = createApi({
    env: {},
    fetcher: async (url) => {
      urls.push(url);
      return Response.json(
        url.endsWith('/api/tags')
          ? { models: [{ name: 'local-test' }] }
          : { message: { content: 'local reply' } },
      );
    },
  });
  assert.deepEqual((await (await api(req('/api/models', { provider: 'ollama' }))).json()).models, [
    'local-test',
  ]);
  assert.equal(
    (
      await (
        await api(
          req('/api/chat', {
            provider: 'ollama',
            model: 'local-test',
            messages: [{ role: 'user', content: 'hello' }],
          }),
        )
      ).json()
    ).content,
    'local reply',
  );
  assert.ok(urls.every((url) => url.startsWith('http://127.0.0.1:11434/api/')));
});
test('LM Studio uses the compatible API without requiring a key', async () => {
  let called;
  const api = createApi({
    env: {},
    fetcher: async (url) => {
      called = url;
      return Response.json({ choices: [{ message: { content: 'reply' } }] });
    },
  });
  const response = await api(
    req('/api/chat', {
      provider: 'lmstudio',
      model: 'loaded-model',
      messages: [{ role: 'user', content: 'hello' }],
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(called, 'http://127.0.0.1:1234/v1/chat/completions');
});
test('provider errors never reflect upstream secrets or raw error bodies', async () => {
  const api = createApi({
    env: { OPENAI_API_KEY: 'private-key' },
    fetcher: async () => new Response('private-key leaked upstream', { status: 401 }),
  });
  const response = await api(
    req('/api/chat', {
      provider: 'openai',
      model: 'm',
      messages: [{ role: 'user', content: 'hello' }],
    }),
  );
  const body = await response.text();
  assert.equal(response.status, 502);
  assert.equal(body.includes('private-key'), false);
});
test('empty models and oversized conversations fail explicitly', async () => {
  const api = createApi({
    env: {},
    fetcher: async () => {
      throw new Error('must not fetch');
    },
  });
  const response = await api(req('/api/chat', { provider: 'ollama', model: '', messages: [] }));
  assert.equal(response.status, 400);
  assert.equal(responseText({ choices: [] }, 'custom'), '');
  const tooLong = await api(
    req('/api/chat', {
      provider: 'ollama',
      model: 'model',
      messages: Array.from({ length: 101 }, () => ({ role: 'user', content: 'hello' })),
    }),
  );
  assert.equal(tooLong.status, 400);
});
