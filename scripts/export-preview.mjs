import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// A portable, single-file preview for reviewing the built site without a server.
// The normal deployment keeps Vite's separate, cacheable assets in index.html.
const directory = path.resolve('dist');
let html = await readFile(path.join(directory, 'index.html'), 'utf8');
const script = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const stylesheet = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
if (!script || !stylesheet) throw new Error('Expected one Vite entry script and stylesheet.');
const javascript = await readFile(path.join(directory, script[1].replace(/^\//, '')), 'utf8');
const css = await readFile(path.join(directory, stylesheet[1].replace(/^\//, '')), 'utf8');
// This application has one bundled entry, with no dynamic imports or module URLs.
if (/\bimport\s*\(|import\.meta/.test(javascript))
  throw new Error('Portable preview requires a fully bundled entry.');
html = html.replace(script[0], '');
html = html.replace(
  '</body>',
  () => `<script>${javascript.replace(/<\/script/gi, '<\\/script')}</script></body>`,
);
html = html.replace(
  stylesheet[0],
  () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`,
);
const icon = await readFile(path.resolve('public/favicon.svg'));
html = html.replace(
  'href="/favicon.svg"',
  `href="data:image/svg+xml;base64,${icon.toString('base64')}"`,
);
await writeFile(path.join(directory, 'preview.html'), html);
console.log('Portable preview: dist/preview.html');
