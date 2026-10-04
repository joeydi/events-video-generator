// Ported from design/DataMain.dc.html (landscape) and design/DataSocial.dc.html (portrait).
import { esc, arrow } from './util.js';

function vals(e, portrait = false) {
  const accent = e.accent;
  const o = portrait ? 5 : 6;
  let shadow = '0 4px 24px rgba(20,18,50,0.7)';
  if (e.headlineStyle === 'glitch') shadow = `-${o}px 0 0 ${accent}, ${o}px 0 0 #6ad8ff, 0 6px 30px rgba(20,18,50,0.8)`;
  if (e.headlineStyle === 'glow')
    shadow = `0 3px 0 rgba(20,18,50,0.4), 0 0 ${portrait ? 32 : 36}px ${accent}99, 0 0 ${portrait ? 110 : 120}px ${accent}66`;
  return { accent, shadow };
}

const corners = (inset, size) =>
  ['tl', 'tr', 'bl', 'br']
    .map((c) => {
      const v = c[0] === 't' ? 'top' : 'bottom';
      const h = c[1] === 'l' ? 'left' : 'right';
      return `<div data-role="corner-${c}" style="position: absolute; ${v}: ${inset}px; ${h}: ${inset}px; width: ${size}px; height: ${size}px; border-${v}: 3px solid #f4f1ff; border-${h}: 3px solid #f4f1ff"></div>`;
    })
    .join('\n  ');

const chip = (font, pad) =>
  `padding: ${pad}; background: rgba(20, 18, 50, 0.78); border: 1px solid rgba(244, 241, 255, 0.35); font-size: ${font}px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase`;

const cursor = (accent, ml, glow) =>
  `<span data-role="cursor" style="display: inline-block; width: 0.48em; height: 0.74em; margin-left: ${ml}em; background: ${accent}; vertical-align: -0.02em; box-shadow: 0 0 ${glow}px ${accent}"></span>`;

const meta = (role, label, value, sizes) =>
  `<div data-role="${role}" style="border-top: 2px solid rgba(244, 241, 255, 0.35); padding-top: ${sizes.pt}px; display: flex; flex-direction: column; gap: ${sizes.gap}px">
        <span style="font-size: ${sizes.label}px; font-weight: 600; letter-spacing: 0.2em; color: ${sizes.accent}">${label}</span>
        <span style="font-size: ${sizes.value}px; font-weight: 600">${esc(value)}</span>
      </div>`;

export function landscape(e) {
  const { accent, shadow } = vals(e);
  const s = { pt: 18, gap: 10, label: 18, value: 30, accent };
  return `
<div class="artboard" style="width: 1920px; height: 1080px; position: relative; color: #f4f1ff; font-family: 'JetBrains Mono', monospace">
  <div data-role="art" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px"></div>

  ${corners(48, 56)}

  <div style="position: absolute; top: 80px; left: 120px; right: 120px; display: flex; justify-content: space-between; align-items: center">
    <div data-role="eyebrow" style="${chip(22, '12px 20px')}">${esc(e.series)}</div>
    <div data-role="badge" style="${chip(22, '12px 20px')}"><span style="color: ${accent}">●</span> ${esc(e.badge)}</div>
  </div>

  <div style="position: absolute; left: 120px; right: 120px; bottom: 112px; display: flex; flex-direction: column">
    <div data-role="subtitle" style="align-self: flex-start; font-size: 72px; font-weight: 500; letter-spacing: -0.02em; color: #f4f1ff; text-shadow: 0 2px 18px rgba(20,18,50,0.95)"><span style="color: ${accent}">&gt;</span> ${esc(e.kicker)}</div>
    <h1 style="align-self: flex-start; margin: 18px 0 0 -6px; font-size: 208px; line-height: 0.95; font-weight: 800; letter-spacing: -0.045em; color: #f4f1ff; text-shadow: ${shadow}; white-space: nowrap"><span data-role="title-1" style="display: inline-block">${esc(e.title[0])}</span> <span data-role="title-2" style="display: inline-block">${esc(e.title[1])}</span>${cursor(accent, 0.12, 40)}</h1>
    <div style="margin-top: 56px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) auto; gap: 40px; align-items: end">
      ${meta('details-1', '01 / SPEAKER', e.speaker, s)}
      ${meta('details-2', '02 / DATE', e.date, s)}
      <div data-role="cta" style="display: flex; align-items: center; gap: 18px; padding: 24px 40px; background: ${accent}; color: #1a1b3e; clip-path: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px); font-size: 26px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap">
        <span>${esc(e.cta)}</span>
        ${arrow(28, 2.5)}
      </div>
    </div>
  </div>
</div>`;
}

export function portrait(e) {
  const { accent, shadow } = vals(e, true);
  const bg = e.background;
  const s = { pt: 16, gap: 8, label: 16, value: 26, accent };
  return `
<div class="artboard" style="width: 1080px; height: 1350px; position: relative; color: #f4f1ff; font-family: 'JetBrains Mono', monospace">
  <div data-role="art" style="position: absolute; top: -130px; left: -571.11px; width: 2222.22px; height: 1250px"></div>
  <div data-role="art-fade" style="position: absolute; left: 0; width: 1080px; top: 1000px; height: 130px; background: linear-gradient(180deg, ${bg}00 0%, ${bg} 100%)"></div>

  ${corners(40, 48)}

  <div style="position: absolute; top: 72px; left: 80px; right: 80px; display: flex; justify-content: space-between; align-items: center; gap: 16px">
    <div data-role="eyebrow" style="${chip(18, '10px 16px')}">${esc(e.series)}</div>
    <div data-role="badge" style="${chip(18, '10px 16px')}"><span style="color: ${accent}">●</span> ${esc(e.badge)}</div>
  </div>

  <div style="position: absolute; left: 80px; right: 80px; bottom: 104px; display: flex; flex-direction: column">
    <div data-role="subtitle" style="align-self: flex-start; font-size: 62px; font-weight: 500; letter-spacing: -0.02em; color: #f4f1ff; text-shadow: 0 2px 18px rgba(20,18,50,0.95)"><span style="color: ${accent}">&gt;</span> ${esc(e.kicker)}</div>
    <h1 style="align-self: flex-start; margin: 16px 0 0 -5px; font-size: 184px; line-height: 0.92; font-weight: 800; letter-spacing: -0.045em; color: #f4f1ff; text-shadow: ${shadow}"><span style="display: block"><span data-role="title-1" style="display: inline-block">${esc(e.title[0])}</span></span><span style="display: block; white-space: nowrap"><span data-role="title-2" style="display: inline-block">${esc(e.title[1])}</span>${cursor(accent, 0.1, 36)}</span></h1>
    <div style="margin-top: 48px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px">
      ${meta('details-1', '01 / SPEAKER', e.speaker, s)}
      ${meta('details-2', '02 / DATE', e.date, s)}
    </div>
    <div data-role="cta" style="margin-top: 40px; align-self: flex-start; display: flex; align-items: center; gap: 16px; padding: 22px 36px; background: ${accent}; color: #1a1b3e; clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px); font-size: 24px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap">
      <span>${esc(e.cta)}</span>
      ${arrow(26, 2.5)}
    </div>
  </div>
</div>`;
}
