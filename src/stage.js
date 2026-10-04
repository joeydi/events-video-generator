// The composition: blurred background video, a floating card, and the six event layouts.
// Every visual property is a pure function of time t → renderAt(t). Nothing animates on its own,
// which is what lets the renderer step frame-by-frame and get the same pixels as the preview.
import './fonts.css';
import './stage.css';
import { events } from './events.js';
import { templates } from './templates/index.js';
import { MediaBank } from './media.js';
import { clamp, lerp, lerpRect, window01, easings, anchorX, lerpColor } from './morph.js';

const ARTBOARD = { landscape: { w: 1920, h: 1080 }, portrait: { w: 1080, h: 1350 } };
const BG = { w: 480, h: 270 };
// Stagger order for the morph (back to front, top to bottom-ish).
const ROLE_ORDER = [
  'art-fade', 'corner-tl', 'corner-tr', 'eyebrow', 'badge', 'subtitle', 'title-1', 'title-2', 'cursor',
  'sparkle-1', 'sparkle-2', 'rule', 'panel-bg', 'swatches',
  'details-1', 'details-dot', 'details-2',
  'info-1-label', 'info-1-a', 'info-1-b', 'info-2-label', 'info-2-a', 'info-2-b', 'info-3-label', 'info-3-a', 'info-3-b',
  'cta', 'url', 'corner-bl', 'corner-br',
];
const STRETCH = new Set(['rule', 'panel-bg', 'art-fade']);
const FONTS = [
  '700 italic 100px gelica',
  '900 italic 100px Fraunces', '400 italic 50px Fraunces', '900 100px Fraunces',
  '600 22px Archivo', '800 24px Archivo',
  '400 72px Cartograph', 'italic 400 72px Cartograph', '600 22px Cartograph', '800 208px Cartograph',
  '900 220px Gamon', '700 220px Nippo', '600 28px Nippo', '400 36px Nippo',
  '700 28px Silkscreen', '400 20px Silkscreen',
];

const px = (v) => `${v}px`;
const fromCard = (n, card) => ({ x: card.x + n.x * card.w, y: card.y + n.y * card.h, w: n.w * card.w, h: n.h * card.h });
const setBox = (el, r) => {
  el.style.left = px(r.x);
  el.style.top = px(r.y);
  el.style.width = px(r.w);
  el.style.height = px(r.h);
};

export class Stage {
  constructor(container, { mode = 'preview', config }) {
    this.container = container;
    this.mode = mode;
    this.cfg = config;
    this.overlays = { ref: false, roles: false, guides: false };
  }

  get loop() {
    return this.cfg.sequence.length * (this.cfg.hold + this.cfg.morph);
  }
  get totalFrames() {
    return Math.round(this.loop * this.cfg.fps);
  }

