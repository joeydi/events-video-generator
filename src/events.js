// Event data — one entry per promo. Templates read copy + styling levers from here;
// media paths are relative to the "Code as Video" folder (the project's parent).
// Swap a `video` path (or add one where only a `still` exists) and rerun `npm run prepare-media`.

export const events = {
  disco: {
    id: 'disco',
    template: 'disco',
    label: 'Disco Night',
    short: 'Disco',
    background: '#1d1e40',
    accent: '#ff4d6a',
    headlineStyle: 'glow',
    italic: true,
    presenter: 'EDC Colombia presents',
    title: ['Disco', 'Night'],
    subtitle: 'with Dombresky',
    dates: 'Sat Oct 10 – Sun Oct 11, 2026',
    location: 'Medellín, Colombia',
    cta: 'Tickets · dombresky.com',
    media: { video: 'renders/09Q7YRSWWjdB16PfBDOIi_video.mp4', still: 'Neon Liquid Cloud Ceiling.png' },
    reference: {
      landscape: 'Disco Night Promo-png/Event cover · 16 9.png',
      portrait: 'Disco Night Promo-png/Instagram post · 4 5.png',
    },
  },

  data: {
    id: 'data',
    template: 'data',
    label: 'Data Science Meetup',
    short: 'Data',
    background: '#1a1b3e',
    accent: '#ff4d6a',
    headlineStyle: 'glitch',
    series: 'TEDx Talks',
    badge: 'Featured talk',
    kicker: 'Demystifying',
    title: ['Data', 'Science'],
    speaker: 'Mr. Asitang Mishra',
    date: 'Jul 23, 2026',
    cta: 'Watch the talk · ted.com',
    media: { video: 'renders/UHxls1K3TrQqXk21sz_4s_video.mp4', still: 'Neon Data Mesh Wave.png' },
    reference: {
      landscape: 'Disco Night Promo-png/Data Science Meetup · cover 16 9.png',
      portrait: 'Disco Night Promo-png/Data Science Meetup · Instagram 4 5.png',
    },
  },

  jam: {
    id: 'jam',
    template: 'jam',
    label: 'Game Jam',
    short: 'Jam',
    background: '#171c45',
    accent: '#ff4d6a',
    headlineStyle: 'extrude',
    eyebrow: 'Press start',
    title: ['Game', 'Jam'],
    subtitle: 'Make a game in two days.',
    days: [
      { label: 'Day 1', day: 'Friday', date: 'November 13' },
      { label: 'Day 2', day: 'Saturday', date: 'November 14' },
    ],
    where: { label: 'Where', place: 'The Den', town: 'Cabot, VT' },
    cta: 'Join the jam',
    url: 'harryshardwarevt.com',
    media: { video: 'renders/rCAmKiEB2tr_fVsXxJfZW_video.mp4', still: 'Iridescent Floating Cube City.png' },
    reference: {
      landscape: 'Disco Night Promo-png/Game Jam · cover 16 9.png',
      portrait: 'Disco Night Promo-png/Game Jam · Instagram 4 5.png',
    },
  },
};

// One cycle of source video: the clips are 121 frames @24fps and frame 120 flows
// straight into frame 0, so the whole clip is the loop.
export const SOURCE_FPS = 24;
export const SOURCE_LOOP_FRAMES = 121;
export const SOURCE_LOOP_SECONDS = SOURCE_LOOP_FRAMES / SOURCE_FPS;
