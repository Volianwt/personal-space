export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const FEEDS = {
  world: { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  canada: { name: 'CBC News', url: 'https://www.cbc.ca/webfeed/rss/rss-topstories' },
  tech: { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
};
const plainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
export function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, code) => {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
      if (named[code.toLowerCase()]) return named[code.toLowerCase()];
      const point = code.toLowerCase().startsWith('#x')
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isInteger(point) && point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : '';
    })
    .trim();
}
export function parseFeed(xml, source) {
  const articles = [];
  const seen = new Set();
  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];
    const tag = (name) =>
      decodeXml(
        block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] ?? '',
      );
    const title = tag('title').slice(0, 350);
    let link;
    try {
      link = new URL(tag('link'));
    } catch {
      continue;
    }
    if (
      !title ||
      !['http:', 'https:'].includes(link.protocol) ||
      link.username ||
      link.password ||
      seen.has(link.href)
    )
      continue;
    const published = Date.parse(tag('pubDate'));
    seen.add(link.href);
    articles.push({
      id: link.href,
      title,
      url: link.href,
      source,
      publishedAt: Number.isFinite(published) ? new Date(published).toISOString() : null,
    });
    if (articles.length === 30) break;
  }
  return articles.sort(
    (a, b) => (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0),
  );
}
async function readLimited(response, limit = 1024 * 1024) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  let length = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      throw new AppError(502, 'The service returned too much data.');
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
function dateKey(now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function createNewsService({ fetcher = fetch, now = () => new Date() } = {}) {
  const cache = new Map();
  const pending = new Map();
  async function refresh(topic) {
    const feed = FEEDS[topic];
    try {
      const response = await fetcher(feed.url, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
        redirect: 'follow',
      });
      if (!response.ok) throw new Error('feed unavailable');
      const items = parseFeed(await readLimited(response), feed.name);
      if (!items.length) throw new Error('empty feed');
      const result = { items: items.slice(0, 12), fetchedAt: now().toISOString(), stale: false };
      cache.set(topic, { day: dateKey(now()), result });
      return result;
    } catch {
      if (cache.has(topic))
        return {
          ...cache.get(topic).result,
          stale: true,
          warning: 'The refresh failed. Showing the last saved headlines.',
        };
      throw new AppError(
        503,
        'News is unavailable. Check your connection and try again; no saved headlines are available.',
      );
    }
  }
  return {
    async get(topic, force = false) {
      if (!Object.hasOwn(FEEDS, topic)) throw new AppError(400, 'Unknown news category.');
      const cached = cache.get(topic);
      if (!force && cached?.day === dateKey(now())) return cached.result;
      if (pending.has(topic)) return pending.get(topic);
      const task = refresh(topic).finally(() => pending.delete(topic));
      pending.set(topic, task);
      return task;
    },
  };
}

export function resolveConnection(input, env = {}) {
  if (!plainObject(input) || !['ollama', 'lmstudio', 'openai', 'custom'].includes(input.provider))
    throw new AppError(400, 'Choose a valid model provider.');
  const provider = input.provider;
  const defaults = {
    ollama: env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    lmstudio: env.LMSTUDIO_BASE_URL || 'http://127.0.0.1:1234/v1',
    openai: 'https://api.openai.com/v1',
    custom: env.CUSTOM_BASE_URL || '',
  };
  const baseUrl =
    provider === 'openai'
      ? defaults.openai
      : String(input.baseUrl || defaults[provider]).replace(/\/+$/, '');
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new AppError(400, 'Enter the full service URL.');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['http:', 'https:'].includes(url.protocol) ||
    (url.protocol === 'http:' && !loopback)
  )
    throw new AppError(
      400,
      'Remote APIs require HTTPS. Local services may use localhost HTTP. Keep keys out of the URL.',
    );
  if ((provider === 'ollama' || provider === 'lmstudio') && !loopback)
    throw new AppError(
      400,
      'Local models must use localhost or 127.0.0.1. Choose a compatible API for a remote service.',
    );
  const key =
    typeof input.apiKey === 'string' && input.apiKey.trim()
      ? input.apiKey.trim()
      : provider === 'openai'
        ? env.OPENAI_API_KEY || ''
        : provider === 'custom'
          ? env.CUSTOM_API_KEY || ''
          : env.LOCAL_API_KEY || '';
  if (key.length > 1000 || /[\r\n]/.test(key)) throw new AppError(400, 'Invalid API key format.');
  if ((provider === 'openai' || provider === 'custom') && !key)
    throw new AppError(400, 'Enter an API key in settings or configure your local .env file.');
  return { provider, baseUrl, key };
}
function chatMessages(input) {
  if (!Array.isArray(input.messages) || !input.messages.length || input.messages.length > 100)
    throw new AppError(
      400,
      'Requests must contain 1–100 messages. Start a new conversation for a longer topic.',
    );
  let total = 0;
  const messages = input.messages.map((m) => {
    if (
      !plainObject(m) ||
      !['user', 'assistant'].includes(m.role) ||
      typeof m.content !== 'string' ||
      !m.content.trim() ||
      m.content.length > 100000
    )
      throw new AppError(400, 'The message is invalid or too long.');
    total += m.content.length;
    return { role: m.role, content: m.content };
  });
  if (total > 300000) throw new AppError(400, 'This conversation is too long. Start a new one.');
  if (
    input.systemPrompt !== undefined &&
    (typeof input.systemPrompt !== 'string' || input.systemPrompt.length > 5000)
  )
    throw new AppError(400, 'The assistant instructions are too long.');
  return input.systemPrompt?.trim()
    ? [{ role: 'system', content: input.systemPrompt.trim() }, ...messages]
    : messages;
}
export function responseText(data, provider) {
  if (provider === 'ollama')
    return typeof data?.message?.content === 'string' ? data.message.content : '';
  if (provider !== 'openai')
    return typeof data?.choices?.[0]?.message?.content === 'string'
      ? data.choices[0].message.content
      : '';
  return Array.isArray(data?.output)
    ? data.output
        .filter((item) => item.type === 'message')
        .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
        .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join('\n')
    : '';
}
async function upstreamJson(url, { key, body, fetcher, signal }) {
  let response;
  try {
    response = await fetcher(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(120000)])
        : AbortSignal.timeout(20000),
      redirect: 'error',
    });
  } catch {
    throw new AppError(
      502,
      'Cannot reach the model service. Check that it is running, verify its address, and check your connection.',
    );
  }
  if (!response.ok) {
    const messages = {
      401: 'The API key is invalid or not authorized.',
      403: 'Your account does not have access.',
      404: 'The service path or model was not found.',
      429: 'A rate or usage limit was reached. Try again later.',
      400: 'The model does not support this request. Check the model name and API type.',
    };
    throw new AppError(
      502,
      `Model service returned ${response.status}: ${messages[response.status] || 'The request failed. Check the service status.'}`,
    );
  }
  try {
    return JSON.parse(await readLimited(response, 4 * 1024 * 1024));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'The model service did not return valid JSON.');
  }
}