  async init() {
    this.build();
    await Promise.all(FONTS.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
    this.measure();
    this.setConfig(this.cfg);
    this.media = new MediaBank([...new Set(this.states.map((s) => s.e.id))], this.mode);
    await this.media.load();
  }

  build() {
    const frame = document.createElement('div');
    frame.className = 'frame';
    frame.innerHTML = `
      <div class="bg">
        <canvas class="bg-canvas" width="${BG.w}" height="${BG.h}"></canvas>
        <canvas class="bg-canvas" width="${BG.w}" height="${BG.h}"></canvas>
        <div class="bg-tint"></div>
      </div>
      <div class="card"><div class="card-inner"><div class="art-layer"></div><div class="roots"></div></div></div>
      <div class="overlay"><img class="ref" alt=""><div class="guides"><i></i><i></i></div></div>`;
    this.container.appendChild(frame);
    this.frame = frame;
    this.bgCanvases = [...frame.querySelectorAll('.bg-canvas')];
    this.bgTint = frame.querySelector('.bg-tint');
    this.cardEl = frame.querySelector('.card');
    this.cardInner = frame.querySelector('.card-inner');
    this.refImg = frame.querySelector('.ref');

    const keys = [...new Set(this.cfg.sequence)];
    this.states = keys.map((key) => {
      const [eventId, aspect] = key.split('/');
      const e = events[eventId];
      const holder = document.createElement('div');
      holder.className = 'root';
      holder.dataset.state = key;
      holder.innerHTML = templates[e.template][aspect](e);
      frame.querySelector('.roots').appendChild(holder);
      const artCanvas = document.createElement('canvas');
      artCanvas.className = 'art';
      artCanvas.width = 1920;
      artCanvas.height = 1080;
      frame.querySelector('.art-layer').appendChild(artCanvas);
      return { key, e, aspect, ab: ARTBOARD[aspect], holder, artCanvas, roles: new Map() };
    });
    this.byKey = Object.fromEntries(this.states.map((s) => [s.key, s]));
  }

  // Lay out every state once (no transforms) and record each role's rect in artboard px.
  measure() {
    for (const s of this.states) {
      const root = s.holder.firstElementChild;
      s.holder.style.transform = 'none';
      const rr = root.getBoundingClientRect();
      const k = rr.width / s.ab.w; // normalizes away any ancestor scaling (e.g. the admin viewport)
      const rectOf = (el) => {
        const r = el.getBoundingClientRect();
        return { x: (r.left - rr.left) / k, y: (r.top - rr.top) / k, w: r.width / k, h: r.height / k };
      };
      for (const el of root.querySelectorAll('[data-role]')) {
        const name = el.dataset.role;
        if (name === 'art') {
          s.art = rectOf(el);
          continue;
        }
        let fs = 0;
        for (const n of [el, ...el.querySelectorAll('*')]) {
          if ([...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()))
            fs = Math.max(fs, parseFloat(getComputedStyle(n).fontSize));
        }
        s.roles.set(name, { name, el, r: rectOf(el), fs, mode: STRETCH.has(name) ? 'stretch' : fs ? 'type' : 'contain' });
      }
    }
  }

  // Card geometry (frame px) for each state; cheap, rerun whenever the config changes.
  setConfig(cfg) {
    this.cfg = cfg;
    const { width: W, height: H } = cfg;
    const ch = cfg.card.height;
    for (const s of this.states) {
      const cw = ch * (s.ab.w / s.ab.h);
      s.k = ch / s.ab.h;
      s.card = { x: (W - cw) / 2, y: (H - ch) / 2, w: cw, h: ch };
      const toFrame = (r) => ({ x: s.card.x + r.x * s.k, y: s.card.y + r.y * s.k, w: r.w * s.k, h: r.h * s.k });
      // Card-relative (0–1) rects: morphs interpolate these and map them through the
      // in-between card, so elements always travel with the card instead of past it.
      const toCard = (r) => ({ x: r.x / s.ab.w, y: r.y / s.ab.h, w: r.w / s.ab.w, h: r.h / s.ab.h });
      s.artF = toFrame(s.art);
      s.artN = toCard(s.art);
      for (const role of s.roles.values()) {
        role.F = toFrame(role.r);
        role.N = toCard(role.r);
        role.ax = anchorX(role.F, s.card);
      }
      s.holder.style.transform = `translate(${s.card.x}px, ${s.card.y}px) scale(${s.k})`;
    }
    this.cardEl.style.borderRadius = px(cfg.card.radius);
    this.cardEl.style.boxShadow = cfg.card.shadow;
    this.bgTint.style.background = cfg.background.tint;
    for (const c of this.bgCanvases) c.style.transform = `scale(${cfg.background.scale})`;
  }

  timeline(t) {
    const { sequence, hold, morph } = this.cfg;
    const n = sequence.length;
    const L = this.loop;
    t = ((t % L) + L) % L;
    const seg = Math.min(n - 1, Math.floor(t / (hold + morph)));
    const u = t - seg * (hold + morph);
    const p = u <= hold ? 0 : clamp((u - hold) / morph);
    return { seg, p, A: this.byKey[sequence[seg]], B: this.byKey[sequence[(seg + 1) % n]] };
  }

  setOverlays(o) {
    Object.assign(this.overlays, o);
    this.frame.classList.toggle('show-roles', !!this.overlays.roles);
    this.frame.classList.toggle('show-guides', !!this.overlays.guides);
  }

  // Render mode: decode the exact video frames needed, then draw.
  async renderFrame(n) {
    const t = n / this.cfg.fps;
    const { A, B } = this.timeline(t);
    await this.media.loadFrame(n, this.totalFrames, [...new Set([A.e.id, B.e.id])]);
    this.renderAt(t);
  }

  renderAt(t, { playing = false, speed = 1 } = {}) {
    if (this.mode === 'preview') this.media.sync(t, this.loop, playing, speed);
    const { cfg } = this;
    const { A, B, p } = this.timeline(t);
    const ease = easings[cfg.ease] || easings.inOutCubic;
    const moving = p > 0;
    const sameEvent = A.e.id === B.e.id;
    const names = this.roleNames(A, B);
    const span = Math.min(cfg.stagger * (names.length - 1), cfg.morph * 0.4);
    // The card moves on the median of the staggered element timings.
    const pe = ease(clamp((p * cfg.morph - span / 2) / (cfg.morph - span)));
    this.current = { A, B, p };

    for (const s of this.states) {
      const on = s === A || (moving && s === B);
      s.holder.style.visibility = on ? 'visible' : 'hidden';
      s.artCanvas.style.display = on ? 'block' : 'none';
      s.holder.style.zIndex = s.artCanvas.style.zIndex = s === B ? 2 : 1;
    }

    // Card frame
    const card = moving ? lerpRect(A.card, B.card, pe) : A.card;
    setBox(this.cardEl, card);
    this.cardInner.style.transform = `translate(${-card.x}px, ${-card.y}px)`;
    this.cardEl.style.background = moving ? lerpColor(A.e.background, B.e.background, pe) : A.e.background;

    // Blurred background: crossfade between events, blur swells mid-transition
    const bgc = cfg.background;
    const pulse = moving ? Math.sin(Math.PI * p) * (sameEvent ? 0.35 : 1) : 0;
    const filter = `blur(${bgc.blur + bgc.blurBoost * pulse}px) brightness(${bgc.brightness}) saturate(${bgc.saturate})`;
    const layers = [
      { id: A.e.id, opacity: 1 },
      { id: B.e.id, opacity: moving && !sameEvent ? window01(p, 0.15, 0.85) : 0 },
    ];
    layers.forEach((l, i) => {
      const c = this.bgCanvases[i];
      c.style.opacity = l.opacity;
      c.style.filter = filter;
      if (l.opacity > 0) this.draw(c, l.id, BG.w, BG.h);
    });

    // Card artwork (sharp video): both states share one lerped rect; B dissolves in on top
    const artR = moving ? fromCard(lerpRect(A.artN, B.artN, pe), card) : A.artF;
    setBox(A.artCanvas, artR);
    A.artCanvas.style.opacity = 1;
    this.draw(A.artCanvas, A.e.id, 1920, 1080);
    if (moving && B !== A) {
      setBox(B.artCanvas, artR);
      B.artCanvas.style.opacity = sameEvent ? window01(p, 0.3, 0.7) : window01(p, 0.2, 0.8);
      this.draw(B.artCanvas, B.e.id, 1920, 1080);
    }

    // Layout elements
    if (!moving) {
      for (const r of A.roles.values()) {
        r.el.style.transform = 'translate(0px, 0px)';
        r.el.style.opacity = 1;
      }
    } else {
      this.morphRoles(A, B, p, ease, sameEvent, card, names, span);
    }

    this.updateRef(A, moving);
  }

  roleNames(A, B) {
    const rank = (n) => (ROLE_ORDER.includes(n) ? ROLE_ORDER.indexOf(n) : ROLE_ORDER.length);
    return [...new Set([...A.roles.keys(), ...B.roles.keys()])].sort((a, b) => rank(a) - rank(b));
  }

  morphRoles(A, B, p, ease, sameEvent, card, names, span) {
    const { morph } = this.cfg;

    names.forEach((name, i) => {
      const d = names.length > 1 ? (span * i) / (names.length - 1) : 0;
      const pr = clamp((p * morph - d) / (morph - span));
      const t = ease(pr);
      const a = A.roles.get(name);
      const b = B.roles.get(name);

      if (a) {
        const s1 = b ? this.scaleBetween(a, A.k, b, B.k) : B.k / A.k;
        const fade = b ? (sameEvent ? window01(pr, 0.3, 0.7) : window01(pr, 0.05, 0.5)) : window01(pr, 0, 0.5);
        this.place(a, A.k, card, a.N, b ? b.N : a.N, 1, s1, a.ax, b ? b.ax : a.ax, t, b ? 1 : lerp(1, 0.94, fade));
        a.el.style.opacity = 1 - fade;
      }
      if (b) {
        const s0 = a ? this.scaleBetween(b, B.k, a, A.k) : A.k / B.k;
        const fade = a ? (sameEvent ? window01(pr, 0.3, 0.7) : window01(pr, 0.4, 0.95)) : window01(pr, 0.5, 1);
        this.place(b, B.k, card, a ? a.N : b.N, b.N, s0, 1, a ? a.ax : b.ax, b.ax, t, a ? 1 : lerp(0.94, 1, fade));
        b.el.style.opacity = fade;
      }
    });
  }

  // How much `x` must scale (in frame px) to read at the size of its partner `y`:
  // type → match the dominant font size; otherwise fit the box.
  scaleBetween(x, kx, y, ky) {
    if (x.mode === 'type' && y.fs) return (y.fs * ky) / (x.fs * kx);
    return Math.min(y.F.w / x.F.w, y.F.h / x.F.h);
  }

  // Move a role element from its laid-out frame rect F to a box inside R — the
  // card-relative rect lerped between its two layouts, mapped through the current card.
  place(role, k, card, N0, N1, s0, s1, ax0, ax1, t, extra) {
    const F = role.F;
    const R = fromCard(lerpRect(N0, N1, t), card);
    let D;
    let sx;
    let sy;
    if (role.mode === 'stretch') {
      D = R;
      sx = R.w / F.w;
      sy = R.h / F.h;
    } else {
      const s = s0 * Math.pow(s1 / s0, t);
      const w = F.w * s;
      const h = F.h * s;
      D = { x: R.x + (R.w - w) * lerp(ax0, ax1, t), y: R.y + (R.h - h) / 2, w, h };
      sx = sy = s;
    }
    if (extra !== 1) {
      D = { x: D.x + (D.w * (1 - extra)) / 2, y: D.y + (D.h * (1 - extra)) / 2, w: D.w * extra, h: D.h * extra };
      sx *= extra;
      sy *= extra;
    }
    role.el.style.transform = `translate(${(D.x - F.x) / k}px, ${(D.y - F.y) / k}px) scale(${sx}, ${sy})`;
  }

  draw(canvas, id, w, h) {
    if (!this.media?.ready(id)) return;
    canvas.getContext('2d').drawImage(this.media.source(id), 0, 0, w, h);
  }

  updateRef(A, moving) {
    const show = this.overlays.ref && !moving;
    this.refImg.style.display = show ? 'block' : 'none';
    if (!show) return;
    const src = `/.cache/ref/${A.key.replace('/', '-')}.jpg`;
    if (!this.refImg.src.endsWith(src)) this.refImg.src = src;
    setBox(this.refImg, A.card);
    this.refImg.style.borderRadius = px(this.cfg.card.radius);
  }
}
