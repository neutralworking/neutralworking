import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FixtureData, assembleFixtures, playerFromState} from '../dist/data/promo.js';
import {renderCards} from '../dist/cards.js';
import {HotelResidents} from '../dist/residents.js';
import {STAFF} from '../dist/characters.js';
import {freshState, loadState} from '../dist/engine.js';
import {createWellbeing, gate, offersBlocked} from '../dist/wellbeing.js';
import {freeSpin, spinProblem, spinsLeft, gameReason, ledgerKey} from '../dist/data/spins.js';
import {noteWager} from '../dist/data/claims.js';
import {PERSONA, PIP_ID, createPip, pipReply, pipOpener, pipSuggestions, pipLineCount, gameIn} from '../dist/personas/pip.js';

const dir = new URL('../dist/data/fixtures/', import.meta.url);
const read = f => JSON.parse(fs.readFileSync(new URL(f, dir)));
const fixtures = assembleFixtures({terms: read('terms.json'), bonuses: read('bonuses.json'), freeSpins: read('free-spins.json'), competitions: read('competitions.json'), records: read('records.json'), banking: read('banking.json')});
const source = new FixtureData(fixtures);
const player = {id: 'p', ageVerified: true};
const data = source.snapshot(player);
const ctx = {data, timeZone: 'Europe/Prague'};
const seeded = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const ask = (text, mem = createPip(), c = ctx) => pipReply(mem, text, c, seeded(13));
const offer = id => data.freeSpins.find(o => o.id === id);
const URGENCY = /hurry|last chance|don'?t miss|act now|only today|before it'?s gone|ending soon|quick(ly)?,|limited time/i;

// The ticket's example: 20 spins that work on two games.
const TWO_GAME = {id: 'duo-20', title: '20 spins on the Arcade pair', spins: 20, remaining: 20, spinValue: {amount: 10, currency: 'credits'}, eligibleGames: ['Nova Nights', 'Grand Sevens'],
  expiresAt: '2030-01-01T18:00:00Z', wagering: {multiplier: 10}, maxWin: {amount: 500, currency: 'credits'}, termsRef: {section: 'free_spins', clauseId: 'fs-1', url: 'terms.html#fs-1'}, claimable: true};
const duo = {...data, freeSpins: [TWO_GAME]};

test('AC: given 20 spins on 2 eligible games, "what spins have I got?" shows count, spin value, games, expiry, wagering and max win', () => {
  const r = ask('what spins have I got?', createPip(), {data: duo, timeZone: 'Europe/Prague'});
  assert.equal(r.intent, 'whatSpins');
  assert.deepEqual(r.action, {type: 'show-offers', kind: 'free_spins', ids: ['duo-20']});
  const [c] = renderCards(r.action, duo, {timeZone: 'Europe/Prague'});
  for (const row of ['Spins: 20', 'Spin value: 10 credits', 'Games: Nova Nights, Grand Sevens', 'Expires: 1 Jan 2030, 19:00', 'Wagering: 10× winnings', 'Max win: 500 credits']) assert.ok(c.text.includes(row), row);
  assert.match(c.html, /class="card-terms"/);
  assert.match(c.html, /SIMULATED/);
  assert.match(c.html, /data-action="spins-use" data-id="duo-20" data-game="Nova Nights"/);
  assert.match(c.html, /data-action="spins-use" data-id="duo-20" data-game="Grand Sevens"/);
  assert.ok(!/\d/.test(r.text) || /across/.test(r.text) === false, 'framing only');
});

