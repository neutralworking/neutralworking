import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FixtureData, assembleFixtures, playerFromState} from '../dist/data/promo.js';
import {renderCards} from '../dist/cards.js';
import {HotelResidents} from '../dist/residents.js';
import {STAFF} from '../dist/characters.js';
import {freshState, loadState} from '../dist/engine.js';
import {createWellbeing, offersBlocked} from '../dist/wellbeing.js';
import {LIMIT_OPTIONS, RAISE_DELAY_MS, setLossLimit, lossLimit, noteResult, limitReached, wouldExceed, lostToday, dayKey, loadLimits} from '../dist/data/limits.js';
import {PERSONA, HOLLIS_ID, createHollis, hollisReply, hollisOpener, hollisSuggestions, hollisLineCount} from '../dist/personas/hollis.js';

const dir = new URL('../dist/data/fixtures/', import.meta.url);
const read = f => JSON.parse(fs.readFileSync(new URL(f, dir)));
const fixtures = assembleFixtures({terms: read('terms.json'), bonuses: read('bonuses.json'), freeSpins: read('free-spins.json'), competitions: read('competitions.json'), records: read('records.json'), banking: read('banking.json')});
const data = new FixtureData(fixtures).snapshot({id: 'p', ageVerified: true});
const ctx = {data};
const b = data.banking;
const seeded = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const ask = (text, mem = createHollis(), c = ctx) => hollisReply(mem, text, c, seeded(19));
// Anything that pushes a deposit, or ties one to an offer.
const DEPOSIT_PUSH = /\bdeposit (now|today|more|again)\b|\btop[- ]?up (now|today|more|again)\b|\bwhy not (deposit|top up|add)\b|\badd (more )?(funds|money|credits)\b|\bboost your\b|\bget started\b|\b(bonus|offer|free spins?|reward)\b.{0,40}\bdeposit\b|\bdeposit\b.{0,40}\b(bonus|offer|free spins?|reward|unlock)\b|\bdon'?t miss\b|\bhurry\b|\bin seconds\b/i;
const FORM = /<(form|input|select)\b|\bcard number\b|\bcvv\b|\bcvc\b|\bexpiry date\b|\bsort code\b|\biban\b/i;

test('AC: "how long do withdrawals take?" gives processing times per method from data, and no deposit prompt anywhere', () => {
  const r = ask('How long do withdrawals take?');
  assert.equal(r.intent, 'processingTimes');
  for (const m of b.withdrawalMethods) assert.ok(r.text.toLowerCase().includes(`${m.label.toLowerCase()}: ${m.processing.toLowerCase()}`), m.label);
  assert.deepEqual(r.action, {type: 'open-cashier-info', view: 'withdraw'});
  const cards = renderCards(r.action, data, {});
  const everything = [r.text, ...cards.map(c => c.html + c.text)].join(' ');
  assert.doesNotMatch(everything, /deposit/i, 'no deposit anything in the reply or the cards');
  assert.doesNotMatch(everything, FORM, 'no payment form');
  for (const m of b.withdrawalMethods) assert.ok(cards[0].text.includes(m.processing), `card: ${m.label}`);
});

test('AC: "set a limit" opens the safer-play limits panel', () => {
  for (const q of ['Set a limit', 'I want to set a deposit limit', 'can you put a limit on my spending', 'lower my limit']) {
    const r = ask(q);
    assert.equal(r.intent, 'setLimit', q);
    assert.deepEqual(r.action, {type: 'open-safer-play', reason: 'limits', view: 'limits'}, q);
  }
  const [c] = renderCards({type: 'open-safer-play', reason: 'limits', view: 'limits'}, data, {limits: {limit: 300, pending: null, lost: 75}});
  assert.match(c.text, /SAFER PLAY · LIMITS: Daily loss limit\./);
  assert.match(c.text, /Your limit: 300 credits a day\./);
  assert.match(c.text, /Lost today: 75 credits\./);
  for (const v of LIMIT_OPTIONS) assert.match(c.html, new RegExp(`data-action="set-limit" data-amount="${v}"`));
  assert.match(c.html, /data-amount="none"/);
  assert.match(c.html, /data-amount="300" aria-pressed="true"/);
});

