import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../dist/', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const security = {
  'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://*.wikipedia.org https://*.wikimedia.org; img-src 'self' data: https://upload.wikimedia.org; style-src 'self'; script-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-cache',
};
const server = createServer(async (req, res) => {
  const fail = (code, message) => { res.writeHead(code, {...security, 'Content-Type':'text/plain; charset=utf-8'}); res.end(req.method === 'HEAD' ? undefined : message); };
  if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); return fail(405, 'Method not allowed'); }
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = path === '/' ? 'index.html' : path.slice(1);
    // Serve only the public build; neither repository metadata nor server files are reachable.
    if (relative.split(/[\\/]/).some(part => part.startsWith('.')) || relative.includes('\\')) return fail(404,'Not found');
    const file = await realpath(resolve(root, relative));
    if (!file.startsWith(root + sep)) return fail(404,'Not found');
    const body = await readFile(file);
    res.writeHead(200, {...security, 'Content-Type': types[extname(file)] || 'text/plain; charset=utf-8', 'Content-Length':body.length});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { fail(404,'Not found'); }
});
server.listen(Number(process.env.PORT || 8000), '0.0.0.0', () => console.log('Wiki Link Count web service ready'));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