test('AC: "use my spins" opens an eligible cabinet; a non-eligible cabinet is refused with the reason from data', () => {
  const mem = createPip();
  const open = ask('use my nova spins', mem);
  assert.deepEqual(open.action, {type: 'open-claim', kind: 'free_spins', id: 'nova-20', game: 'neon'});
  const no = ask('can I use them on Grand Sevens?', mem);
  assert.equal(no.text, 'No. 20 spins on Nova Nights can only be used on Nova Nights.');
  const refuse = ask('use my nova spins on grand sevens');
  assert.equal(refuse.intent, 'useSpins');
  assert.match(refuse.text, /20 spins on Nova Nights can only be used on Nova Nights\./);
  assert.notEqual(refuse.action?.type, 'open-claim', 'no cabinet opens');
  assert.deepEqual(refuse.action, {type: 'show-terms', section: 'free_spins', clauseId: 'fs-1'});
  // The same rule holds below the persona, where the app plays the spin.
  const s = freshState();
  assert.deepEqual(spinProblem(s, offer('nova-20'), 'gold'), {code: 'game', reason: '20 spins on Nova Nights can only be used on Nova Nights.'});
  assert.equal(freeSpin(s, offer('nova-20'), 'gold').ok, false);
  assert.equal(s.freeSpinsUsed.length ?? Object.keys(s.freeSpinsUsed).length, 0, 'nothing spent on a refused spin');
  // Two eligible games and none named: the card asks which.
  const both = ask('use my spins', createPip(), {data: duo});
  assert.deepEqual(both.action, {type: 'show-offers', kind: 'free_spins', ids: ['duo-20']});
  assert.match(both.text, /Which game\?/);
});

test('use: which offer, which cabinet', () => {
  assert.deepEqual(gameIn('use my nova spins on grand sevens'), {game: 'gold', rest: 'use my nova spins  ', explicit: true});
  assert.equal(gameIn('the nova ones').explicit, false);
  const mem = createPip();
  const which = ask('use my spins', mem);
  assert.equal(which.action, null);
  assert.deepEqual(pipSuggestions(mem, ctx), ['Use 20 spins on Nova Nights', 'Use 10 spins on Grand Sevens']);
  assert.deepEqual(ask('Use 10 spins on Grand Sevens', mem).action, {type: 'open-claim', kind: 'free_spins', id: 'sevens-10', game: 'gold'});
  assert.deepEqual(ask('use my spins on the gold machines').action, {type: 'open-claim', kind: 'free_spins', id: 'sevens-10', game: 'gold'});
  assert.match(ask('use spins on nova', createPip(), {data: {...data, freeSpins: [offer('sevens-10')]}}).text, /10 spins on Grand Sevens can only be used on Grand Sevens\./, 'one set of spins: named in the refusal');
  assert.equal(ask('use spins on nova', createPip(), {data: {...data, freeSpins: [offer('sevens-10'), {...offer('sevens-10'), id: 'sevens-b', title: 'More spins on Grand Sevens'}]}}).text, 'None of your spins can be used on Nova Nights.');
});