export function allowedOrigin(origin, host, port = '4278') {
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  if (!hosts.has(host)) return false;
  if (!origin) return true;
  return [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    'http://127.0.0.1:4178',
    'http://localhost:4178',
  ].includes(origin);
}
const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

export function createApi({
  env = process.env,
  fetcher = fetch,
  news = createNewsService({ fetcher }),
} = {}) {
  return async (request) => {
    try {
      const url = new URL(request.url);
      if (!allowedOrigin(request.headers.get('Origin'), url.host, env.PORT || '4278'))
        throw new AppError(403, 'Access is limited to your local personal space.');
      if (request.method === 'GET' && url.pathname === '/api/health')
        return json({
          ok: true,
          providers: {
            openai: !!env.OPENAI_API_KEY,
            custom: !!env.CUSTOM_API_KEY,
            local: !!env.LOCAL_API_KEY,
          },
        });
      if (request.method === 'GET' && url.pathname === '/api/news')
        return json(
          await news.get(
            url.searchParams.get('topic') || 'world',
            url.searchParams.get('refresh') === '1',
          ),
        );
      if (request.method !== 'POST' || !['/api/chat', '/api/models'].includes(url.pathname))
        throw new AppError(404, 'Endpoint not found.');
      if (!request.headers.get('Content-Type')?.startsWith('application/json'))
        throw new AppError(415, 'A JSON request is required.');
      const raw = await request.text();
      if (raw.length > 1000000) throw new AppError(413, 'The request is too large.');
      let input;
      try {
        input = JSON.parse(raw);
      } catch {
        throw new AppError(400, 'Invalid JSON.');
      }
      const { provider, baseUrl, key } = resolveConnection(input, env);
      if (url.pathname === '/api/models') {
        const data = await upstreamJson(
          baseUrl + (provider === 'ollama' ? '/api/tags' : '/models'),
          { key, fetcher, signal: request.signal },
        );
        const names =
          provider === 'ollama' ? data.models?.map((m) => m.name) : data.data?.map((m) => m.id);
        return json({
          models: [
            ...new Set(
              (Array.isArray(names) ? names : []).filter(
                (name) => typeof name === 'string' && name.length <= 200,
              ),
            ),
          ]
            .sort()
            .slice(0, 500),
        });
      }
      if (typeof input.model !== 'string' || !input.model.trim() || input.model.length > 200)
        throw new AppError(400, 'Choose or enter a model name.');
      const messages = chatMessages(input);
      const model = input.model.trim();
      const body =
        provider === 'openai'
          ? { model, input: messages, store: false, stream: false, max_output_tokens: 4096 }
          : provider === 'ollama'
            ? { model, messages, stream: false, options: { num_predict: 4096 } }
            : { model, messages, stream: false };
      const endpoint =
        provider === 'openai'
          ? '/responses'
          : provider === 'ollama'
            ? '/api/chat'
            : '/chat/completions';
      const data = await upstreamJson(baseUrl + endpoint, {
        key,
        body,
        fetcher,
        signal: request.signal,
      });
      const content = responseText(data, provider);
      if (!content.trim())
        throw new AppError(
          502,
          'The model returned no text. Try another model or check its configuration.',
        );
      return json({ content, model });
    } catch (error) {
      return json(
        {
          error:
            error instanceof AppError
              ? error.message
              : 'The request did not complete. Check your settings and try again.',
        },
        error instanceof AppError ? error.status : 500,
      );
    }
  };
}
