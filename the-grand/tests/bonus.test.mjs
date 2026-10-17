// Bonus round: live sky, The Grand Tour, postcards, and Sofia on the staff.
import test from 'node:test';
import assert from 'node:assert/strict';
import {skyAt, SKY_PHASES, shootingStar, rand} from '../dist/sky.js';
import {roomArt} from '../dist/art.js';
import {ROOMS, freshState} from '../dist/engine.js';
import {TOUR, runTour} from '../dist/tour.js';
import {postcardSvg, postcardText, wrap, GREETINGS} from '../dist/postcard.js';
import {STAFF} from '../dist/characters.js';
import {createSofia, sofiaReply} from '../dist/sofia.js';
import {createWellbeing, gate} from '../dist/wellbeing.js';
import {playerFromState} from '../dist/data/promo.js';

const at = h => new Date(2026, 9, 17, Math.floor(h), Math.round((h % 1) * 60));
const seeded = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- Live sky ----------

test('sky: the phase follows the local clock, wrapping past midnight', () => {
  const cases = [[0, 'night'], [4.9, 'night'], [5, 'dawn'], [6.5, 'dawn'], [7, 'day'], [12, 'day'], [16.9, 'day'], [17, 'golden'], [18.5, 'golden'], [19, 'dusk'], [20.9, 'dusk'], [21, 'night'], [23.9, 'night']];
  for (const [h, phase] of cases) assert.equal(skyAt(at(h)).phase, phase, `${h}h`);
  assert.deepEqual(SKY_PHASES.sort(), ['dawn', 'day', 'dusk', 'golden', 'night']);
  for (let m = 0; m < 1440; m += 7) assert.ok(skyAt(at(m / 60)).phase, 'every minute of the day has a sky');
});

test('sky: night has stars, a moon and lit windows; day has none of them', () => {
  const night = roomArt(ROOMS.lobby, freshState(), skyAt(at(23))), day = roomArt(ROOMS.lobby, freshState(), skyAt(at(12)));
  assert.ok((night.match(/class="sky-star"/g) || []).length >= 8, 'stars at night');
  assert.equal((day.match(/class="sky-star"/g) || []).length, 0, 'no stars by day');
  assert.match(night, /<stop stop-color="#0b1a2b"\/>/, 'the window gradient takes the night colours');
  assert.match(day, /<stop stop-color="#6fa6c9"\/>/);
  const lit = s => (s.match(/fill="#f2c97a" opacity="\.85"/g) || []).length;
  assert.ok(lit(night) > lit(day) * 3, `more lit windows at night (${lit(night)} vs ${lit(day)})`);
  assert.equal(night, roomArt(ROOMS.lobby, freshState(), skyAt(at(23))), 'deterministic: the same sky draws the same stars');
  const golden = roomArt(ROOMS.roof, freshState(), skyAt(at(18)));
  assert.match(golden, /fill="#ffcf7a" opacity="\.9"/, 'a low sun over the rooftop at golden hour');
  assert.match(roomArt(ROOMS.roof, freshState(), {...skyAt(at(23)), shooting: true}), /class="shooting-star"/);
});

test('sky: a shooting star is rare and only at night', () => {
  const rng = seeded(3), night = skyAt(at(23));
  let n = 0;
  for (let i = 0; i < 6000; i++) if (shootingStar(night, rng)) n++;
  assert.ok(n > 800 && n < 1200, `about one in six (${n}/6000)`);
  assert.equal(shootingStar(skyAt(at(12)), () => 0), false);
  assert.ok(rand(1) >= 0 && rand(1) < 1);
});

// ---------- The Grand Tour ----------