test('"how do I deposit?" is answered with method facts only', () => {
  const r = ask('how do I deposit?');
  assert.equal(r.intent, 'depositMethods');
  const facts = b.depositMethods.map(m => `${m.min.amount.toLocaleString('en-GB')} credits to ${m.max.amount.toLocaleString('en-GB')} credits, ${m.processing.toLowerCase()}`);
  for (const f of facts) assert.ok(r.text.includes(f), f);
  assert.equal(r.text.replace(/Deposit methods\. |Card|bank transfer|: |; |\.$/g, '').replace(facts[0], '').replace(facts[1], '').trim(), '', 'nothing but the method facts');
  assert.doesNotMatch(r.text, DEPOSIT_PUSH);
  assert.deepEqual(r.action, {type: 'open-cashier-info', view: 'deposit'});
});

test('reversal states the rule from data and never encourages it', () => {
  const r = ask('can I cancel my withdrawal?');
  assert.equal(r.intent, 'reverseWithdrawal');
  assert.equal(r.text, 'Withdrawals can’t be reversed once requested.');
  const allowed = ask('can I reverse a withdrawal', createHollis(), {data: {...data, banking: {...b, reversalAllowed: true}}});
  assert.equal(allowed.text, 'A withdrawal can be reversed during its 24 hours pending period.');
  assert.doesNotMatch(allowed.text, /\b(you should|why not|keep playing|play on|instead)\b/i);
});

test('facts: verification, pending, limits and fees read from data; unlisted fees are not called free', () => {
  assert.equal(ask('what ID do you need?').text, `${b.verification.when}, you’ll need to verify: Photo ID and Proof of address.`);
  assert.equal(ask('why is my withdrawal pending').text, 'Withdrawals stay pending for 24 hours before processing starts.');
  assert.equal(ask('what are the limits').text, 'Account limits: 1,000 credits daily, 5,000 credits weekly and 15,000 credits monthly. You can set your own limits too.');
  assert.equal(ask('are there fees?').text, 'Withdrawal fees. Bank transfer: none. No fee is listed for card.');
  assert.equal(ask('any fees on deposits').text, 'Deposit fees. None are listed.');
});

test('he never takes payment details, and never ties a deposit to an offer', () => {
  for (const q of ['my card number is 4111 1111 1111 1111', 'cvv is 123', 'here are my card details: 4111-1111-1111-1111']) {
    const r = ask(q);
    assert.equal(r.intent, 'paymentDetails', q);
    assert.doesNotMatch(r.text, /4111|123/, 'never repeated back');
    assert.equal(r.action, null);
  }
  for (const q of ['is there a bonus if I deposit?', 'do I get free spins for depositing', 'deposit bonus?']) {
    const r = ask(q);
    assert.equal(r.intent, 'offers', q);
    assert.equal(r.text, 'I only handle banking rules, I’m afraid.');
    assert.equal(r.action, null);
  }
  assert.ok(!hollisSuggestions().some(c => /deposit/i.test(c)), 'deposits are answered when asked, never suggested');
  assert.doesNotMatch(hollisOpener().text, /deposit|money|bonus|offer/i);
});

