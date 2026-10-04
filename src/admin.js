import { Stage } from './stage.js';
import { easings } from './morph.js';
import { events } from './events.js';

const $ = (id) => document.getElementById(id);
const ASPECT_LABEL = { landscape: '16:9', portrait: '4:5' };
const label = (key, short = false) => {
  const [id, aspect] = key.split('/');
  return `${short ? events[id].short : events[id].label} ${ASPECT_LABEL[aspect]}`;
};

// Tunable fields in the Timing panel: [path, label, min, max, step]
const FIELDS = [
  ['hold', 'Hold', 0, 2, 0.05],
  ['morph', 'Morph', 0.2, 2, 0.05],
  ['stagger', 'Stagger', 0, 0.08, 0.005],
  ['card.height', 'Card', 760, 1040, 2],
  ['card.radius', 'Radius', 0, 40, 1],
  ['background.blur', 'Blur', 0, 120, 1],
  ['background.blurBoost', 'Blur swell', 0, 120, 1],
  ['background.brightness', 'Brightness', 0.4, 1.6, 0.01],
];
const get = (o, path) => path.split('.').reduce((v, k) => v[k], o);
const set = (o, path, val) => {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((v, k) => v[k], o)[last] = val;
};

let saved = await (await fetch('/api/config')).json();
let cfg = structuredClone(saved);
const stage = new Stage($('stage'), { mode: 'preview', config: cfg });
await stage.init();
window.__stage = stage;

const clock = { t: 0, playing: true, speed: 1, loop: true, last: performance.now() };
const frames = () => stage.totalFrames;

// ---------- layout ----------
function fit() {
  const w = $('viewport').clientWidth;
  stage.frame.style.transform = `scale(${w / cfg.width})`;
}
new ResizeObserver(fit).observe($('viewport'));

function buildTimeline() {
  const seg = $('segments');
  seg.innerHTML = '';
  cfg.sequence.forEach((key, i) => {
    const hold = document.createElement('div');
    hold.className = 'hold';
    hold.style.flex = String(cfg.hold);
    hold.textContent = label(key, true);
    hold.title = `Jump to ${label(key)} (${i + 1})`;
    hold.onclick = () => jumpTo(i);
    const morph = document.createElement('div');
    morph.className = 'morph';
    morph.style.flex = String(cfg.morph);
    morph.title = `${label(key)} → ${label(cfg.sequence[(i + 1) % cfg.sequence.length])}`;
    seg.append(hold, morph);
  });
  $('scrub').max = String(frames() - 1);
  $('summary').textContent = `${cfg.sequence.length} variations · ${stage.loop.toFixed(2)}s loop · ${frames()} frames @ ${cfg.fps}fps · ${cfg.width}×${cfg.height}`;
}

function buildGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  cfg.sequence.forEach((key, i) => {
    const b = document.createElement('button');
    b.dataset.index = i;
    b.innerHTML = `<span class="thumb"><img src="/.cache/ref/${key.replace('/', '-')}.jpg" alt=""></span><span>${i + 1}. ${label(key)}</span>`;
    b.onclick = () => jumpTo(i);
    grid.appendChild(b);
  });
}

function buildTiming() {
  const box = $('timing');
  box.innerHTML = '';
  for (const [path, name, min, max, step] of FIELDS) {
    const row = document.createElement('label');
    row.className = 'field';
    row.innerHTML = `<span>${name}</span><input type="range" min="${min}" max="${max}" step="${step}"><output></output>`;
    const input = row.querySelector('input');
    const out = row.querySelector('output');
    input.value = get(cfg, path);
    out.textContent = get(cfg, path);
    input.oninput = () => {
      set(cfg, path, Number(input.value));
      out.textContent = input.value;
      applyConfig();
    };
    box.appendChild(row);
  }
  const ease = document.createElement('label');
  ease.className = 'field';
  ease.innerHTML = `<span>Ease</span><select>${Object.keys(easings)
    .map((k) => `<option ${k === cfg.ease ? 'selected' : ''}>${k}</option>`)
    .join('')}</select><span></span>`;
  ease.querySelector('select').onchange = (e) => {
    cfg.ease = e.target.value;
    applyConfig();
  };
  const fps = document.createElement('label');
  fps.className = 'field';
  fps.innerHTML = `<span>FPS</span><select>${[24, 25, 30, 50, 60]
    .map((f) => `<option ${f === cfg.fps ? 'selected' : ''}>${f}</option>`)
    .join('')}</select><span></span>`;
  fps.querySelector('select').onchange = (e) => {
    cfg.fps = Number(e.target.value);
    applyConfig();
  };
  box.append(ease, fps);
}

function applyConfig() {
  stage.setConfig(cfg);
  buildTimeline();
  $('dirty').textContent = JSON.stringify(cfg) === JSON.stringify(saved) ? '' : 'unsaved changes';
}

