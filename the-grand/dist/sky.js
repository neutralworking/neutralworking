// The sky outside The Grand follows the player's own clock (bonus round). Pure: give it a Date, get a palette.
// Phases by local hour: night (21–5), dawn (5–7), day (7–17), golden (17–19), dusk (19–21).
// Nothing here affects play; it only paints the windows and the rooftop.

const PHASES = [
  {phase: 'night', from: 21, to: 5, top: '#0b1a2b', bottom: '#2c4a63', glow: null, stars: 1, lit: .9, label: 'Night'},
  {phase: 'dawn', from: 5, to: 7, top: '#3b4f7a', bottom: '#e9a98a', glow: '#ffd3a8', stars: .25, lit: .4, label: 'Dawn'},
  {phase: 'day', from: 7, to: 17, top: '#6fa6c9', bottom: '#cfe3e6', glow: null, stars: 0, lit: .05, label: 'Day'},
  {phase: 'golden', from: 17, to: 19, top: '#5f7fa6', bottom: '#f2c27b', glow: '#ffcf7a', stars: 0, lit: .3, label: 'Golden hour'},
  {phase: 'dusk', from: 19, to: 21, top: '#24304f', bottom: '#b0707a', glow: '#e7919a', stars: .5, lit: .75, label: 'Dusk'},
];
const inRange = (h, {from, to}) => (from < to ? h >= from && h < to : h >= from || h < to);

export function skyAt(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  const p = PHASES.find(x => inRange(h, x));
  return {...p, hour: h, moon: p.phase === 'night' || p.phase === 'dusk', sun: p.phase === 'golden' || p.phase === 'dawn'};
}
export const SKY_PHASES = PHASES.map(p => p.phase);

// Deterministic sprinkle: the same stars every redraw of the same window, so nothing flickers.
export function rand(seed) { let x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }

// A shooting star now and then at night: about one room visit in six, chosen by the caller's rng.
export const shootingStar = (sky, rng = Math.random) => sky.phase === 'night' && rng() < 1 / 6;
