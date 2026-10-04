import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CONFIG = path.resolve('src/config.json');

// Dev-only API: read/write the timing config, and run the renderer with streamed progress.
function api() {
  let rendering = null;
  return {
    name: 'code-as-video-api',
    configureServer(server) {
      server.middlewares.use('/api/config', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (c) => (body += c));
          req.on('end', () => {
            const cfg = JSON.parse(body);
            fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + '\n');
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          });
          return;
        }
        res.setHeader('content-type', 'application/json');
        res.setHeader('cache-control', 'no-store');
        res.end(fs.readFileSync(CONFIG));
      });

      server.middlewares.use('/api/render', (req, res) => {
        if (req.method !== 'POST') return res.end();
        if (rendering) {
          res.statusCode = 409;
          return res.end('a render is already running\n');
        }
        const url = new URL(req.url, 'http://x');
        const { port } = server.config.server;
        const args = ['scripts/render.mjs', '--url', `http://localhost:${server.httpServer.address().port || port}`];
        if (url.searchParams.get('scale')) args.push('--scale', url.searchParams.get('scale'));
        res.setHeader('content-type', 'text/plain; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        rendering = spawn(process.execPath, args, { cwd: process.cwd() });
        rendering.stdout.on('data', (d) => res.write(d));
        rendering.stderr.on('data', (d) => res.write(d));
        rendering.on('close', (code) => {
          res.end(code === 0 ? '\n__DONE__\n' : `\n__FAILED__ (${code})\n`);
          rendering = null;
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [api()],
  server: { port: 5180, watch: { ignored: ['**/.cache/**', '**/out/**', '**/src/config.json'] } },
  build: { rollupOptions: { input: { admin: 'index.html', composition: 'composition.html' } } },
});
