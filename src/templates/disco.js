// Ported from design/Main.dc.html (landscape) and design/Social.dc.html (portrait).
// Styles are kept verbatim; changes for the morph engine:
//  - artwork <img> → [data-role=art] placeholder (the stage draws video into it)
//  - border-top rule split into its own [data-role=rule] element
//  - morphable groups tagged data-role and shrink-wrapped (align-self: flex-start)
import { star, esc } from './util.js';

// Same logic as the artboards' renderVals(); portrait uses its slightly smaller numbers.
function vals(e, portrait = false) {
  const accent = e.accent;
  const shadow =
    e.headlineStyle === 'stacked'
      ? portrait
        ? '5px 5px 0 #ff4d6a, 10px 10px 0 #ffb43a, 15px 15px 0 #3ef0e0, 20px 20px 36px rgba(10,10,40,0.5)'
        : '6px 6px 0 #ff4d6a, 12px 12px 0 #ffb43a, 18px 18px 0 #3ef0e0, 24px 24px 40px rgba(10,10,40,0.5)'
      : portrait
        ? `0 3px 0 rgba(20,18,50,0.35), 0 0 32px ${accent}99, 0 0 110px ${accent}66`
        : `0 3px 0 rgba(20,18,50,0.35), 0 0 36px ${accent}99, 0 0 120px ${accent}66`;
  return { accent, shadow, fontStyle: e.italic === false ? 'normal' : 'italic' };
}

export function landscape(e) {
  const { accent, shadow, fontStyle } = vals(e);
  return `
<div class="artboard" style="width: 1920px; height: 1080px; position: relative; color: #f1e8e4; font-family: 'Archivo', sans-serif">
  <div data-role="art" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px"></div>

  <div data-role="eyebrow" style="position: absolute; top: 72px; right: 120px; display: flex; align-items: center; gap: 18px; font-size: 22px; font-weight: 600; font-stretch: 125%; letter-spacing: 0.32em; text-transform: uppercase">
    ${star(22, accent)}
    <span>${esc(e.presenter)}</span>
  </div>

  <div style="position: absolute; left: 120px; right: 120px; bottom: 96px; display: flex; flex-direction: column; gap: 0px">
    <div style="position: relative; align-self: flex-start">
      <h1 style="margin: 0; font-family: 'gelica', serif; font-size: 268px; line-height: 0.9; font-weight: 700; font-style: ${fontStyle}; letter-spacing: -0.025em; color: #f1e8e4; text-shadow: ${shadow}; padding-right: 40px; white-space: nowrap"><span data-role="title-1" style="display: inline-block">${esc(e.title[0])}</span> <span data-role="title-2" style="display: inline-block">${esc(e.title[1])}</span></h1>
      ${star(64, '#f1e8e4', 'position: absolute; top: -28px; right: -24px', 'sparkle-1')}
      ${star(30, accent, 'position: absolute; top: 40px; right: -64px', 'sparkle-2')}
    </div>
    <p data-role="subtitle" style="align-self: flex-start; margin: 22px 0 0 8px; font-family: 'Fraunces', serif; font-size: 50px; font-style: italic; font-weight: 400; font-variation-settings: 'SOFT' 100, 'WONK' 1, 'opsz' 72; color: #f1e8e4">${esc(e.subtitle)}</p>
    <div data-role="rule" style="margin-top: 52px; height: 2px; background: rgba(241, 232, 228, 0.28)"></div>
    <div style="margin-top: 36px; display: flex; align-items: center; justify-content: space-between; gap: 40px">
      <div style="display: flex; align-items: center; gap: 28px; font-size: 28px; font-weight: 600; font-stretch: 125%; letter-spacing: 0.14em; text-transform: uppercase">
        <span data-role="details-1">${esc(e.dates)}</span>
        <span data-role="details-dot" style="flex: none; width: 10px; height: 10px; border-radius: 50%; background: ${accent}"></span>
        <span data-role="details-2">${esc(e.location)}</span>
      </div>
      <div data-role="cta" style="padding: 20px 40px; border-radius: 999px; background: ${accent}; color: #1d1e40; font-size: 24px; font-weight: 800; font-stretch: 125%; letter-spacing: 0.16em; text-transform: uppercase; white-space: nowrap">${esc(e.cta)}</div>
    </div>
  </div>
</div>`;
}

export function portrait(e) {
  const { accent, shadow, fontStyle } = vals(e, true);
  const bg = e.background;
  return `
<div class="artboard" style="width: 1080px; height: 1350px; position: relative; color: #f1e8e4; font-family: 'Archivo', sans-serif">
  <div data-role="art" style="position: absolute; top: -130px; left: -571.11px; width: 2222.22px; height: 1250px"></div>
  <div data-role="art-fade" style="position: absolute; left: 0; width: 1080px; top: 1000px; height: 130px; background: linear-gradient(180deg, ${bg}00 0%, ${bg} 100%)"></div>

  <div style="position: absolute; top: 64px; left: 0; right: 0; display: flex; justify-content: center">
    <div data-role="eyebrow" style="display: flex; align-items: center; gap: 16px; font-size: 20px; font-weight: 600; font-stretch: 125%; letter-spacing: 0.32em; text-transform: uppercase">
      ${star(20, accent)}
      <span>${esc(e.presenter)}</span>
      ${star(20, accent)}
    </div>
  </div>

  <div style="position: absolute; left: 80px; right: 80px; bottom: 80px; display: flex; flex-direction: column">
    <div style="position: relative; align-self: flex-start">
      <h1 style="margin: 0; font-family: 'gelica', serif; font-size: 236px; line-height: 0.86; font-weight: 700; font-style: ${fontStyle}; letter-spacing: -0.025em; color: #f1e8e4; text-shadow: ${shadow}; padding-right: 30px"><span style="display: block"><span data-role="title-1" style="display: inline-block">${esc(e.title[0])}</span></span><span style="display: block; padding-left: 120px"><span data-role="title-2" style="display: inline-block">${esc(e.title[1])}</span></span></h1>
      ${star(58, '#f1e8e4', 'position: absolute; top: -18px; right: 120px', 'sparkle-1')}
      ${star(28, accent, 'position: absolute; top: 46px; right: 82px', 'sparkle-2')}
    </div>
    <p data-role="subtitle" style="align-self: flex-start; margin: 24px 0 0 6px; font-family: 'Fraunces', serif; font-size: 44px; font-style: italic; font-weight: 400; font-variation-settings: 'SOFT' 100, 'WONK' 1, 'opsz' 72; color: #f1e8e4">${esc(e.subtitle)}</p>
    <div data-role="rule" style="margin-top: 40px; height: 2px; background: rgba(241, 232, 228, 0.28)"></div>
    <div style="margin-top: 32px; display: flex; flex-direction: column; gap: 28px">
      <div style="align-self: flex-start; display: flex; align-items: center; flex-wrap: wrap; gap: 22px; font-size: 26px; font-weight: 600; font-stretch: 125%; letter-spacing: 0.12em; text-transform: uppercase">
        <span data-role="details-1">${esc(e.dates)}</span>
        <span data-role="details-dot" style="flex: none; width: 9px; height: 9px; border-radius: 50%; background: ${accent}"></span>
        <span data-role="details-2">${esc(e.location)}</span>
      </div>
      <div data-role="cta" style="align-self: flex-start; padding: 18px 36px; border-radius: 999px; background: ${accent}; color: #1d1e40; font-size: 22px; font-weight: 800; font-stretch: 125%; letter-spacing: 0.16em; text-transform: uppercase; white-space: nowrap">${esc(e.cta)}</div>
    </div>
  </div>
</div>`;
}
