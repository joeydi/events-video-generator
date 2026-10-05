// The matrix: every event in every format, as a still grid. One row per event, one column per
// format (16:9 cover, 4:5 post, and the background clip on its own). Each cell is the same
// template the loop uses, laid out at its artboard size and scaled into place, with the event's
// clip drawn into its art slot, so every cell plays in step with the others.
import './fonts.css';
import './stage.css';
import './matrix.css';
import { events, SOURCE_LOOP_FRAMES, SOURCE_LOOP_SECONDS } from './events.js';
import { FONTS } from './stage.js';
import { templates } from './templates/index.js';
import { MediaBank } from './media.js';

const ARTBOARD = { landscape: { w: 1920, h: 1080 }, portrait: { w: 1080, h: 1350 }, background: { w: 1920, h: 1080 } };
const pad = (n) => String(n).padStart(4, '0');
const px = (v) => `${v}px`;
const box = (el, x, y, w, h) => Object.assign(el.style, { left: px(x), top: px(y), width: px(w), height: px(h) });

// Cell geometry in frame px: every cell in a row shares a height, and the row fills the width.
export function layout(cfg) {
  const { width, padding: P, gap: G, rowGap, labels } = cfg;
  const cols = cfg.columns.map((c) => ({ ...c, ab: ARTBOARD[c.kind] }));
  const left = P + (labels.rows ? labels.rowWidth + G : 0);
  const top = P + (labels.columns ? Math.round(labels.size * 1.2) + labels.gap : 0);
  const ratios = cols.reduce((sum, c) => sum + c.ab.w / c.ab.h, 0);
  const h = Math.floor((width - left - P - G * (cols.length - 1)) / ratios);
  let x = left;
  for (const c of cols) {
    c.x = x;
    c.w = Math.round((h * c.ab.w) / c.ab.h);
    x += c.w + G;
  }
  const rows = cfg.events.map((id, i) => ({ id, y: top + i * (h + rowGap) }));
  const bottom = top + rows.length * h + (rows.length - 1) * rowGap + P;
  return { cols, rows, h, top, width, height: bottom + (bottom % 2) };
}

export class Matrix {
  constructor(container, { mode = 'preview', config }) {
    this.container = container;
    this.mode = mode;
    this.cfg = config;
  }

  get totalFrames() {
    return SOURCE_LOOP_FRAMES;
  }

  async init() {
    this.build();
    await Promise.all([...FONTS, ...[500, 600].map((w) => `${w} ${this.cfg.labels.size}px "IBM Plex Mono"`)].map((f) => document.fonts.load(f)));
    await document.fonts.ready;
    this.media = new MediaBank(this.cfg.events, this.mode);
    await this.media.load();
  }

  build() {
    const { cfg } = this;
    const L = layout(cfg);
    this.size = { w: L.width, h: L.height };

    const frame = document.createElement('div');
    frame.className = 'matrix';
    Object.assign(frame.style, { width: px(L.width), height: px(L.height), background: cfg.background });
    frame.style.setProperty('--label-size', px(cfg.labels.size));
    frame.style.setProperty('--label-color', cfg.labels.color);
    frame.style.setProperty('--label-detail-color', cfg.labels.detailColor ?? cfg.labels.color);
    this.container.appendChild(frame);
    this.frame = frame;

    const label = (text, x, y, w, detail) => {
      const el = document.createElement('div');
      el.className = 'matrix-label';
      el.append(text);
      if (detail) {
        const d = document.createElement('span');
        d.className = 'matrix-label-detail';
        d.textContent = detail;
        el.append(d);
      }
      Object.assign(el.style, { left: px(x), top: px(y), width: px(w) });
      frame.appendChild(el);
    };
    if (cfg.labels.columns) for (const c of L.cols) label(c.label, c.x, cfg.padding, c.w, c.detail);

    this.canvases = [];
    for (const row of L.rows) {
      const e = events[row.id];
      if (cfg.labels.rows) label(cfg.rowLabels[row.id] ?? e.label, cfg.padding, row.y, cfg.labels.rowWidth);
      for (const c of L.cols) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        box(cell, c.x, row.y, c.w, L.h);
        Object.assign(cell.style, {
          background: cfg.cell.background ?? e.background,
          borderRadius: px(cfg.cell.radius),
          boxShadow: cfg.cell.shadow,
          outlineColor: cfg.cell.border ?? 'transparent',
        });
        frame.appendChild(cell);

        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        if (c.kind === 'background') {
          canvas.className = 'matrix-fill';
          cell.appendChild(canvas);
        } else {
          // Lay the template out at artboard size, then scale the whole thing into the cell.
          const inner = document.createElement('div');
          inner.className = 'matrix-inner';
          Object.assign(inner.style, { width: px(c.ab.w), height: px(c.ab.h), transform: `scale(${L.h / c.ab.h})` });
          inner.innerHTML = templates[e.template][c.kind](e);
          cell.appendChild(inner);
          // Without art the layouts sit on the cell colour, and the fade into the art goes too.
          if (!cfg.cell.art) {
            inner.querySelector('[data-role="art-fade"]')?.remove();
            continue;
          }
          canvas.className = 'matrix-fill';
          inner.querySelector('[data-role="art"]').appendChild(canvas);
        }
        this.canvases.push({ id: row.id, canvas });
      }
    }
  }

  // Render mode: decode frame n of each clip, then draw.
  async renderFrame(n) {
    await Promise.all(
      this.cfg.events.map(async (id) => {
        const img = new Image();
        img.src = `/.cache/${id}/src/${pad(n % SOURCE_LOOP_FRAMES)}.jpg`;
        await img.decode();
        this.media.images[id] = img;
      })
    );
    this.draw();
  }

  // Preview: keep the clips at time t of their own (real-speed) loop.
  renderAt(t, { playing = false } = {}) {
    this.media.sync(t, SOURCE_LOOP_SECONDS, playing);
    this.draw();
  }

  draw() {
    for (const { id, canvas } of this.canvases) {
      if (!this.media.ready(id)) continue;
      canvas.getContext('2d').drawImage(this.media.source(id), 0, 0, canvas.width, canvas.height);
    }
  }
}