test('held-out intent accuracy is at least 90%', () => {
  // Written before the first run and not tuned against.
  const HELD_OUT = [
    ['what ways can I deposit', 'depositMethods'], ['can I pay in by card', 'depositMethods'], ['how do I top up', 'depositMethods'], ['deposit options?', 'depositMethods'],
    ['how do I withdraw my winnings', 'withdrawalMethods'], ['what are the withdrawal methods', 'withdrawalMethods'], ['how can I cash out', 'withdrawalMethods'], ['get my money out', 'withdrawalMethods'],
    ['how fast are withdrawals', 'processingTimes'], ['when will I get my money', 'processingTimes'], ['how long does a bank transfer take to arrive', 'processingTimes'], ['processing times?', 'processingTimes'],
    ['do you charge fees', 'fees'], ['is there a fee for bank transfers', 'fees'], ['does it cost anything to withdraw', 'fees'],
    ['what is the maximum withdrawal', 'limits'], ['how much can I withdraw in a day', 'limits'], ['weekly limits?', 'limits'],
    ['why do you need my passport', 'verification'], ['what documents do I need', 'verification'], ['do I have to verify my identity', 'verification'], ['kyc?', 'verification'],
    ['my withdrawal is stuck', 'pendingWithdrawal'], ['where is my cash out', 'pendingWithdrawal'], ['how long does it stay pending', 'pendingWithdrawal'],
    ['can I undo a withdrawal', 'reverseWithdrawal'], ['I changed my mind about my withdrawal', 'reverseWithdrawal'], ['is withdrawal reversal allowed', 'reverseWithdrawal'],
    ['I want to limit my spending', 'setLimit'], ['set a daily loss limit', 'setLimit'], ['stop me from spending too much', 'setLimit'], ['change my limits', 'setLimit'],
    ['banking terms', 'bankingTerms'], ['small print on withdrawals', ['bankingTerms', 'withdrawalMethods']],
    ['who are you?', 'who'], ['hello', 'greet'],
    ['any deposit bonus', 'offers'], ['my card number is 5500 0000 0000 0004', 'paymentDetails'],
    ['what payment methods do you take', 'depositMethods'], ['take my winnings out', 'withdrawalMethods'],
  ];
  const misses = [];
  for (const [text, want] of HELD_OUT) { const got = ask(text).intent; if (![want].flat().includes(got)) misses.push(`${text} → ${got} (wanted ${[want].flat().join(' or ')})`); }
  const acc = 1 - misses.length / HELD_OUT.length;
  console.log(`Hollis held-out intent accuracy: ${(acc * 100).toFixed(1)}% (${HELD_OUT.length - misses.length}/${HELD_OUT.length})${misses.length ? '\n  ' + misses.join('\n  ') : ''}`);
  assert.ok(acc >= .9, misses.join('\n'));
});

test('AC fuzz: 2,000 inputs, no deposit encouragement and no payment form in any reply or card', () => {
  const vocab = ('deposit withdraw cash out top up bonus offer free spins how long fees limit verify id pending cancel reverse money card bank ' +
    'transfer now more please want need quick fast payment details 4111 1111 1111 1111 terms hello who boost add funds credits').split(' ');
  const rng = seeded(41), mem = createHollis();
  for (let i = 0; i < 2000; i++) {
    const t = Array.from({length: 1 + Math.floor(rng() * 8)}, () => vocab[Math.floor(rng() * vocab.length)]).join(' ');
    const r = hollisReply(mem, t, ctx, rng);
    assert.doesNotMatch(r.text, DEPOSIT_PUSH, t);
    assert.doesNotMatch(r.text, /\d{4}[ -]?\d{4}[ -]?\d{4}/, `${t}: never repeats a card number`);
    const cards = r.action ? renderCards(r.action, data, {limits: {limit: null, pending: null, lost: 0}}) : [];
    for (const c of cards) { assert.doesNotMatch(c.html, FORM, `${t}: card`); assert.doesNotMatch(c.text, DEPOSIT_PUSH, `${t}: card`); }
    assert.ok(!r.action || ['open-cashier-info', 'open-safer-play', 'show-terms'].includes(r.action.type), `${t}: read-only actions only`);
  }
  const lines = JSON.stringify(PERSONA.intents.map(i => i.responses.map(r => (typeof r === 'string' ? r : typeof r.text === 'string' ? r.text : r.text.toString()))));
  assert.doesNotMatch(lines, DEPOSIT_PUSH);
});

test('explainability: every reply records intent, p, via and dataIds', () => {
  const mem = createHollis();
  for (const q of ['how long do withdrawals take', 'set a limit', 'my card number is 4111 1111 1111 1111', 'marmalade']) {
    const r = ask(q, mem);
    for (const k of ['intent', 'p', 'via']) assert.ok(r[k] !== undefined, `${q}: ${k}`);
    assert.ok(Array.isArray(r.dataIds));
  }
  assert.equal(ask('fees', createHollis(), {data: null}).text, 'The cashier’s ledger hasn’t come up yet. Try me again shortly.');
});

