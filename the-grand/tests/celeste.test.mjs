import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FixtureData, assembleFixtures, playerFromState} from '../dist/data/promo.js';
import {renderCards} from '../dist/cards.js';
import {HotelResidents} from '../dist/residents.js';
import {STAFF} from '../dist/characters.js';
import {freshState, loadState} from '../dist/engine.js';
import {createWellbeing, gate, offersBlocked} from '../dist/wellbeing.js';
import {claimGrant, claimBonus, claimProblem, noteWager, loadClaims, wagerTarget} from '../dist/data/claims.js';
import {PERSONA, CELESTE_ID, createCeleste, celesteReply, celesteOpener, celesteSuggestions, celesteLineCount, matchBonus} from '../dist/personas/celeste.js';

const dir = new URL('../dist/data/fixtures/', import.meta.url);
const read = f => JSON.parse(fs.readFileSync(new URL(f, dir)));
const fixtures = assembleFixtures({terms: read('terms.json'), bonuses: read('bonuses.json'), freeSpins: read('free-spins.json'), competitions: read('competitions.json'), records: read('records.json'), banking: read('banking.json')});
const source = new FixtureData(fixtures);
// An existing (funded) player: the welcome offer is for new players, so two bonuses are open and one is locked.
const player = {id: 'p', ageVerified: true, isNew: false};
const data = source.snapshot(player);
const ctx = {data, timeZone: 'Europe/Prague'};
const seeded = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const ask = (text, mem = createCeleste(), c = ctx) => celesteReply(mem, text, c, seeded(11));
const bonus = id => data.bonuses.find(b => b.id === id);
const URGENCY = /hurry|last chance|don'?t miss|act now|only today|before it'?s gone|ending soon|quick(ly)?,|limited time/i;

test('AC: given 2 eligible bonuses, "any bonuses?" gets a one-line framing and 2 offer cards with wagering, expiry, max win and a Terms link', () => {
  const open = data.bonuses.filter(b => b.claimable);
  assert.equal(open.length, 2, 'fixture: two eligible bonuses for an existing player');
  const r = ask('any bonuses?');
  assert.equal(r.intent, 'whatBonuses');
  assert.equal((r.text.match(/[.!?](\s|$)/g) || []).length, 2, 'framing plus a pointer to the cards');
  assert.ok(!/\d+%|×|credits/.test(r.text), 'no facts in the spoken line');
  assert.deepEqual(r.action, {type: 'show-offers', kind: 'bonus', ids: open.map(b => b.id)});
  const cards = renderCards(r.action, data, {timeZone: 'Europe/Prague'});
  assert.equal(cards.length, 2);
  for (const c of cards) {
    for (const row of ['Wagering', 'Expires', 'Max win']) assert.match(c.html, new RegExp(`<dt>${row}</dt>`), row);
    assert.match(c.html, /class="card-terms" data-action="show-terms"/);
    assert.match(c.html, /SIMULATED/);
    assert.doesNotMatch(c.html, /Min deposit/, 'deposit requirements only when asked');
  }
});

test('AC: given claimable:false, asking why shows the reason from data and opens the clause card', () => {
  for (const q of ['why can’t I claim the loyalty bonus?', "why can't I get the Gold Lounge one", 'why is the loyalty bonus locked']) {
    const r = ask(q), b = bonus('loyalty-lounge');
    assert.equal(r.intent, 'notEligible', q);
    assert.ok(r.text.includes(b.notClaimableReason), `${q}: reason verbatim`);
    assert.deepEqual(r.action, {type: 'show-terms', section: b.termsRef.section, clauseId: b.termsRef.clauseId}, q);
    assert.ok(renderCards(r.action, data, {})[0].html.includes('Maximum win from bonus play'));
  }
  // A bonus that isn't in her list at all (the welcome offer, for an existing player): the clause explains who it's for.
  const w = ask("why can't I get the welcome bonus");
  assert.deepEqual(w.action, {type: 'show-terms', section: 'bonus', clauseId: 'b-4'});
});

test('AC: after "no thanks" she doesn\'t mention offers again this session unless asked', () => {
  const mem = createCeleste();
  assert.match(celesteOpener(mem, ctx).text, /2 offers open to you/, 'one unprompted mention');
  assert.doesNotMatch(celesteOpener(mem, ctx).text, /offer/, 'only once per session');
  const fresh = createCeleste();
  const r = ask('no thanks', fresh);
  assert.equal(r.intent, 'noThanks');
  assert.equal(r.action, null);
  assert.doesNotMatch(celesteOpener(fresh, ctx).text, /offer/);
  assert.ok(!celesteSuggestions(fresh, ctx).some(c => /bonus|offer|claim/i.test(c)), 'chips don\'t offer either');
  for (const q of ['hello', 'who are you?', 'thanks', 'marmalade', 'what is wagering?']) {
    const x = ask(q, fresh);
    assert.ok(!x.action || x.action.type === 'show-terms', `${q}: no offer cards`);
  }
  const asked = ask('any bonuses?', fresh);
  assert.equal(asked.action.type, 'show-offers', 'asking still works');
});

