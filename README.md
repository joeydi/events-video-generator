# Events Video Generator

Turns three event promos into one seamless looping video, with every variation coming from the same code. Each promo has a 16:9 cover and a 4:5 social post. In the video, each graphic floats as a card over a blurred copy of its own background clip. Between layouts, every element moves and scales to its place in the next one.

The layouts are plain HTML and CSS ported from the design source. Every visual property is a function of time, so the browser preview and the final render produce the same frames.

## Requirements

- Node 20+
- ffmpeg on your `PATH`
- Chromium for Playwright: `npx playwright install chromium`

## Setup

```sh
npm install
npx playwright install chromium
```

Media lives **outside** the repo, in its parent folder. Paths in `src/events.js` are relative to that folder:

```
Code as Video/
├── render/                    ← this repo
├── renders/                   ← background clips (*.mp4)
├── Disco Night Promo-png/     ← design exports, used by the reference overlay
└── *.png                      ← stills (fallback when an event has no video)
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the admin at http://localhost:5180 |
| `npm run render` | Renders `out/loop.mp4` |
| `npm run render -- --scale 2` | Renders 4K to `out/loop@2x.mp4` |
| `npm run render -- --stills 0,30,60` | Writes single frames to `out/stills/` |
| `npm run prepare-media` | Normalizes clips into `.cache/` (rendering runs this automatically) |

## Admin view

- **Player:** play/pause (<kbd>space</kbd>), frame step (<kbd>←</kbd>/<kbd>→</kbd>, <kbd>shift</kbd> for 10 frames), speed, loop.
- **Timeline:** marks each hold and morph. Click a segment, or press <kbd>1</kbd>–<kbd>6</kbd>, to jump to that layout.
- **Overlays:**
  - Design reference at 50% (<kbd>R</kbd>)
  - Morph-target boxes (<kbd>B</kbd>)
  - Safe areas (<kbd>G</kbd>)
- **Timing:** sliders for hold, morph, stagger, card size, blur, ease and fps. **Save** writes them to `src/config.json`.
- **Render 1080p / 4K:** saves any unsaved timing, runs the renderer with a live log, and plays the result in a looping review player.

## How it works

```
src/
  events.js        event data: copy, colors, media paths
  templates/       one file per design, each with landscape() and portrait() HTML
  config.json      timing, sequence, card and background settings
  stage.js         builds the frame and computes renderAt(t)
  morph.js         easing and interpolation helpers
  media.js         background video: <video> in preview, JPG frames in render
  admin.js         admin view
scripts/
  prepare-media.mjs  ffmpeg: preview mp4 plus per-frame JPGs for each event
  render.mjs         Playwright: seek, screenshot, pipe to ffmpeg
design/            snapshot of the original design-canvas source (*.dc.html)
```

**Morphs.** Every element that should move is tagged with `data-role` (`title-1`, `subtitle`, `cta`, and so on). The stage measures each role in every layout once. During a transition, each element moves from its current layout to its spot in the next one, with positions relative to the card as it morphs.
- Text scales to match font size.
- Rules and panels stretch.
- A role that exists in only one layout fades in or out in place.

Titles are split into words, so reflowing text (one line to two) flies word by word instead of cross-dissolving.

**Video timing.** The clips are 121 frames at 24fps. `prepare-media` stretches each clip so that one video cycle spans exactly one output loop, which keeps the loop seamless. The admin plays the clips as `<video>`, synced to the timeline. The renderer instead loads pre-extracted JPG frames, so every frame is deterministic.

**Rendering.** Headless Chromium opens `composition.html?mode=render`. For each frame it calls `window.__seek(n)`, takes a screenshot and pipes the PNG into ffmpeg (H.264, CRF 16).

## Common changes

- **Edit copy or colors:** change the event in `src/events.js`.
- **Swap a background clip:** change `media.video` in `src/events.js`. Changed sources are re-processed on the next render.
- **Change the order or the set of layouts:** edit `sequence` in `src/config.json`. Entries are `event/landscape` or `event/portrait`.
- **Add an event:** add an entry to `src/events.js`. Either point `template` at an existing design, or add a new file in `src/templates/` that exports `landscape(e)` and `portrait(e)` and tags its elements with `data-role`.
