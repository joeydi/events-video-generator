// Normalizes each event's background media into .cache/<event>/:
//   preview.mp4      H.264 1920×1080, exactly one loop (SOURCE_LOOP_FRAMES @24fps) — used by the admin
//   f<N>/0000.jpg…   N frames time-stretched so one video cycle == one output loop — used by the renderer
// Events without a video get a slow, periodic Ken Burns move over their still so they behave like a clip.
// Also downsizes the design reference PNGs into .cache/ref/ for the admin overlay.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { events, SOURCE_LOOP_SECONDS, SOURCE_LOOP_FRAMES, SOURCE_FPS } from '../src/events.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.resolve(ROOT, '..');
const CACHE = path.join(ROOT, '.cache');
const SRC_FRAMES = SOURCE_LOOP_FRAMES;

export const loadConfig = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/config.json'), 'utf8'));
export const loopSeconds = (cfg) => cfg.sequence.length * (cfg.hold + cfg.morph);
export const totalFrames = (cfg) => Math.round(loopSeconds(cfg) * cfg.fps);

const ffmpeg = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const readJSON = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
const COVER = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1';

function sourceFor(e) {
  const rel = e.media.video || e.media.still;
  const abs = path.join(ASSETS, rel);
  if (!fs.existsSync(abs)) throw new Error(`[${e.id}] missing media: ${abs}`);
  return { rel, abs, isVideo: !!e.media.video, mtime: fs.statSync(abs).mtimeMs };
}

export function ensurePreview(e, log = console.log) {
  const dir = path.join(CACHE, e.id);
  fs.mkdirSync(dir, { recursive: true });
  const src = sourceFor(e);
  const manifestPath = path.join(dir, 'manifest.json');
  const manifest = readJSON(manifestPath, {});
  const out = path.join(dir, 'preview.mp4');
  if (manifest.source === src.rel && manifest.mtime === src.mtime && fs.existsSync(out)) return manifest;

  log(`[${e.id}] preview ← ${src.rel}${src.isVideo ? '' : ' (still → Ken Burns)'}`);
  // New source: any render frames cut from the old one are stale.
  for (const d of fs.readdirSync(dir)) if (/^f\d+$/.test(d)) fs.rmSync(path.join(dir, d), { recursive: true, force: true });
  const enc = ['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '12', '-r', String(SOURCE_FPS), '-movflags', '+faststart'];
  if (src.isVideo) {
    ffmpeg(['-i', src.abs, '-vf', `trim=end_frame=${SRC_FRAMES},setpts=PTS-STARTPTS,${COVER}`, '-frames:v', String(SRC_FRAMES), ...enc, out]);
  } else {
    const n = SRC_FRAMES;
    const zp =
      `scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,` +
      `zoompan=z='1.07+0.035*sin(2*PI*on/${n})':` +
      `x='iw/2-(iw/zoom/2)+60*sin(2*PI*on/${n})':y='ih/2-(ih/zoom/2)+30*cos(2*PI*on/${n})':` +
      `d=1:s=1920x1080:fps=${SOURCE_FPS}`;
    ffmpeg(['-loop', '1', '-i', src.abs, '-vf', zp, '-frames:v', String(n), ...enc, out]);
  }
  const next = { source: src.rel, mtime: src.mtime, frames: {} };
  fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2));
  return next;
}

export function ensureFrames(e, cfg, log = console.log) {
  const manifest = ensurePreview(e, log);
  const N = totalFrames(cfg);
  const dir = path.join(CACHE, e.id, `f${N}`);
  const count = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length : 0;
  if (count === N) return dir;

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const stretch = loopSeconds(cfg) / SOURCE_LOOP_SECONDS;
  log(`[${e.id}] ${N} render frames (video ×${(1 / stretch).toFixed(3)} speed)`);
  ffmpeg([
    '-stream_loop', '1', '-i', path.join(CACHE, e.id, 'preview.mp4'),
    '-vf', `setpts=PTS*${stretch},fps=${cfg.fps}`,
    '-frames:v', String(N), '-q:v', '2', '-start_number', '0',
    path.join(dir, '%04d.jpg'),
  ]);
  const made = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
  if (made !== N) throw new Error(`[${e.id}] expected ${N} frames, got ${made}`);
  manifest.frames[N] = { fps: cfg.fps, loop: loopSeconds(cfg) };
  fs.writeFileSync(path.join(CACHE, e.id, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return dir;
}

export function ensureReferences(log = console.log) {
  const dir = path.join(CACHE, 'ref');
  fs.mkdirSync(dir, { recursive: true });
  for (const e of Object.values(events)) {
    for (const [aspect, rel] of Object.entries(e.reference)) {
      const out = path.join(dir, `${e.id}-${aspect}.jpg`);
      if (fs.existsSync(out)) continue;
      const abs = path.join(ASSETS, rel);
      if (!fs.existsSync(abs)) { log(`[${e.id}] reference missing: ${rel}`); continue; }
      ffmpeg(['-i', abs, '-vf', aspect === 'landscape' ? 'scale=1920:1080' : 'scale=1080:1350', '-q:v', '3', out]);
    }
  }
}

export function prepareAll(cfg = loadConfig(), log = console.log) {
  ensureReferences(log);
  for (const e of Object.values(events)) {
    ensureFrames(e, cfg, log);
    if (!e.media.video) log(`[${e.id}] note: no video yet — using still "${e.media.still}"`);
  }
  log(`ready: ${totalFrames(cfg)} frames @${cfg.fps}fps (${loopSeconds(cfg).toFixed(2)}s loop)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) prepareAll();
