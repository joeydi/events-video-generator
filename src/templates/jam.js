// Ported from design/JamMain.dc.html (landscape) and design/JamSocial.dc.html (portrait).
// The info panel's background/border moved onto its own [data-role=panel-bg] layer
// (padding +2px to compensate for the border) so the panel can stretch independently
// of the items flying around inside it.
import { esc, arrow } from './util.js';

const SWATCHES = ['#ff4fa3', '#ff8a3d', '#ffd23f', '#2fe0c0', '#3aa8ff', '#a77bff'];

function vals(e, portrait = false) {
  const accent = e.accent;
  let shadow = '0 6px 30px rgba(14,16,44,0.8)';
  if (e.headlineStyle === 'extrude') {
    const n = portrait ? 10 : 12;
    const steps = [];
    for (let i = 1; i <= n; i++) steps.push(`${i}px ${i}px 0 ${accent}`);
    steps.push(portrait ? '16px 20px 32px rgba(10,10,40,0.7)' : '18px 22px 36px rgba(10,10,40,0.7)');
    shadow = steps.join(', ');
  }
  if (e.headlineStyle === 'glow')
    shadow = `0 4px 0 rgba(14,16,44,0.5), 0 0 ${portrait ? 36 : 40}px ${accent}99, 0 0 ${portrait ? 110 : 120}px ${accent}66`;
  return { accent, shadow };
}

const pixels = (size, colors, gap) =>
  `<span style="display: flex; gap: ${gap}px">${colors
    .map((c) => `<span style="width: ${size}px; height: ${size}px; background: ${c}"></span>`)
    .join('')}</span>`;

const eyebrow = (e, accent, size, px) =>
  `<div data-role="eyebrow" style="align-self: flex-start; display: flex; align-items: center; gap: ${size === 28 ? 16 : 14}px; font-family: 'Silkscreen', monospace; font-size: ${size}px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${accent}; text-shadow: 0 2px 12px rgba(14,16,44,0.9)">
      ${pixels(px, ['#ff4fa3', '#ffb340', '#2fe0c0'], 4)}
      <span>${esc(e.eyebrow)}</span>
    </div>`;

const button = (e, accent, p) =>
  `<div data-role="cta" style="display: flex; align-items: center; gap: ${p.gap}px; padding: ${p.pad}; background: ${accent}; color: #12143a; box-shadow: inset 0 -6px 0 rgba(0,0,0,0.22), ${p.drop}px ${p.drop}px 0 #fff6ec; font-size: ${p.font}px; font-weight: 800; text-transform: uppercase; white-space: nowrap">
        <span>${esc(e.cta)}</span>
        ${arrow(p.icon, 3)}
      </div>`;

export function landscape(e) {
  const { accent, shadow } = vals(e);
  const info = [...e.days.map((d) => [d.label, `${d.day},`, d.date]), [e.where.label, `${e.where.place} ·`, e.where.town]];
  return `
<div class="artboard" style="width: 1920px; height: 1080px; position: relative; color: #fff6ec; font-family: 'Nippo', sans-serif">
  <div data-role="art" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px"></div>

  <div style="position: absolute; left: 120px; bottom: 96px; width: 1000px; display: flex; flex-direction: column">
    ${eyebrow(e, accent, 28, 14)}
    <h1 style="font-family: 'Gamon', sans-serif; align-self: flex-start; margin: 22px 0 0 -6px; font-size: 220px; line-height: 0.9; font-weight: 900; letter-spacing: 0; text-transform: uppercase; color: #fff6ec; text-shadow: ${shadow}"><span style="display: block"><span data-role="title-1" style="display: inline-block">${esc(e.title[0])}</span></span><span style="display: block"><span data-role="title-2" style="display: inline-block">${esc(e.title[1])}</span></span></h1>
    <p data-role="subtitle" style="align-self: flex-start; margin: 34px 0 0 0; font-size: 36px; font-weight: 400; color: #fff6ec; text-shadow: 0 2px 14px rgba(14,16,44,0.9)">${esc(e.subtitle)}</p>
  </div>

  <div style="position: absolute; right: 120px; bottom: 96px; width: 620px; box-sizing: border-box; padding: 38px; display: flex; flex-direction: column; gap: 28px">
    <div data-role="panel-bg" style="position: absolute; inset: 0; box-sizing: border-box; background: rgba(14, 16, 44, 0.86); border: 2px solid rgba(255, 246, 236, 0.18)"></div>
    <div data-role="swatches" style="align-self: flex-start; display: flex; gap: 6px">
      ${SWATCHES.map((c) => `<span style="width: 22px; height: 22px; background: ${c}"></span>`).join('')}
    </div>
    <div style="display: flex; flex-direction: column; gap: 20px">
      ${info
        .map(
          ([label, a, b], i) => `<div style="align-self: flex-start; display: flex; flex-direction: column; gap: 6px">
        <span data-role="info-${i + 1}-label" style="align-self: flex-start; font-family: 'Silkscreen', monospace; font-size: 20px; color: ${accent}">${esc(label)}</span>
        <span style="font-size: 28px; font-weight: 600"><span data-role="info-${i + 1}-a" style="display: inline-block">${esc(a)}</span> <span data-role="info-${i + 1}-b" style="display: inline-block">${esc(b)}</span></span>
      </div>`
        )
        .join('\n      ')}
    </div>
    <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-start; column-gap: 32px; row-gap: 28px; margin-top: 8px">
      ${button(e, accent, { gap: 16, pad: '22px 32px 26px', drop: 8, font: 24, icon: 26 })}
      <span data-role="url" style="font-family: 'Silkscreen', monospace; font-size: 20px; color: #fff6ec">${esc(e.url)}</span>
    </div>
  </div>
</div>`;
}