test('tour: covers every member of staff, then the wellbeing check, then Sofia, then ends', () => {
  const npcs = TOUR.filter(s => s.npc !== undefined).map(s => s.npc);
  for (const s of STAFF) assert.ok(npcs.includes(s.id), `${s.name} is on the tour`);
  const wellbeing = TOUR.find(s => /wellbeing/i.test(s.title));
  const wb = createWellbeing();
  assert.ok(wellbeing.say.some(line => gate(line, wb, playerFromState(freshState())).signal === 'distress'), 'the demo line really trips the gate');
  assert.equal(TOUR.at(-1).end, true);
  assert.equal(TOUR.at(-2).npc, 0, 'Sofia closes the show');
  for (const s of TOUR) assert.doesNotMatch(`${s.title} ${s.caption}`, /hurry|don'?t miss|free money|deposit now/i);
});

function fakeApp({failTalk = null} = {}) {
  const log = [];
  let talking = null, cancelled = false;
  const api = {
    caption: (s, i, n) => log.push(['caption', i + 1, n, s.title]),
    talkTo: id => { log.push(['talkTo', id]); if (id !== failTalk) talking = id; },
    talkingTo: () => talking, ready: () => true,
    send: text => log.push(['send', talking, text]),
    wait: () => Promise.resolve(), cancelled: () => cancelled,
    finish: () => log.push(['finish']),
    cancel: () => { cancelled = true; },
  };
  return {api, log};
}

test('tour runner: captions in order, walks to each NPC once per stretch, says each line to the right person', async () => {
  const {api, log} = fakeApp();
  assert.equal(await runTour(api), 'done');
  assert.deepEqual(log.filter(l => l[0] === 'caption').map(l => l[1]), TOUR.map((_, i) => i + 1));
  const sends = log.filter(l => l[0] === 'send');
  assert.deepEqual(sends.map(l => [l[1], l[2]]), TOUR.flatMap(s => (s.say || []).map(line => [s.npc, line])));
  assert.equal(log.filter(l => l[0] === 'talkTo' && l[1] === 103).length, 1, 'Rex twice in a row: one walk');
  assert.deepEqual(log.at(-1), ['finish']);
});

test('tour runner: cancels cleanly, and skips a member of staff who can\'t be reached', async () => {
  const a = fakeApp();
  const real = a.api.send;
  a.api.send = text => { real(text); if (text === 'Any bonuses?') a.api.cancel(); };
  assert.equal(await runTour(a.api), 'cancelled');
  assert.ok(!a.log.some(l => l[0] === 'finish'));
  const b = fakeApp({failTalk: 102});
  let polls = 0;
  b.api.wait = () => { polls++; return Promise.resolve(); };
  assert.equal(await runTour(b.api), 'done');
  assert.ok(!b.log.some(l => l[0] === 'send' && l[1] === 102), 'nothing said to someone who never arrived');
  assert.ok(polls > 50, 'it waited for them first');
});

// ---------- Postcards ----------

test('postcard: a framed scene, a greeting in the hotel\'s voice, a stamp and a postmark', () => {
  const svg = postcardSvg({scene: '<g id="room"><circle r="3"/></g>', roomId: 'roof', roomName: 'The Rooftop Club', sky: skyAt(at(23)), name: 'Alex', guests: ['Noor', 'Zuri'], date: new Date(2026, 9, 17)});
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1500" height="1000"/);
  assert.match(svg, /<g id="room"><circle r="3"\/><\/g>/, 'the scene is framed');
  assert.match(svg, />The Grand</);
  assert.match(svg, /NIGHT · THE ROOFTOP CLUB/);
  assert.match(svg, /17 OCT 2026/);
  assert.match(svg, /— Alex, Suite 408/);
  assert.match(svg, /SIMULATED/);
  assert.doesNotMatch(svg, /foreignObject/, 'plain SVG only, so it can be saved as an image');
  const text = postcardText({roomId: 'roof', roomName: 'The Rooftop Club', sky: skyAt(at(23)), name: 'Alex', guests: ['Noor', 'Zuri']});
  assert.equal(text.body, 'The city went on forever tonight. Somebody played the sax. Noor and Zuri were here too.');
  assert.match(postcardText({roomId: 'roof', sky: skyAt(at(12)), name: 'Alex'}).body, /forever today\./, 'the greeting follows the sky');
  assert.match(postcardText({roomId: 'lobby', sky: skyAt(at(12)), name: 'Alex', guests: ['Jules']}).body, /Jules was here too\.$/);
});

test('postcard: hostile names are escaped, long greetings wrap, no room line mentions play or offers', () => {
  const svg = postcardSvg({scene: '', roomId: 'suite', roomName: 'Your private suite', sky: skyAt(at(9)), name: '<script>alert(1)</script>', guests: ['"Bea"']});
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /&quot;Bea&quot;/);
  assert.deepEqual(wrap('one two three four five six', 9), ['one two', 'three', 'four five', 'six']);
  for (const line of Object.values(GREETINGS)) assert.doesNotMatch(line, /\b(bonus|spin|win|offer|credit|deposit|jackpot|luck)\w*\b/i, line);
});

// ---------- Sofia on the staff ----------

test('Sofia has opinions about every member of staff, and never sends anyone to an offer', () => {
  const rng = seeded(5);
  for (const s of STAFF) {
    const key = s.name.replace(/^Mr /, '');
    const r = sofiaReply(createSofia(), `what do you think of ${key}?`, {playerName: 'Alex', room: 'lobby'}, rng);
    assert.match(r.text, new RegExp(key), s.name);
    assert.doesNotMatch(r.text, /\b(bonus|offer|free spins?|claim|deposit|promo)\w*\b/i, `${s.name}: no offers`);
  }
});
