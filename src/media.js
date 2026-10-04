// Background media per event, in two interchangeable modes:
//  preview — one looping <video> per event, kept in sync with the timeline clock
//  render  — pre-extracted JPG frames (.cache/<id>/f<N>/), loaded + decoded per frame (deterministic)
// Either way, `source(id)` returns something drawImage() accepts.
import { SOURCE_LOOP_SECONDS } from './events.js';

const pad = (n) => String(n).padStart(4, '0');

export class MediaBank {
  constructor(ids, mode) {
    this.ids = ids;
    this.mode = mode;
    this.videos = {};
    this.images = {};
  }

  async load() {
    if (this.mode !== 'preview') return;
    await Promise.all(
      this.ids.map((id) => {
        const v = document.createElement('video');
        Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
        v.src = `/.cache/${id}/preview.mp4`;
        this.videos[id] = v;
        return new Promise((res, rej) => {
          v.addEventListener('loadeddata', res, { once: true });
          v.addEventListener('error', () => rej(new Error(`video failed: ${v.src}`)), { once: true });
        });
      })
    );
  }

  // Preview: keep each video at (t / loop) of its own cycle.
  sync(t, loop, playing, speed = 1) {
    const D = SOURCE_LOOP_SECONDS;
    const target = (((t / loop) * D) % D + D) % D;
    for (const v of Object.values(this.videos)) {
      let diff = v.currentTime - target;
      if (diff > D / 2) diff -= D;
      if (diff < -D / 2) diff += D;
      if (playing) {
        v.playbackRate = (D / loop) * speed;
        if (v.paused) v.play().catch(() => {});
        if (Math.abs(diff) > 0.15) v.currentTime = target;
      } else {
        if (!v.paused) v.pause();
        if (Math.abs(diff) > 1 / 60) v.currentTime = target;
      }
    }
  }

  // Render: decode frame n for the given events before drawing.
  async loadFrame(n, total, ids) {
    await Promise.all(
      ids.map(async (id) => {
        const img = new Image();
        img.src = `/.cache/${id}/f${total}/${pad(n)}.jpg`;
        await img.decode();
        this.images[id] = img;
      })
    );
  }

  source(id) {
    return this.mode === 'preview' ? this.videos[id] : this.images[id];
  }

  ready(id) {
    const s = this.source(id);
    if (!s) return false;
    return this.mode === 'preview' ? s.readyState >= 2 : s.complete;
  }
}
