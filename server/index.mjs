import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi, createNewsService, FEEDS } from './core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  process.loadEnvFile(path.join(root, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const port = Number(process.env.PORT || 4278);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be a valid TCP port.');
const news = createNewsService();
const api = createApi({ env: { ...process.env, PORT: String(port) }, news });
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
};
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  const host = req.headers.host;
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) {
    res.writeHead(403).end('Local access only');
    return;
  }
  const url = new URL(req.url || '/', `http://${host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1000000) {
          res.writeHead(413).end('Request too large');
          return;
        }
        chunks.push(chunk);
      }
      const controller = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) controller.abort();
      });
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}),
        signal: controller.signal,
      });
      const response = await api(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405).end('Method not allowed');
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const dist = path.join(root, 'dist');
    const target = path.resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (
      !target.startsWith(dist + path.sep) ||
      pathname.split('/').some((segment) => segment.startsWith('.'))
    ) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const bytes = await fs.readFile(target);
    res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    res
      .writeHead(error.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8',
      })
      .end('Page unavailable. Run npm run build first.');
  }
});
server.on('error', (error) => {
  console.error(
    `Cannot start local service (${error.code || 'unknown error'}). Check port permissions or whether port ${port} is already in use.`,
  );
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(
    `Personal space: http://127.0.0.1:${port}\nOnly this computer can access the service. Stop with Ctrl+C.`,
  );
  const refresh = () => {
    for (const topic of Object.keys(FEEDS)) void news.get(topic).catch(() => {});
  };
  refresh();
  setInterval(refresh, 15 * 60 * 1000).unref();
});
