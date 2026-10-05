// Renders the admin view itself as a seamless loop: sliders waving, overlays and easing
// switching, the playhead crossing the whole timeline once. Same pipeline as render.mjs —
// seek, screenshot, pipe to ffmpeg — driven by src/admin-capture.js.
//
//   node scripts/render-admin.mjs                    → out/admin.mp4 (1920×1080, 12s)
//   node scripts/render-admin.mjs --seconds 15       → longer loop
//   node scripts/render-admin.mjs --scale 2          → out/admin@2x.mp4 (3840×2160)
//   node scripts/render-admin.mjs --stills 0,90,180  → out/admin-stills/0000.png … (no video)
//   --url http://localhost:5180                      → reuse a running dev server
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { events } from '../src/events.js';
import { ensureFrames, ensureReferences, loadConfig } from './prepare-media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIEW = { width: 1920, height: 1080 };
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};

const scale = Number(arg('scale', 1));
const stills = arg('stills', null)?.split(',').map(Number);
let url = arg('url', null);
const cfg = url ? await (await fetch(`${url}/api/config`)).json() : loadConfig();
const N = Math.round(Number(arg('seconds', 12)) * cfg.fps);

console.log(`admin capture: ${(N / cfg.fps).toFixed(2)}s · ${N} frames @${cfg.fps}fps · ${VIEW.width * scale}×${VIEW.height * scale}`);
ensureReferences();
// Background clips stretched so one video cycle spans the capture, not the composition loop.
const captureCfg = { ...cfg, hold: N / cfg.fps / cfg.sequence.length, morph: 0 };
for (const e of Object.values(events)) ensureFrames(e, captureCfg);

let server;
if (!url) {
  const { createServer } = await import('vite');
  server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0 } });
  await server.listen();
  url = `http://localhost:${server.httpServer.address().port}`;
}

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: scale });
page.on('pageerror', (err) => console.error('page error:', err.message));
await page.goto(`${url}/?capture=${N}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });

const seek = (n) => page.evaluate((n) => window.__seek(n), n);
const t0 = Date.now();

try {
  if (stills) {
    const dir = path.join(ROOT, 'out/admin-stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const n of stills) {
      await seek(n);
      const file = path.join(dir, `${String(n).padStart(4, '0')}.png`);
      await page.screenshot({ path: file });
      console.log(`still ${n} → ${path.relative(ROOT, file)}`);
    }
  } else {
    fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
    const out = path.join(ROOT, 'out', scale === 1 ? 'admin.mp4' : `admin@${scale}x.mp4`);
    const ff = spawn('ffmpeg', [
      '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(cfg.fps), '-i', '-',
      // Screenshots are sRGB: convert with the BT.709 matrix and tag the sRGB curve, or browsers and
      // QuickTime decode with the wrong matrix and a BT.709 gamma lift and wash out saturated colors.
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=iec61966-2-1',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
      '-movflags', '+faststart', '-r', String(cfg.fps), out,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));

    for (let n = 0; n < N; n++) {
      await seek(n);
      const png = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      if (n % 15 === 0 || n === N - 1) console.log(`frame ${n + 1}/${N}`);
    }
    ff.stdin.end();
    await done;
    console.log(`wrote ${path.relative(ROOT, out)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} finally {
  await browser.close();
  await server?.close();
}