// ---------- Limits ----------

test('limits: lowering works now, raising or removing waits 24 hours', () => {
  const s = freshState(), t0 = Date.parse('2026-10-17T10:00:00Z');
  assert.equal(lossLimit(s, t0), null);
  assert.deepEqual(setLossLimit(s, 750, t0), {applied: 'now'});
  assert.deepEqual(setLossLimit(s, 300, t0), {applied: 'now'}, 'lowering is immediate');
  assert.equal(lossLimit(s, t0), 300);
  assert.deepEqual(setLossLimit(s, 1500, t0), {applied: 'later', at: t0 + RAISE_DELAY_MS});
  assert.equal(lossLimit(s, t0 + RAISE_DELAY_MS - 1), 300, 'the old limit holds until the wait is over');
  assert.equal(lossLimit(s, t0 + RAISE_DELAY_MS), 1500);
  setLossLimit(s, null, t0 + RAISE_DELAY_MS);
  assert.equal(lossLimit(s, t0 + RAISE_DELAY_MS + 1), 1500, 'removing waits too');
  assert.equal(lossLimit(s, t0 + 2 * RAISE_DELAY_MS), null);
  assert.equal(setLossLimit(s, 123, t0).applied, 'invalid');
});

test('limits: daily losses, the stop, the next day, offers paused, and reload', () => {
  const s = freshState(), t0 = Date.parse('2026-10-17T10:00:00Z');
  setLossLimit(s, 150, t0); // two 75-credit spins
  noteResult(s, -75, t0, 'UTC');
  assert.equal(lostToday(s, t0, 'UTC'), 75);
  assert.equal(wouldExceed(s, 75, t0, 'UTC'), false, 'a spin that would land exactly on the limit is allowed');
  assert.equal(noteResult(s, 50, t0, 'UTC'), false, 'a win offsets losses');
  assert.equal(lostToday(s, t0, 'UTC'), 25);
  noteResult(s, -75, t0, 'UTC');
  assert.equal(wouldExceed(s, 75, t0, 'UTC'), true, '100 lost: another spin could pass 150');
  noteResult(s, -75, t0, 'UTC');
  assert.equal(limitReached(s, t0, 'UTC'), true);
  const p = playerFromState(s, t0);
  assert.equal(p.limitsReached, limitReached(s, t0), 'the player context sees it');
  if (dayKey(t0) === dayKey(t0, 'UTC')) assert.equal(offersBlocked(createWellbeing(), p, t0), 'limit-reached', 'offers pause');
  assert.equal(limitReached(s, t0 + 864e5, 'UTC'), false, 'a new day starts fresh');
  const back = loadState(JSON.stringify(s));
  assert.equal(back.lossLimit, 150);
  assert.deepEqual(back.dayNet, s.dayNet);
  assert.deepEqual(loadLimits({lossLimit: -7, pendingLossLimit: {amount: 'x', at: 1}, dayNet: {day: 'x', net: 1}}), {lossLimit: null, pendingLossLimit: null, dayNet: null});
  // A limit set before the options changed (e.g. 100) is kept exactly; moving to 150 counts as raising it.
  const legacy = loadState(JSON.stringify({version: 1, lossLimit: 100}));
  assert.equal(legacy.lossLimit, 100);
  assert.equal(setLossLimit(legacy, 150, t0).applied, 'later', 'never loosened straight away');
});

test('staff: Hollis stands at the lobby cashier window', () => {
  const h = STAFF.find(x => x.id === HOLLIS_ID);
  assert.equal(h.room, 'lobby');
  const sim = new HotelResidents(seeded(23));
  assert.equal(sim.agents.length, 20);
  assert.deepEqual([sim.get(HOLLIS_ID).x, sim.get(HOLLIS_ID).y], [7.5, 3.5]);
  assert.ok(hollisLineCount().total > 20);
  assert.deepEqual(PERSONA.reactions, []);
});