test('facts are read from data', () => {
  const nova = offer('nova-20');
  assert.equal(ask('how much is each nova spin worth').text, '20 spins on Nova Nights: each spin is played at 10 credits.');
  assert.equal(ask("what's the max win on the grand sevens spins").text, '10 spins on Grand Sevens: winnings are capped at 250 credits in total.');
  assert.equal(ask('wagering on the nova spins?').text, 'Winnings from 20 spins on Nova Nights come as bonus credits, wagered 10× before they’re normal credits.');
  const e = ask('when do the nova spins expire');
  assert.ok(e.text.includes(new Date(nova.expiresAt).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Prague'})));
  assert.equal(ask('which games are the grand sevens spins for').text, '10 spins on Grand Sevens can be used on Grand Sevens.');
});

test('rules: never recommends, never "free money", mentions spins once, never after "no thanks"', () => {
  for (const q of ['which spins are best', 'what would you play', 'are the nova spins worth it', 'which is luckier']) assert.match(ask(q).text, /Not my call/, q);
  const lines = JSON.stringify(PERSONA.intents.map(i => i.responses.map(r => (typeof r === 'string' ? r : typeof r.text === 'string' ? r.text : r.text.toString()))));
  assert.doesNotMatch(lines, /free money|best (spins|one) for you|you should (use|play)/i);
  assert.doesNotMatch(lines, URGENCY);
  const mem = createPip();
  assert.match(pipOpener(mem, ctx).text, /free spins on 2 offers/);
  assert.doesNotMatch(pipOpener(mem, ctx).text, /spins/);
  const no = createPip();
  ask('no thanks', no);
  assert.doesNotMatch(pipOpener(no, ctx).text, /spins/);
  assert.ok(!pipSuggestions(no, ctx).some(c => /spins|use/i.test(c)));
  assert.equal(ask('what spins have I got?', no).action.type, 'show-offers', 'asking still works');
});

test('held-out intent accuracy is at least 90%', () => {
  // Written before the first run and not tuned against.
  const HELD_OUT = [
    ['any free spins for me?', 'whatSpins'], ['how many spins do I have', 'whatSpins'], ['show me my spins', 'whatSpins'], ['spins?', 'whatSpins'], ['tell me about the nova spins', 'whatSpins'],
    ['which games are my spins for', 'whichGames'], ['where can I use the spins', 'whichGames'], ['do the sevens spins work on nova', 'whichGames'], ['what machines can I play them on', 'whichGames'], ['are they valid on grand sevens', 'whichGames'],
    ['what is each spin worth', 'spinValue'], ["what's the spin value on the nova ones", 'spinValue'], ['how much is a spin', 'spinValue'], ['what stake are the spins played at', 'spinValue'],
    ['when do my spins expire', 'expiry'], ['how long do I have to use them', 'expiry'], ['what is the deadline for the nova spins', 'expiry'], ['when do the sevens ones run out', 'expiry'],
    ['let me use my spins', 'useSpins'], ['play the nova spins', 'useSpins'], ['start my free spins on grand sevens', 'useSpins'], ['use them now', 'useSpins'], ['open the game with my spins', 'useSpins'],
    ['is there wagering on spin winnings', 'spinWagering'], ['playthrough on the nova spins?', 'spinWagering'], ['any strings attached?', 'spinWagering'], ['how many times do I need to play the winnings through', 'spinWagering'],
    ["what's the most I can win", 'maxWin'], ['is there a cap on the nova spins', 'maxWin'], ['maximum win on the sevens spins', 'maxWin'], ['how much can I win with them', 'maxWin'],
    ['no thanks', 'noThanks'], ["I'm good", 'noThanks'], ['not interested in spins', 'noThanks'], ['nah', 'noThanks'],
    ['which spins should I use', 'recommend'], ['what do you recommend', 'recommend'], ['is the nova one better', 'recommend'],
    ['who are you?', 'who'], ['hey', 'greet'],
  ];
  const misses = [];
  for (const [text, want] of HELD_OUT) { const got = ask(text).intent; if (got !== want) misses.push(`${text} → ${got} (wanted ${want})`); }
  const acc = 1 - misses.length / HELD_OUT.length;
  console.log(`Pip held-out intent accuracy: ${(acc * 100).toFixed(1)}% (${HELD_OUT.length - misses.length}/${HELD_OUT.length})${misses.length ? '\n  ' + misses.join('\n  ') : ''}`);
  assert.ok(acc >= .9, misses.join('\n'));
});

test('AC fuzz: 2,000 inputs, no urgency language, and no offers at all after a distress signal', () => {
  const vocab = ('any spins free use play nova nights grand sevens gold neon which games worth value max win cap wagering expire when ' +
    "them it on my the no thanks best recommend hello who hurry win money back lost everything chase need it please now tonight bonus cabinet open").split(' ');
  const rng = seeded(77);
  const words = () => Array.from({length: 1 + Math.floor(rng() * 8)}, () => vocab[Math.floor(rng() * vocab.length)]).join(' ');
  const mem = createPip();
  for (let i = 0; i < 1000; i++) { const t = words(), r = pipReply(mem, t, ctx, rng); assert.doesNotMatch(r.text, URGENCY, t); if (r.action?.type === 'open-claim') assert.ok(!gameReason(offer(r.action.id), r.action.game), `${t}: only eligible cabinets open`); }
  const wb = createWellbeing(), p = playerFromState(freshState());
  assert.ok(gate('I need to win my money back', wb, p).signal);
  const after = createPip(), blockedCtx = () => ({...ctx, offersBlocked: offersBlocked(wb, p)});
  assert.doesNotMatch(pipOpener(after, blockedCtx()).text, /spins/);
  for (let i = 0; i < 1000; i++) {
    const t = words();
    if (gate(t, wb, p).signal) continue;
    const r = pipReply(after, t, blockedCtx(), rng);
    assert.doesNotMatch(r.text, URGENCY, t);
    assert.ok(!r.action || !['show-offers', 'open-claim'].includes(r.action.type), `${t}: no offer actions after distress`);
    assert.ok(!pipSuggestions(after, blockedCtx()).some(c => /^use|what spins/i.test(c)));
  }
});

test('explainability: every reply records intent, p, via and dataIds that exist', () => {
  const ids = new Set([...data.freeSpins.map(o => o.id), ...Object.values(data.terms).flat().map(c => c.clauseId)]);
  const mem = createPip();
  for (const q of ['what spins have I got?', 'use my nova spins', 'use them on grand sevens', 'max win on the nova spins', 'marmalade']) {
    const r = ask(q, mem);
    for (const k of ['intent', 'p', 'via']) assert.ok(r[k] !== undefined, `${q}: ${k}`);
    for (const id of r.dataIds) assert.ok(ids.has(id), `${q}: ${id}`);
  }
});

// ---------- Free spins in the cabinet ----------

test('a free spin costs nothing, pays bonus credits capped at max win, and carries wagering', () => {
  const s = freshState(), nova = offer('nova-20'), credits = s.credits;
  const lose = freeSpin(s, nova, 'neon', () => .99);
  assert.ok(lose.ok);
  assert.equal(lose.payout, 0);
  assert.equal(s.credits, credits, 'no credits spent');
  assert.equal(spinsLeft(s, nova), 19);
  assert.equal(s.spins, 1, 'counts as a round played');
  const win = freeSpin(s, nova, 'neon', () => .001);
  assert.ok(win.payout > 0);
  assert.equal(s.credits, credits + win.payout);
  const e = s.bonusLedger[ledgerKey('nova-20')];
  assert.equal(e.granted, win.payout);
  assert.equal(e.target, win.payout * 10, 'wagering on winnings');
  assert.deepEqual(e.games, ['Nova Nights']);
  // Max win caps total winnings across the offer's spins.
  let total = e.granted;
  for (let i = 0; i < 18; i++) { const r = freeSpin(s, nova, 'neon', () => .001); total += r.payout; }
  assert.ok(total <= 500, `${total} ≤ 500`);
  assert.equal(s.bonusLedger[ledgerKey('nova-20')].granted, total);
  assert.equal(spinsLeft(s, nova), 0);
  assert.equal(freeSpin(s, nova, 'neon').code, 'used');
  // Winnings' wagering counts down on eligible games only.
  noteWager(s, 'gold', 25);
  assert.equal(s.bonusLedger[ledgerKey('nova-20')].wagered, 0);
  noteWager(s, 'neon', 25);
  assert.equal(s.bonusLedger[ledgerKey('nova-20')].wagered, 25);
});

test('spins used and winnings survive a reload, and offers count down', () => {
  const s = freshState(), sevens = offer('sevens-10');
  freeSpin(s, sevens, 'gold', () => .001);
  const back = loadState(JSON.stringify(s));
  assert.deepEqual(back.freeSpinsUsed, {'sevens-10': 1});
  assert.deepEqual(back.bonusLedger[ledgerKey('sevens-10')], s.bonusLedger[ledgerKey('sevens-10')]);
  const snap = source.snapshot({...playerFromState(back)});
  assert.equal(snap.freeSpins.find(o => o.id === 'sevens-10').remaining, 3);
  assert.equal(spinsLeft(back, snap.freeSpins.find(o => o.id === 'sevens-10')), 3, 'a fresh snapshot and the spin count agree (no double counting)');
  assert.match(renderCards({type: 'show-offers', kind: 'free_spins', ids: ['sevens-10']}, snap)[0].text, /Won so far: \d+ bonus credits/);
  for (let i = 0; i < 3; i++) freeSpin(back, sevens, 'gold');
  assert.equal(source.snapshot(playerFromState(back)).freeSpins.some(o => o.id === 'sevens-10'), false, 'a used-up offer leaves the list');
  assert.deepEqual(loadState(JSON.stringify({version: 1, freeSpinsUsed: {'ok': 2, 'bad id!': 3, neg: -1}, bonusLedger: {'fs:ok': {granted: 5, target: 50, wagered: 0, games: []}, 'fs:': {granted: 1}}})).freeSpinsUsed, {ok: 2});
});

test('staff: Pip stands by the Neon Arcade cabinets', () => {
  const pip = STAFF.find(x => x.id === PIP_ID);
  assert.equal(pip.room, 'neon');
  const sim = new HotelResidents(seeded(9));
  assert.equal(sim.agents.length, 20);
  assert.deepEqual([sim.get(PIP_ID).x, sim.get(PIP_ID).y], [2.5, 1.5]);
  assert.ok(pipLineCount().total > 25);
  assert.deepEqual(PERSONA.reactions, []);
});
