import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FixtureData, assembleFixtures, playerFromState} from '../dist/data/promo.js';
import {renderCards, timeLeft} from '../dist/cards.js';
import {HotelResidents} from '../dist/residents.js';
import {STAFF} from '../dist/characters.js';
import {freshState, loadState, ROOMS} from '../dist/engine.js';
import {createWellbeing, gate, offersBlocked, OFFER_ACTIONS} from '../dist/wellbeing.js';
import {optIn, optInProblem, noteCompetitionRound, standingFor, standingsWith, loadCompetitions} from '../dist/data/competitions.js';
import {PERSONA, REX_ID, createRex, rexReply, rexOpener, rexSuggestions, rexLineCount, matchCompetition} from '../dist/personas/rex.js';

const dir = new URL('../dist/data/fixtures/', import.meta.url);
const read = f => JSON.parse(fs.readFileSync(new URL(f, dir)));
const fixtures = assembleFixtures({terms: read('terms.json'), bonuses: read('bonuses.json'), freeSpins: read('free-spins.json'), competitions: read('competitions.json'), records: read('records.json'), banking: read('banking.json')});
const NOW = Date.parse('2026-10-17T12:00:00Z');
const source = new FixtureData(fixtures, {now: () => NOW});
const snap = (competitions = {}) => source.snapshot({id: 'p', ageVerified: true, competitions});
const data = snap();
const ctx = {data, timeZone: 'Europe/Prague'};
const seeded = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const ask = (text, mem = createRex(), c = ctx) => rexReply(mem, text, c, seeded(17));
// Leaderboard pressure: anything that turns a standing into a reason to play more.
const PRESSURE = /\bonly \d+ (points? )?(behind|away|off)\b|\bcatch up\b|\bclimb\b|\bso close\b|\balmost (there|top|first)\b|\bkeep (playing|going|spinning)\b|\bone more\b|\bmove up\b|\bdon'?t give up\b|\byou'?re close\b|\bcould (still )?win\b|\bwithin reach\b|\bjust \d+\b|\bpush (for|on)\b|\bhurry\b|\blast chance\b|\bdon'?t miss\b|\bact now\b|\bends? soon\b/i;

test('AC: with 1 live and 2 upcoming, "what\'s on?" lists live first, with dates and prizes from data', () => {
  assert.equal(data.competitions.live.length, 1);
  assert.equal(data.competitions.upcoming.length, 2);
  const r = ask("what's on?");
  assert.equal(r.intent, 'liveCompetitions');
  assert.deepEqual(r.action, {type: 'show-competitions'});
  assert.equal(r.text, 'One live now, two coming up. Live ones first on the cards.');
  const cards = renderCards(r.action, data, {timeZone: 'Europe/Prague', now: NOW});
  assert.deepEqual(cards.map(c => c.text.split('.')[0]), ['LIVE COMPETITION: Friday Sevens Race', 'UPCOMING: Neon Nights Cup', 'UPCOMING: Rooftop prize draw']);
  const live = data.competitions.live[0], tz = {timeZone: 'Europe/Prague', dateStyle: 'medium', timeStyle: 'short'};
  assert.ok(cards[0].text.includes(`Starts: ${new Date(live.startsAt).toLocaleString('en-GB', tz)}`));
  assert.ok(cards[0].text.includes(`Ends: ${new Date(live.endsAt).toLocaleString('en-GB', tz)}`));
  assert.ok(cards[0].text.includes('Prizes: 1st: 5,000 credits · 2nd: 2,000 credits · 3rd–10th: 250 credits'));
  assert.match(cards[0].text, /Time left: 2 h 0 min/, 'the countdown is on the card');
  assert.doesNotMatch(cards[1].text, /Time left/, 'only live cards count down');
  assert.doesNotMatch(r.text, /\d|left|ends|hours|minutes/i, 'no dates or countdowns in speech');
});