test('she never recommends a bonus, and never calls one free money', () => {
  for (const q of ["what's the best bonus for me", 'which one should I take', 'what would you pick', 'is the reload worth it']) {
    const r = ask(q);
    assert.equal(r.intent, 'recommend', q);
    assert.match(r.text, /not for me to say/);
    assert.doesNotMatch(r.text, /\b(best|recommend|go for)\b/i);
  }
  const lines = JSON.stringify(PERSONA.intents.map(i => i.responses.map(r => (typeof r === 'string' ? r : typeof r.text === 'string' ? r.text : r.text.toString()))));
  assert.doesNotMatch(lines, /free money|best (bonus|offer|one) for you|you should (take|claim)/i);
  assert.doesNotMatch(lines, URGENCY);
});

test('explain, wagering, expiry and deposit answers read from data', () => {
  const mem = createCeleste();
  const e = ask('how does the weekend reload work', mem), b = bonus('weekend-reload');
  assert.equal(e.intent, 'explainBonus');
  assert.ok(e.text.startsWith(b.summary), 'summary verbatim');
  assert.match(e.text, /Wagering 30× the bonus, max win 1,000 credits/);
  assert.deepEqual(e.action, {type: 'show-terms', section: 'bonus', clauseId: 'b-1'});
  const w = ask("what's the wagering on it", mem);
  assert.equal(w.intent, 'wagering');
  assert.match(w.text, /Weekend reload: 30× the bonus/);
  const x = ask('when does it end', mem);
  assert.equal(x.intent, 'expiry');
  assert.ok(x.text.includes(new Date(b.expiresAt).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Prague'})), 'date in the player\'s time zone');
  const d = ask('do I need to deposit for it?', mem);
  assert.equal(d.intent, 'depositRule');
  assert.equal(d.text, 'Weekend reload applies to a top-up of at least 20 credits.');
  assert.doesNotMatch(d.text, /\b(now|today|go ahead|why not|should)\b/i, 'stated neutrally');
  const cash = ask('does the sunday cashback need a deposit');
  assert.equal(cash.text, 'Sunday cashback doesn’t need a top-up.');
});

test('a deposit requirement is never described unless asked', () => {
  const mem = createCeleste();
  const unprompted = [celesteOpener(mem, ctx), ...['hello', 'any bonuses?', 'tell me about the weekend reload', 'claim it', 'when does it end', 'what is wagering?', 'thanks'].map(q => ask(q, mem))];
  // Summaries are marketing's data and may mention a top-up; her own words never raise a requirement.
  for (const r of unprompted) assert.doesNotMatch(r.text.replace(bonus('weekend-reload').summary, ''), /\b(deposit|top[- ]?up|minimum)\b/i, r.text);
});

test('claiming asks which one when it could be several, and claim chips carry the action', () => {
  const mem = createCeleste();
  const r = ask('claim one', mem);
  assert.equal(r.action, null);
  assert.deepEqual(celesteSuggestions(mem, ctx), ['Claim Weekend reload', 'Claim Sunday cashback']);
  const c = ask('Claim Sunday cashback', mem);
  assert.deepEqual(c.action, {type: 'open-claim', kind: 'bonus', id: 'sunday-cashback'});
  const locked = ask('claim the loyalty bonus');
  assert.match(locked.text, /can’t be claimed yet: Unlocks after 25 rounds/);
  assert.notEqual(locked.action?.type, 'open-claim');
});

test('held-out intent accuracy is at least 90%', () => {
  // Written before the first run and not tuned against.
  const HELD_OUT = [
    ['got any offers for me?', 'whatBonuses'], ['what promotions are running', 'whatBonuses'], ['show me the bonuses', 'whatBonuses'], ['are there any deals tonight', 'whatBonuses'], ['offers?', 'whatBonuses'],
    ['explain the sunday cashback', 'explainBonus'], ['tell me more about the reload', 'explainBonus'], ['how does the cashback work', 'explainBonus'], ["what's the catch with the reload", 'explainBonus'], ['more details on the cashback please', 'explainBonus'],
    ['what does wagering mean', 'wagering'], ['how many times do I have to play it through', 'wagering'], ['playthrough on the cashback?', 'wagering'], ["what's the rollover", 'wagering'], ['wagering requirements', 'wagering'],
    ["I'll take the reload", 'claim'], ['claim the cashback please', 'claim'], ['sign me up for the weekend one', 'claim'], ['redeem it', 'claim'], ['yes please, the reload', 'claim'],
    ['when does the reload expire', 'expiry'], ['how long do I have to use the cashback', 'expiry'], ["what's the deadline", 'expiry'], ['when does the weekend one end', 'expiry'], ['how much time left on the cashback', 'expiry'],
    ["why can't I have the loyalty one", 'notEligible'], ['why is the gold lounge bonus not available', 'notEligible'], ['how do I unlock the loyalty bonus', 'notEligible'], ["the loyalty bonus says it's locked", 'notEligible'], ['why am I not eligible for the welcome offer', 'notEligible'],
    ['no thanks', 'noThanks'], ["I'm not interested", 'noThanks'], ["don't want any offers", 'noThanks'], ['nah', 'noThanks'], ['not tonight', 'noThanks'],
    ['which bonus is the best', 'recommend'], ['what do you recommend', 'recommend'], ['is the cashback a good deal', 'recommend'],
    ['do I have to top up for the reload', 'depositRule'], ['is there a minimum deposit on the reload', 'depositRule'],
  ];
  const misses = [];
  for (const [text, want] of HELD_OUT) { const got = ask(text).intent; if (got !== want) misses.push(`${text} → ${got} (wanted ${want})`); }
  const acc = 1 - misses.length / HELD_OUT.length;
  console.log(`Celeste held-out intent accuracy: ${(acc * 100).toFixed(1)}% (${HELD_OUT.length - misses.length}/${HELD_OUT.length})${misses.length ? '\n  ' + misses.join('\n  ') : ''}`);
  assert.ok(acc >= .9, misses.join('\n'));
});

test('AC fuzz: 2,000 inputs, no urgency language, and no offers at all after a distress signal', () => {
  const vocab = ('any bonus bonuses offers claim it take reload cashback loyalty welcome weekend sunday wagering playthrough expire end when why ' +
    "can't locked best recommend deposit top up no thanks hello who are you hurry win money back lost everything chase need it the a please now tonight free spins cash").split(' ');
  const rng = seeded(99);
  const words = () => Array.from({length: 1 + Math.floor(rng() * 8)}, () => vocab[Math.floor(rng() * vocab.length)]).join(' ');
  // Before any signal: urgency never, offers only when asked.
  const mem = createCeleste();
  for (let i = 0; i < 1000; i++) { const t = words(), r = celesteReply(mem, t, ctx, rng); assert.doesNotMatch(r.text, URGENCY, t); }
  // After a distress signal, run every input through the gate first, as the app does.
  const wb = createWellbeing(), p = playerFromState(freshState());
  assert.ok(gate('I need to win my money back', wb, p).signal);
  const after = createCeleste();
  const blockedCtx = () => ({...ctx, offersBlocked: offersBlocked(wb, p)});
  assert.doesNotMatch(celesteOpener(after, blockedCtx()).text, /offer/, 'no unprompted mention');
  for (let i = 0; i < 1000; i++) {
    const t = words();
    if (gate(t, wb, p).signal) continue; // the gate answered instead
    const r = celesteReply(after, t, blockedCtx(), rng);
    assert.doesNotMatch(r.text, URGENCY, t);
    assert.ok(!r.action || !['show-offers', 'open-claim'].includes(r.action.type), `${t}: no offer actions after distress`);
    assert.ok(!celesteSuggestions(after, blockedCtx()).some(c => /claim|any bonuses/i.test(c)), 'no offer chips');
  }
});

test('explainability: every reply records intent, p, via and dataIds that exist', () => {
  const ids = new Set([...data.bonuses.map(b => b.id), ...Object.values(data.terms).flat().map(c => c.clauseId)]);
  const mem = createCeleste();
  for (const q of ['any bonuses?', 'tell me about the reload', 'claim it', 'why is the loyalty bonus locked', 'what is wagering', 'marmalade']) {
    const r = ask(q, mem);
    for (const k of ['intent', 'p', 'via']) assert.ok(r[k] !== undefined, `${q}: ${k}`);
    for (const id of r.dataIds) assert.ok(ids.has(id), `${q}: ${id}`);
  }
});

test('bonus matching: names, kinds and "it"', () => {
  const list = data.bonuses;
  assert.equal(matchBonus('the cashback', list).bonus.id, 'sunday-cashback');
  assert.equal(matchBonus('weekend one', list).bonus.id, 'weekend-reload');
  assert.equal(matchBonus('gold lounge', list).bonus.id, 'loyalty-lounge');
  assert.equal(matchBonus('that one', list, 'weekend-reload').bonus.id, 'weekend-reload');
  assert.ok(matchBonus('the bonus', list).many, '"bonus" alone names none of them');
});

// ---------- Simulated claims ----------

test('claims grant fictional bonus credits, once, with a wagering requirement', () => {
  const s = freshState(), reload = bonus('weekend-reload'), loyalty = bonus('loyalty-lounge'), cash = bonus('sunday-cashback');
  assert.equal(claimGrant(reload), 200, 'percentage bonus: the simulated top-up grants the cap');
  assert.equal(claimGrant({value: {amount: 50, currency: 'credits'}}), 50, 'fixed value');
  assert.equal(wagerTarget(reload), 6000);
  const before = s.credits, r = claimBonus(s, reload);
  assert.deepEqual([r.ok, r.grant, r.target], [true, 200, 6000]);
  assert.equal(s.credits, before + 200);
  assert.deepEqual(s.bonusLedger['weekend-reload'].games, ['Grand Sevens']);
  assert.deepEqual(claimBonus(s, reload), {ok: false, reason: 'claimed'});
  assert.equal(claimBonus(s, loyalty).reason, 'not-claimable');
  assert.equal(claimProblem(s, {...cash, expiresAt: '2000-01-01T00:00:00Z'}), 'expired');
  // Wagering counts only on the bonus's games, and stops at the target.
  assert.deepEqual(noteWager(s, 'neon', 25), []);
  assert.deepEqual(noteWager(s, 'gold', 25), ['weekend-reload']);
  assert.equal(s.bonusLedger['weekend-reload'].wagered, 25);
  for (let i = 0; i < 400; i++) noteWager(s, 'gold', 25);
  assert.equal(s.bonusLedger['weekend-reload'].wagered, 6000);
});

test('claims survive a reload and junk is dropped', () => {
  const s = freshState();
  claimBonus(s, bonus('weekend-reload'));
  noteWager(s, 'gold', 25);
  const back = loadState(JSON.stringify(s));
  assert.ok(back.claimed['weekend-reload']);
  assert.deepEqual(back.bonusLedger['weekend-reload'], s.bonusLedger['weekend-reload']);
  const junk = loadClaims({claimed: {'ok-id': '2026-10-01T00:00:00Z', 'bad id!': 'x', 'no-date': 'nope'}, bonusLedger: {'ok-id': {granted: 50, target: 100, wagered: 900, games: ['Grand Sevens', 7]}, 'unclaimed': {granted: 1, target: 1, wagered: 0, games: []}}});
  assert.deepEqual(Object.keys(junk.claimed), ['ok-id']);
  assert.deepEqual(junk.bonusLedger, {'ok-id': {granted: 50, target: 100, wagered: 100, games: ['Grand Sevens'], claimedAt: 0}});
  assert.deepEqual(loadState('{"version":1}').claimed, {}, 'old saves load with no claims');
});

test('claim cards: what the claim grants, then Claimed with wagering progress', () => {
  const s = freshState();
  const view = () => source.snapshot({...playerFromState(s), isNew: false});
  const panel = renderCards({type: 'open-claim', kind: 'bonus', id: 'weekend-reload'}, view())[0];
  assert.match(panel.text, /You get: 200 fictional bonus credits/);
  assert.match(panel.text, /Wagering: 6,000 credits on Grand Sevens/);
  assert.match(panel.html, /data-action="claim-confirm" data-id="weekend-reload"/);
  assert.match(panel.html, /SIMULATED/);
  const offer = () => renderCards({type: 'show-offers', kind: 'bonus', ids: ['weekend-reload']}, view())[0];
  assert.match(offer().html, /data-action="claim-open"/);
  claimBonus(s, view().bonuses.find(b => b.id === 'weekend-reload'));
  noteWager(s, 'gold', 25);
  assert.doesNotMatch(offer().html, /claim-open/, 'no claim button once claimed');
  assert.match(offer().text, /Status: Claimed/);
  assert.match(offer().text, /Wagering progress: 25 of 6,000 credits/);
  assert.match(renderCards({type: 'open-claim', kind: 'bonus', id: 'weekend-reload'}, view())[0].text, /Already claimed/);
  assert.doesNotMatch(renderCards({type: 'show-offers', kind: 'bonus', ids: ['loyalty-lounge']}, view())[0].html, /claim-open/, 'no claim button on a locked offer');
});

test('staff: Celeste stands behind the lobby concierge desk, alongside the five residents', () => {
  const c = STAFF.find(x => x.id === CELESTE_ID);
  assert.equal(c.room, 'lobby');
  const sim = new HotelResidents(seeded(5));
  assert.equal(sim.agents.length, 20);
  assert.deepEqual([sim.get(CELESTE_ID).x, sim.get(CELESTE_ID).y], [1.5, .5]);
  assert.ok(celesteLineCount().total > 25);
  assert.deepEqual(PERSONA.reactions, []);
});
