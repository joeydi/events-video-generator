// Renders the matrix (matrix.html): every event × every format in one frame.
//
//   node scripts/render-matrix.mjs --still        → out/matrix.png at 2× (frame `poster` from matrix.json)
//   node scripts/render-matrix.mjs --still 60     → the same, at clip frame 60
//   node scripts/render-matrix.mjs                → out/matrix.mp4, one seamless cycle of the clips
//   --scale 2                                     → video at 2× (out/matrix@2x.mp4); stills default to 2×
//   --url http://localhost:5180                   → reuse a running dev server
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { events, SOURCE_LOOP_FRAMES } from '../src/events.js';
import { ensurePreview } from './prepare-media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.cache');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/matrix.json'), 'utf8'));
const argv = process.argv.slice(2);
const has = (name) => argv.includes(`--${name}`);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  const v = argv[i + 1];
  return i >= 0 && v && !v.startsWith('--') ? v : fallback;
};

const still = has('still');
const stillFrame = Number(arg('still', cfg.poster));
const scale = Number(arg('scale', still ? 2 : 1));
let url = arg('url', null);

// The clips at their own speed: one JPG per source frame, so a full render is exactly one loop.
for (const id of cfg.events) {
  const e = events[id];
  ensurePreview(e);
  const dir = path.join(CACHE, id, 'src');
  const count = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length : 0;
  const preview = path.join(CACHE, id, 'preview.mp4');
  if (count === SOURCE_LOOP_FRAMES && fs.statSync(path.join(dir, '0000.jpg')).mtimeMs > fs.statSync(preview).mtimeMs) continue;
  console.log(`[${id}] ${SOURCE_LOOP_FRAMES} source frames`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', preview, '-q:v', '2', '-start_number', '0', path.join(dir, '%04d.jpg')], { stdio: 'inherit' });
}

let server;
if (!url) {
  const { createServer } = await import('vite');
  server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0 } });
  await server.listen();
  url = `http://localhost:${server.httpServer.address().port}`;
}

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: cfg.width, height: 1080 }, deviceScaleFactor: scale });
page.on('pageerror', (err) => console.error('page error:', err.message));
await page.goto(`${url}/matrix.html?mode=render`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });
const size = await page.evaluate(() => window.__size);
await page.setViewportSize({ width: size.w, height: size.h });
const seek = (n) => page.evaluate((n) => window.__seek(n), n);
const t0 = Date.now();
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
console.log(`matrix: ${size.w * scale}×${size.h * scale}`);

try {
  if (still) {
    await seek(stillFrame);
    const file = path.join(ROOT, 'out', 'matrix.png');
    await page.screenshot({ path: file });
    console.log(`frame ${stillFrame} → ${path.relative(ROOT, file)}`);
  } else {
    const out = path.join(ROOT, 'out', scale === 1 ? 'matrix.mp4' : `matrix@${scale}x.mp4`);
    const ff = spawn('ffmpeg', [
      '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(cfg.fps), '-i', '-',
      // Same colour handling as render.mjs: BT.709 matrix, tagged with the sRGB curve.
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=iec61966-2-1',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
      '-movflags', '+faststart', '-r', String(cfg.fps), out,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
    for (let n = 0; n < SOURCE_LOOP_FRAMES; n++) {
      await seek(n);
      const png = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      if (n % 20 === 0 || n === SOURCE_LOOP_FRAMES - 1) console.log(`frame ${n + 1}/${SOURCE_LOOP_FRAMES}`);
    }
    ff.stdin.end();
    await done;
    console.log(`wrote ${path.relative(ROOT, out)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} finally {
  await browser.close();
  await server?.close();
}