export function portrait(e) {
  const { accent, shadow } = vals(e, true);
  const bg = e.background;
  const info = [...e.days.map((d) => [d.label, d.day, d.date]), [e.where.label, e.where.place, e.where.town]];
  return `
<div class="artboard" style="width: 1080px; height: 1350px; position: relative; color: #fff6ec; font-family: 'Nippo', sans-serif">
  <div data-role="art" style="position: absolute; top: -250px; left: -571.11px; width: 2222.22px; height: 1250px"></div>
  <div data-role="art-fade" style="position: absolute; left: 0; width: 1080px; top: 870px; height: 130px; background: linear-gradient(180deg, ${bg}00 0%, ${bg} 100%)"></div>

  <div style="position: absolute; left: 80px; right: 80px; bottom: 72px; display: flex; flex-direction: column">
    ${eyebrow(e, accent, 24, 12)}
    <h1 style="font-family: 'Gamon', sans-serif; align-self: flex-start; margin: 18px 0 0 -5px; font-size: 196px; line-height: 0.9; font-weight: 900; letter-spacing: 0; text-transform: uppercase; color: #fff6ec; text-shadow: ${shadow}"><span style="display: block"><span data-role="title-1" style="display: inline-block">${esc(e.title[0])}</span></span><span style="display: block"><span data-role="title-2" style="display: inline-block">${esc(e.title[1])}</span></span></h1>
    <p data-role="subtitle" style="align-self: flex-start; margin: 30px 0 0 0; font-size: 30px; font-weight: 400; color: #fff6ec">${esc(e.subtitle)}</p>

    <div style="position: relative; margin-top: 40px; box-sizing: border-box; padding: 30px; display: flex; flex-direction: column; gap: 24px">
      <div data-role="panel-bg" style="position: absolute; inset: 0; box-sizing: border-box; background: rgba(14, 16, 44, 0.86); border: 2px solid rgba(255, 246, 236, 0.18)"></div>
      <div data-role="swatches" style="align-self: flex-start; display: flex; gap: 5px">
        ${SWATCHES.map((c) => `<span style="width: 18px; height: 18px; background: ${c}"></span>`).join('')}
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px">
        ${info
          .map(
            ([label, a, b], i) => `<div style="justify-self: start; display: flex; flex-direction: column; gap: 6px">
          <span data-role="info-${i + 1}-label" style="align-self: flex-start; font-family: 'Silkscreen', monospace; font-size: 18px; color: ${accent}">${esc(label)}</span>
          <span data-role="info-${i + 1}-a" style="align-self: flex-start; font-size: 22px; font-weight: 600">${esc(a)}</span>
          <span data-role="info-${i + 1}-b" style="align-self: flex-start; font-size: 20px; font-weight: 400; color: rgba(255, 246, 236, 0.75)">${esc(b)}</span>
        </div>`
          )
          .join('\n        ')}
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 4px">
        ${button(e, accent, { gap: 14, pad: '20px 28px 24px', drop: 7, font: 22, icon: 24 })}
        <span data-role="url" style="font-family: 'Silkscreen', monospace; font-size: 18px; color: #fff6ec">${esc(e.url)}</span>
      </div>
    </div>
  </div>
</div>`;
}