// ---------- transport ----------
function jumpTo(i) {
  clock.playing = false;
  clock.t = i * (cfg.hold + cfg.morph) + cfg.hold / 2;
}
function step(n) {
  clock.playing = false;
  const f = Math.round(clock.t * cfg.fps) + n;
  clock.t = (((f % frames()) + frames()) % frames()) / cfg.fps;
}

$('play').onclick = () => (clock.playing = !clock.playing);
$('prev').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('speed').onchange = (e) => (clock.speed = Number(e.target.value));
$('loop').onchange = (e) => (clock.loop = e.target.checked);
$('scrub').oninput = (e) => {
  clock.playing = false;
  clock.t = Number(e.target.value) / cfg.fps;
};

for (const box of document.querySelectorAll('[data-overlay]')) {
  box.onchange = () => stage.setOverlays({ [box.dataset.overlay]: box.checked });
}
const toggleOverlay = (name) => {
  const box = document.querySelector(`[data-overlay="${name}"]`);
  box.checked = !box.checked;
  box.onchange();
};

addEventListener('keydown', (e) => {
  if (e.target.matches('input[type="text"], select, textarea')) return;
  if (e.key === ' ') {
    e.preventDefault();
    clock.playing = !clock.playing;
  } else if (e.key === 'ArrowLeft') step(e.shiftKey ? -10 : -1);
  else if (e.key === 'ArrowRight') step(e.shiftKey ? 10 : 1);
  else if (e.key === 'Home') clock.t = 0;
  else if (/^[1-9]$/.test(e.key) && Number(e.key) <= cfg.sequence.length) jumpTo(Number(e.key) - 1);
  else if (e.key === 'r') toggleOverlay('ref');
  else if (e.key === 'b') toggleOverlay('roles');
  else if (e.key === 'g') toggleOverlay('guides');
  else if (e.key === 'l') $('loop').click();
});

function tick(now) {
  const dt = Math.min(0.1, (now - clock.last) / 1000);
  clock.last = now;
  const L = stage.loop;
  if (clock.playing) {
    clock.t += dt * clock.speed;
    if (clock.t >= L) {
      if (clock.loop) clock.t %= L;
      else {
        clock.t = L - 1 / cfg.fps;
        clock.playing = false;
      }
    }
  }
  stage.renderAt(clock.t, { playing: clock.playing, speed: clock.speed });

  const f = Math.floor(clock.t * cfg.fps + 1e-6) % frames();
  $('scrub').value = String(f);
  $('time').textContent = `${clock.t.toFixed(2)}s`;
  $('frame').textContent = `f ${f} / ${frames()}`;
  document.querySelector('.transport').classList.toggle('playing', clock.playing);
  const { A, B, p } = stage.current;
  const idx = cfg.sequence.indexOf(A.key);
  $('stateName').textContent = p > 0 ? `${label(A.key)} → ${label(B.key)}  ${Math.round(p * 100)}%` : label(A.key);
  document.querySelectorAll('#grid button').forEach((b) => b.classList.toggle('current', Number(b.dataset.index) === idx && p === 0));
  document.querySelectorAll('#segments .hold').forEach((h, i) => h.classList.toggle('current', i === idx));
  requestAnimationFrame(tick);
}

// ---------- save / render ----------
async function save() {
  await fetch('/api/config', { method: 'POST', body: JSON.stringify(cfg) });
  saved = structuredClone(cfg);
  applyConfig();
}
$('save').onclick = save;
$('revert').onclick = () => {
  cfg = structuredClone(saved);
  buildTiming();
  applyConfig();
};

function showReview(file) {
  const v = $('reviewVideo');
  v.src = `/out/${file}?v=${Date.now()}`;
  $('download').href = `/out/${file}`;
  $('reviewMeta').textContent = file;
  $('review').hidden = false;
  v.play().catch(() => {});
}

async function render(scale) {
  const buttons = [$('render1'), $('render2')];
  buttons.forEach((b) => (b.disabled = true));
  const log = $('log');
  log.textContent = '';
  $('progress').style.width = '0';
  try {
    if (JSON.stringify(cfg) !== JSON.stringify(saved)) {
      log.textContent += 'saving timing changes first…\n';
      await save();
    }
    const res = await fetch(`/api/render?scale=${scale}`, { method: 'POST' });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let text = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value, { stream: true });
      text += chunk;
      log.textContent += chunk;
      log.scrollTop = log.scrollHeight;
      const m = [...text.matchAll(/frame (\d+)\/(\d+)/g)].pop();
      if (m) $('progress').style.width = `${(100 * Number(m[1])) / Number(m[2])}%`;
    }
    if (text.includes('__DONE__')) showReview(scale === 1 ? 'loop.mp4' : `loop@${scale}x.mp4`);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}
$('render1').onclick = () => render(1);
$('render2').onclick = () => render(2);

// ---------- boot ----------
buildTiming();
buildGrid();
applyConfig();
fit();
requestAnimationFrame(tick);
fetch('/out/loop.mp4', { method: 'HEAD' }).then((r) => {
  if (r.ok && (r.headers.get('content-type') || '').includes('video')) showReview('loop.mp4');
});