test('AC: opted in, "how am I doing?" gives rank and score with no nudge', () => {
  const opted = snap({'friday-sevens': {optedIn: true, score: 400}});
  const r = ask('how am I doing?', createRex(), {data: opted});
  assert.equal(r.intent, 'myStanding');
  assert.equal(r.text, 'Friday Sevens Race: you’re #4 with 400 points.');
  assert.deepEqual(r.action, {type: 'show-leaderboard', competitionId: 'friday-sevens'});
  assert.doesNotMatch(r.text, PRESSURE);
  const [lb] = renderCards(r.action, opted, {});
  assert.match(lb.html, /<li class="you"><span>#4<\/span><span>You<\/span><span>400<\/span>/, 'the player\'s own row is highlighted');
  assert.match(lb.html, /<span>#5<\/span><span>Brass\*\*\*<\/span>/, 'everyone below is renumbered');
  // Close to the leader or far behind, the line has the same shape.
  for (const score of [0, 300, 919, 5000]) {
    const x = ask('how am I doing?', createRex(), {data: snap({'friday-sevens': {optedIn: true, score}})});
    assert.match(x.text, /^Friday Sevens Race: you’re #\d+ with [\d,]+ points\.$/, `score ${score}`);
  }
  const out = ask('how am I doing?');
  assert.equal(out.text, 'You’re not entered in the Friday Sevens Race.');
  assert.equal(out.action, null, 'no opt-in card pushed at someone who only asked');
});

test('AC: "who won last week?" shows the most recent finished competition\'s winners and prizes, anonymised', () => {
  const r = ask('who won last week?');
  assert.equal(r.intent, 'pastResults');
  assert.deepEqual(r.action, {type: 'show-records', competitionId: 'gold-classic', limit: 1});
  assert.equal(data.records[0].competitionId, 'gold-classic', 'records arrive newest first');
  const [c] = renderCards(r.action, data, {timeZone: 'Europe/Prague'});
  for (const w of data.records[0].winners.slice(0, 3)) {
    assert.ok(c.html.includes(w.displayName), w.displayName);
    assert.ok(c.html.includes(w.prize), w.prize);
    assert.match(w.displayName, /\*\*\*$/, 'display names arrive anonymised');
  }
  assert.match(r.text, /^The Gold Lounge Classic, which ended \d+ \w+ 2026\./);
});

test('Hall of Records: a board in the Gallery opens the same records view', () => {
  const board = ROOMS.hall.objects.find(o => o.type === 'records-board');
  assert.ok(board);
  const r = ask('show me the records');
  assert.equal(r.intent, 'records');
  assert.deepEqual(r.action, {type: 'show-records', limit: 3});
  assert.equal(renderCards({type: 'show-records', limit: 5}, data, {}).length, data.records.length);
});

test('facts per competition come from data; topic words never pick a competition', () => {
  assert.equal(ask('what are the prizes for the race').text, 'Friday Sevens Race prizes: 1st: 5,000 credits, 2nd: 2,000 credits, 3rd–10th: 250 credits.');
  assert.equal(ask('how is the cup scored').text, `Neon Nights Cup: ${data.competitions.upcoming[0].scoring}`);
  assert.equal(ask('how do I enter the cup').text, 'No opt-in for the Neon Nights Cup. Play on Nova Nights while it’s live counts.');
  assert.equal(ask('how do I enter the race').text, 'The Friday Sevens Race needs an opt-in first. Only play after that counts.');
  assert.deepEqual(ask('terms for the draw').action, {type: 'show-terms', section: 'competition', clauseId: 'c-3'});
  assert.equal(matchCompetition('prizes', [...data.competitions.live, ...data.competitions.upcoming]).comp, undefined);
  assert.equal(matchCompetition('the tournament', data.competitions.upcoming).comp.id, 'neon-cup');
});

test('opt-in: offered on a card to confirm, never for automatic entry, never twice', () => {
  const r = ask('opt me in to the prize draw');
  assert.deepEqual(r.action, {type: 'opt-in', competitionId: 'rooftop-draw'});
  assert.match(r.text, /Confirm on the card/);
  assert.equal(ask('opt me in to the cup').action, null);
  const done = ask('opt me in to the race', createRex(), {data: snap({'friday-sevens': {optedIn: true, score: 0}})});
  assert.equal(done.text, 'You’re already opted in to the Friday Sevens Race.');
  assert.equal(done.action, null);
  assert.doesNotMatch(renderCards({type: 'opt-in', competitionId: 'rooftop-draw'}, data, {})[0].text, /free|deposit/i, 'the card states no fact that isn\'t in the data');
});

test('rules: no recommendation, one unprompted mention, none after "no thanks"', () => {
  for (const q of ['should I enter the race', 'which one is best', 'what are my chances', 'can I win the cup']) assert.equal(ask(q).intent, 'recommend', q);
  const mem = createRex();
  assert.match(rexOpener(mem, ctx).text, /one competition live and two coming up/);
  assert.doesNotMatch(rexOpener(mem, ctx).text, /competition/);
  const no = createRex();
  ask('no thanks', no);
  assert.doesNotMatch(rexOpener(no, ctx).text, /competition/);
  assert.ok(!rexSuggestions(no, ctx).some(c => /what’s on|enter|opt/i.test(c)));
  assert.equal(ask("what's on?", no).action.type, 'show-competitions', 'asking still works');
});

test('wellbeing: listing and opting in count as offers; records, standings and terms stay available', () => {
  for (const t of ['show-competitions', 'opt-in']) assert.ok(OFFER_ACTIONS.has(t), t);
  for (const t of ['show-records', 'show-leaderboard', 'show-terms']) assert.ok(!OFFER_ACTIONS.has(t), t);
  const blocked = {...ctx, offersBlocked: 'distress'};
  assert.equal(ask("what's on?", createRex(), blocked).action, null);
  assert.equal(ask('opt me in to the draw', createRex(), blocked).action, null);
  assert.equal(ask('who won last week?', createRex(), blocked).action.type, 'show-records');
  assert.doesNotMatch(rexOpener(createRex(), blocked).text, /competition/);
});

test('held-out intent accuracy is at least 90%', () => {
  // Written before the first run and not tuned against.
  const HELD_OUT = [
    ['any competitions tonight?', 'liveCompetitions'], ['is anything live right now', 'liveCompetitions'], ['what tournaments are running', 'liveCompetitions'], ["what's happening in here", 'liveCompetitions'], ['races?', 'liveCompetitions'],
    ["what's coming up this week", 'upcomingCompetitions'], ['anything scheduled for later', 'upcomingCompetitions'], ["what's next", 'upcomingCompetitions'], ['any upcoming tournaments', 'upcomingCompetitions'],
    ['how do I join the race', 'howToEnter'], ['do I need to opt in for the cup', 'howToEnter'], ['how does entry work for the draw', 'howToEnter'], ['am I eligible for the tournament', 'howToEnter'],
    ['how do points work in the race', 'scoring'], ['what are the rules of the cup', 'scoring'], ['how do I win the draw', 'scoring'], ['how is the race scored', 'scoring'],
    ['what can you win in the cup', 'prizes'], ["what's up for grabs in the race", 'prizes'], ['what does first place get', 'prizes'], ['prizes for the draw?', 'prizes'],
    ["what's my rank", 'myStanding'], ['where am I on the board', 'myStanding'], ['how am I placed in the race', 'myStanding'], ['my score?', 'myStanding'],
    ['who won the last race', 'pastResults'], ['previous winners please', 'pastResults'], ['how did the classic end', 'pastResults'], ['results from last week', 'pastResults'],
    ["what's the highest score ever", 'records'], ['all-time records', 'records'], ['hall of fame', 'records'], ['biggest win ever', 'records'],
    ['sign me up for the draw', 'optIn'], ['count me in for the race', 'optIn'], ["I'd like to enter the cup", 'optIn'],
    ['terms for the race', 'competitionTerms'], ['small print on the tournament', 'competitionTerms'],
    ["who's winning", 'leaderboard'], ['show the standings', 'leaderboard'],
  ];
  const misses = [];
  for (const [text, want] of HELD_OUT) { const got = ask(text).intent; if (got !== want) misses.push(`${text} → ${got} (wanted ${want})`); }
  const acc = 1 - misses.length / HELD_OUT.length;
  console.log(`Rex held-out intent accuracy: ${(acc * 100).toFixed(1)}% (${HELD_OUT.length - misses.length}/${HELD_OUT.length})${misses.length ? '\n  ' + misses.join('\n  ') : ''}`);
  assert.ok(acc >= .9, misses.join('\n'));
});

test('AC fuzz: 2,000 inputs never produce leaderboard pressure, and no offers after a distress signal', () => {
  const vocab = ("how am I doing rank score points standing leaderboard behind close top first win race cup draw tournament prizes " +
    "enter opt in join who won last week records best should I chances what's on upcoming live now terms hurry more keep playing win money back lost everything chase").split(' ');
  const rng = seeded(31);
  const words = () => Array.from({length: 1 + Math.floor(rng() * 8)}, () => vocab[Math.floor(rng() * vocab.length)]).join(' ');
  const opted = {data: snap({'friday-sevens': {optedIn: true, score: 900}}), timeZone: 'Europe/Prague'}; // 20 points off the lead: the most tempting case
  const mem = createRex();
  for (let i = 0; i < 1000; i++) { const t = words(), r = rexReply(mem, t, opted, rng); assert.doesNotMatch(r.text, PRESSURE, t); }
  const wb = createWellbeing(), p = playerFromState(freshState());
  assert.ok(gate('I need to win my money back', wb, p).signal);
  const after = createRex(), blockedCtx = () => ({...opted, offersBlocked: offersBlocked(wb, p)});
  for (let i = 0; i < 1000; i++) {
    const t = words();
    if (gate(t, wb, p).signal) continue;
    const r = rexReply(after, t, blockedCtx(), rng);
    assert.doesNotMatch(r.text, PRESSURE, t);
    assert.ok(!r.action || !OFFER_ACTIONS.has(r.action.type), `${t}: no offer actions after distress`);
  }
  const lines = JSON.stringify(PERSONA.intents.map(i => i.responses.map(r => (typeof r === 'string' ? r : typeof r.text === 'string' ? r.text : r.text.toString()))));
  assert.doesNotMatch(lines, PRESSURE);
});

test('explainability: every reply records intent, p, via and dataIds that exist', () => {
  const ids = new Set([...data.competitions.live, ...data.competitions.upcoming].map(c => c.id).concat(data.records.map(r => r.competitionId)));
  const mem = createRex();
  for (const q of ["what's on?", 'who won last week?', 'prizes for the race', 'opt me in to the draw', 'marmalade']) {
    const r = ask(q, mem);
    for (const k of ['intent', 'p', 'via']) assert.ok(r[k] !== undefined, `${q}: ${k}`);
    for (const id of r.dataIds) assert.ok(ids.has(id), `${q}: ${id}`);
  }
});

// ---------- Competition state ----------

test('opt-in, scoring on live competitions, standing and reload', () => {
  const s = freshState(), [race] = data.competitions.live, [cup, draw] = data.competitions.upcoming;
  assert.equal(optInProblem(s, cup), 'automatic');
  assert.deepEqual(noteCompetitionRound(s, [race], 'Grand Sevens', 100, NOW), [], 'no points before opting in');
  assert.deepEqual(optIn(s, race, NOW), {ok: true});
  assert.equal(optIn(s, race, NOW).reason, 'already');
  assert.deepEqual(noteCompetitionRound(s, [race], 'Nova Nights', 100, NOW), [], 'wrong game');
  assert.deepEqual(noteCompetitionRound(s, [race], 'Grand Sevens', 100, NOW), ['friday-sevens']);
  assert.deepEqual(noteCompetitionRound(s, [race], 'Grand Sevens', 0, NOW + 3 * 36e5), [], 'not after it ends');
  assert.deepEqual(standingFor(race, s.competitions['friday-sevens']), {rank: 6, score: 100});
  assert.deepEqual(standingsWith(race, {rank: 6, score: 100}).at(-1), {rank: 6, displayName: 'You', score: 100, you: true});
  assert.deepEqual(standingFor(race, {optedIn: true, score: 920}), {rank: 2, score: 920}, 'ties go to whoever got there first');
  optIn(s, draw, NOW);
  const back = loadState(JSON.stringify(s));
  assert.deepEqual(back.competitions['friday-sevens'], {score: 100, optedIn: true, optedInAt: NOW});
  assert.ok(back.competitions['rooftop-draw'].optedIn);
  assert.deepEqual(loadCompetitions({competitions: {'bad id!': {}, ok: {score: -5, optedIn: 'yes'}}}), {ok: {score: 0}});
  assert.equal(timeLeft(new Date(NOW + 2 * 864e5 + 3 * 36e5).toISOString(), NOW), '2 d 3 h');
  assert.equal(timeLeft(new Date(NOW - 1).toISOString(), NOW), '');
});

test('staff: Rex stands in the Gold Lounge', () => {
  const rex = STAFF.find(x => x.id === REX_ID);
  assert.equal(rex.room, 'gold');
  const sim = new HotelResidents(seeded(21));
  assert.equal(sim.agents.length, 20);
  assert.deepEqual([sim.get(REX_ID).x, sim.get(REX_ID).y], [3.5, 2.5]);
  assert.ok(rexLineCount().total > 30);
  assert.deepEqual(PERSONA.reactions, []);
});
