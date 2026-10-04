// Drives the admin view for scripts/render-admin.mjs. Every control is a pure function of the
// frame number, so the capture renders deterministically and loops seamlessly:
//  - the Timing sliders ride one travelling sine wave, each row a step behind the one above
//  - the playhead crosses the whole timeline exactly once, however long hold/morph make the loop
//  - overlays stay fixed, with the morph-target boxes on

const CYCLES = 2; // full waves per loop
const AMP = 0.3; // wave height, as a fraction of each slider's track
const OVERLAYS = { ref: false, roles: true, guides: false };

export async function installCapture({ frames: N, cfg, fields, set, stage, clock, applyConfig, draw }) {
  const style = document.createElement('style');
  style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.append(style);

  const sliders = [...document.querySelectorAll('#timing input[type="range"]')];
  const outputs = sliders.map((s) => s.parentElement.querySelector('output'));
  const decimals = fields.map(([, , , , step]) => (String(step).split('.')[1] || '').length);
  for (const s of sliders) s.step = 'any'; // glide instead of snapping to the step

  for (const b of document.querySelectorAll('[data-overlay]')) b.checked = OVERLAYS[b.dataset.overlay];
  stage.setOverlays(OVERLAYS);
  const ids = [...new Set(stage.states.map((s) => s.e.id))];
  clock.playing = true; // show the pause icon, as if the preview were running

  window.__seek = async (n) => {
    const p = n / N;
    fields.forEach(([path, , min, max], i) => {
      const v = min + (max - min) * (0.5 + AMP * Math.sin(2 * Math.PI * (CYCLES * p - i / fields.length)));
      set(cfg, path, v);
      sliders[i].value = String(v);
      outputs[i].textContent = String(Number(v.toFixed(decimals[i])));
    });
    applyConfig();

    clock.t = p * stage.loop;
    await stage.media.loadFrame(n, N, ids);
    draw();
  };

  await Promise.all([...document.querySelectorAll('#grid img')].map((img) => img.decode().catch(() => {})));
  window.__ready = true;
}
