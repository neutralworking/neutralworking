import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FixtureData, assembleFixtures} from '../dist/data/promo.js';
import {renderCards} from '../dist/cards.js';
import {HotelResidents} from '../dist/residents.js';
import {RESIDENTS, STAFF, personById} from '../dist/characters.js';
import {PERSONA, PENROSE_ID, END, createPenrose, penroseReply, penroseOpener, penroseSuggestions, penroseFocus, penroseLineCount, matchClause} from '../dist/personas/penrose.js';

const dir = new URL('../dist/data/fixtures/', import.meta.url);
const read = f => JSON.parse(fs.readFileSync(new URL(f, dir)));
const fixtures = assembleFixtures({terms: read('terms.json'), bonuses: read('bonuses.json'), freeSpins: read('free-spins.json'), competitions: read('competitions.json'), records: read('records.json'), banking: read('banking.json')});
const data = new FixtureData(fixtures).snapshot({id: 'p', ageVerified: true});
const ctx = {data, timeZone: 'Europe/London'};
const CLAUSES = Object.values(data.terms).flat();
const clause = id => CLAUSES.find(c => c.clauseId === id);
const seeded = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const ask = (text, mem = createPenrose(), c = ctx) => penroseReply(mem, text, c, seeded(7));
const cardFor = r => renderCards(r.action, data, {timeZone: 'Europe/London', from: 'penrose'})[0];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

test('AC: "what\'s the wagering on free spins?" quotes the free_spins clause verbatim, with a link and version date', () => {
  const r = ask("what's the wagering on free spins?");
  assert.equal(r.intent, 'freeSpinTerms');
  assert.deepEqual(r.action, {type: 'show-terms', section: 'free_spins', clauseId: 'fs-2'});
  assert.deepEqual(r.dataIds, ['fs-2']);
  const card = cardFor(r), c = clause('fs-2');
  assert.ok(card.html.includes(`<p class="card-body">${esc(c.text)}</p>`), 'clause text verbatim');
  assert.match(card.html, /href="terms\.html#fs-2"/);
  assert.match(card.html, /Read the full terms/);
  assert.match(card.html, /0\.3 · updated 1 Oct 2026/);
  assert.ok(!r.text.includes(c.text), 'the spoken line is framing; the clause lives on the card');
});

test('AC: when two clauses match equally, the top 3 headings are offered as chips', () => {
  const terms = {bonus: [
    {section: 'bonus', clauseId: 'x-1', heading: 'Wagering on deposits', text: 'Alpha.', url: 't#x-1', version: '1', updatedAt: '2026-10-01T00:00:00Z'},
    {section: 'bonus', clauseId: 'x-2', heading: 'Wagering on cashback', text: 'Beta.', url: 't#x-2', version: '1', updatedAt: '2026-10-01T00:00:00Z'},
    {section: 'bonus', clauseId: 'x-3', heading: 'Expiry', text: 'Gamma.', url: 't#x-3', version: '1', updatedAt: '2026-10-01T00:00:00Z'},
    {section: 'bonus', clauseId: 'x-4', heading: 'Eligibility', text: 'Delta.', url: 't#x-4', version: '1', updatedAt: '2026-10-01T00:00:00Z'},
  ]};
  const mem = createPenrose();
  const r = ask('how does bonus wagering work', mem, {data: {terms}});
  assert.equal(r.action, null, 'no clause is guessed');
  const chips = penroseSuggestions(mem);
  assert.equal(chips.length, 3);
  assert.ok(chips.includes('Wagering on deposits') && chips.includes('Wagering on cashback'), 'both tied headings offered');
  assert.deepEqual(r.dataIds.slice(0, 2).sort(), ['x-1', 'x-2']);
  // Picking a chip reads that clause.
  const pick = ask('Wagering on cashback', mem, {data: {terms}});
  assert.deepEqual(pick.action, {type: 'show-terms', section: 'bonus', clauseId: 'x-2'});
});

test('every clause heading, sent as a chip, reads exactly that clause', () => {
  for (const c of CLAUSES) {
    const r = ask(c.heading);
    assert.deepEqual(r.action, {type: 'show-terms', section: c.section, clauseId: c.clauseId}, c.heading);
  }
});

// Written before the first run and not tuned against: phrasings that appear nowhere in the persona.
// A few genuinely sit between two intents; both are accepted there.
const HELD_OUT = [
  ['rules on free spins', 'freeSpinTerms'], ['do my spins expire?', 'freeSpinTerms'], ['which games can I use the free spins on', 'freeSpinTerms'],
  ['what happens to winnings from spins', 'freeSpinTerms'], ['free spin small print', 'freeSpinTerms'], ['is there a limit on what I can win with spins', 'freeSpinTerms'],
  ['how does bonus wagering work', 'bonusTerms'], ['when does a bonus run out', 'bonusTerms'], ["what's the cap on bonus winnings", 'bonusTerms'],
  ['can I get the welcome offer twice', 'bonusTerms'], ['bonus rules please', 'bonusTerms'], ['tell me about the cashback terms', 'bonusTerms'],
  ['how are ties decided in tournaments', 'competitionTerms'], ['do I have to opt in to the leaderboard', 'competitionTerms'], ['when are prizes paid out', 'competitionTerms'],
  ['competition rules', 'competitionTerms'], ['how is the race scored', 'competitionTerms'], ['are tournament results anonymous', 'competitionTerms'],
  ['how long does a withdrawal take', 'bankingTerms'], ['can I cancel a withdrawal', 'bankingTerms'], ['what ID do you need before I cash out', 'bankingTerms'],
  ['deposit rules', 'bankingTerms'], ['is there a pending period on withdrawals', 'bankingTerms'], ['banking terms', 'bankingTerms'],
  ['how do I self-exclude', 'responsibleGambling'], ['can I set a deposit limit', 'responsibleGambling'], ["I'd like to take a break, what are the rules", 'responsibleGambling'],
  ['safer gambling terms', 'responsibleGambling'], ['do people on a cool off still get offers', 'responsibleGambling'], ['responsible gambling', 'responsibleGambling'],
  ['what do you do with my data', 'privacy'], ['privacy policy', 'privacy'], ['where is my progress stored', 'privacy'],
  ['can I delete my data', 'privacy'], ['do you use cookies', 'privacy'], ['personal data', 'privacy'],
  ['have the terms changed recently', 'whatChanged'], ["what's the latest version", 'whatChanged'], ['when were these last updated', 'whatChanged'],
  ['anything new in the terms', 'whatChanged'], ['which version is this', 'whatChanged'], ['are these terms up to date', 'whatChanged'],
  ['can you put that simply', 'plainEnglish'], ['say it in normal words', 'plainEnglish'], ['what does that mean?', 'plainEnglish'],
  ['give me the short version', 'plainEnglish'], ["explain it like I'm five", 'plainEnglish'], ['in plain words please', 'plainEnglish'],
  ['is the money real?', 'findClause'], ["what's the minimum age", 'findClause'], ['how are scores calculated', ['findClause', 'competitionTerms']],
  ["what's the max you can win", 'findClause'], ['who can get the welcome offer', ['bonusTerms', 'findClause']], ['do I need to prove my address', ['findClause', 'bankingTerms']],
  ['will I lose my bonus if I log out', 'myCase'], ['am I eligible for the welcome offer', 'myCase'], ['does this apply to me', 'myCase'],
  ['in my case, would the cap apply', 'myCase'], ['will I get my prize', 'myCase'],
];

test('held-out intent accuracy is at least 90%', () => {
  const misses = [];
  for (const [text, want] of HELD_OUT) {
    const got = ask(text).intent, ok = [want].flat().includes(got);
    if (!ok) misses.push(`${text} → ${got} (wanted ${[want].flat().join(' or ')})`);
  }
  const acc = 1 - misses.length / HELD_OUT.length;
  console.log(`Penrose held-out intent accuracy: ${(acc * 100).toFixed(1)}% (${HELD_OUT.length - misses.length}/${HELD_OUT.length})${misses.length ? '\n  ' + misses.join('\n  ') : ''}`);
  assert.ok(acc >= .9, misses.join('\n'));
});

test('plainEnglish: the clause\'s authored one-sentence summary, ending with the house line, and the clause beside it', () => {
  const mem = createPenrose();
  ask('can I cancel a withdrawal', mem);
  const r = ask('in plain English?', mem);
  assert.equal(r.intent, 'plainEnglish');
  assert.equal(r.text, `${clause('k-3').plain} ${END}`);
  assert.ok(r.text.endsWith('The clause itself is the one that counts.'));
  assert.deepEqual(r.action, {type: 'show-terms', section: 'banking', clauseId: 'k-3'}, 'the clause itself is shown too');
  const cold = ask('in plain English?');
  assert.equal(cold.action, null);
  assert.match(cold.text, /which clause/i);
  // A clause without an authored summary: he won't improvise one.
  const terms = {bonus: [{section: 'bonus', clauseId: 'z', heading: 'Odd one', text: 'Text.', url: 't#z', version: '1', updatedAt: '2026-10-01T00:00:00Z'}]};
  const m2 = createPenrose();
  ask('Odd one', m2, {data: {terms}});
  const none = ask('simpler please', m2, {data: {terms}});
  assert.match(none.text, /won’t improvise/);
  assert.ok(none.text.endsWith(END));
});

test('every fixture clause has a plain summary of exactly one sentence', () => {
  for (const c of CLAUSES) {
    assert.ok(c.plain, `${c.clauseId} has plain`);
    assert.equal((c.plain.match(/[.!?](\s|$)/g) || []).length, 1, `${c.clauseId}: one sentence`);
  }
});

test('he never rules on the player\'s own case', () => {
  const ASSURANCE = /\b(you('ll| will) be (fine|ok|okay|safe)|you('re| are) (fine|covered|eligible|safe)|you (won't|will not|can't|cannot) lose|don't worry|no problem)\b/i;
  for (const q of ['will I lose my bonus if I withdraw?', 'am I eligible for the welcome offer', 'does this apply to me', "am I going to be ok", 'will I get my prize', 'in my case is the cap applied']) {
    const r = ask(q);
    assert.equal(r.intent, 'myCase', q);
    assert.match(r.text, /can’t say how|Not for me to rule/, q);
    assert.doesNotMatch(r.text, ASSURANCE, q);
  }
  const mem = createPenrose();
  ask("what's the wagering on free spins?", mem);
  const r = ask('does this apply to me', mem);
  assert.deepEqual(r.action, {type: 'show-terms', section: 'free_spins', clauseId: 'fs-2'}, 'shows the clause in focus, without applying it');
});

test('whatChanged reports version and date from data', () => {
  const r = ask('what has changed?');
  assert.equal(r.intent, 'whatChanged');
  assert.match(r.text, /version 0\.3, last updated 1 Oct 2026/);
  const mem = createPenrose();
  ask('Pending withdrawals', mem);
  const focused = ask('when was that updated?', mem);
  assert.match(focused.text, /^k-3 is at version 0\.3, updated 1 Oct 2026/);
  assert.deepEqual(focused.dataIds, ['k-3']);
});

test('sections: one clause is shown, several are offered as headings', () => {
  const p = ask('privacy');
  assert.deepEqual(p.action, {type: 'show-terms', section: 'privacy', clauseId: 'p-1'});
  const mem = createPenrose(), b = ask('bonus terms', mem);
  assert.equal(b.action, null);
  assert.match(b.text, /bonus terms run to 4 clauses/);
  assert.deepEqual(penroseSuggestions(mem), data.terms.bonus.map(c => c.heading));
});

test('explainability: every reply records intent, p, via and dataIds that exist in the fixtures', () => {
  for (const q of ['hello', "what's the wagering on free spins?", 'bonus terms', 'marmalade', 'what changed', 'privacy']) {
    const r = ask(q);
    for (const k of ['intent', 'p', 'via']) assert.ok(r[k] !== undefined, `${q}: ${k}`);
    assert.ok(Array.isArray(r.dataIds), q);
    for (const id of r.dataIds) assert.ok(clause(id), `${q}: ${id} exists`);
    if (r.action) assert.ok(r.dataIds.includes(r.action.clauseId), `${q}: action is traced`);
  }
});

test('without data he says so and shows nothing', () => {
  for (const q of ["what's the wagering on free spins?", 'what changed', 'bonus terms']) {
    const r = ask(q, createPenrose(), {data: null});
    assert.equal(r.action, null, q);
    assert.match(r.text, /ledger hasn’t come up/, q);
  }
});

test('opener and Terms-link focus: he opens on the clause he was sent', () => {
  const mem = createPenrose();
  assert.equal(penroseOpener(mem, ctx).action, null);
  penroseFocus(mem, {section: 'bonus', clauseId: 'b-3'});
  const o = penroseOpener(mem, ctx);
  assert.deepEqual(o.action, {type: 'show-terms', section: 'bonus', clauseId: 'b-3'});
  assert.match(o.text, /b-3/);
  assert.deepEqual(penroseSuggestions(mem), ['In plain English?', 'What’s changed?', 'Free spin terms']);
});

test('clause cards: verbatim, version date, full-terms link, and "Ask Mr Penrose" everywhere except his own desk', () => {
  const action = {type: 'show-terms', section: 'bonus', clauseId: 'b-1'};
  const elsewhere = renderCards(action, data, {})[0], own = renderCards(action, data, {from: 'penrose'})[0];
  assert.match(elsewhere.html, /data-action="ask-penrose" data-section="bonus" data-clause="b-1"/);
  assert.doesNotMatch(own.html, /ask-penrose/);
  for (const c of [elsewhere, own]) { assert.ok(c.html.includes(esc(clause('b-1').text))); assert.match(c.html, /TERMS · BONUS · b-1/); assert.match(c.text, /Version: 0\.3 · updated 1 Oct 2026/); }
  assert.match(renderCards({type: 'show-terms', section: 'responsible_gambling', clauseId: 'r-1'}, data, {})[0].html, /TERMS · RESPONSIBLE GAMBLING · r-1/);
});

test('fuzz: 2,000 random inputs never produce urgency, offers or a clause that isn\'t in the data', () => {
  const vocab = ('what the terms bonus free spins wagering withdraw deposit limit break privacy data changed version plain english mean ' +
    'will I lose my am eligible hurry win money cap tie prize opt in hello thanks bye marmalade 18 age verify pending reverse cookies ' +
    'please now quick rules clause section explain simply latest new cashback welcome offer competition race leaderboard').split(' ');
  const rng = seeded(42), URGENCY = /hurry|last chance|don't miss|act now|only today|quick,|before it's gone/i;
  const mem = createPenrose();
  for (let i = 0; i < 2000; i++) {
    const n = 1 + Math.floor(rng() * 8), text = Array.from({length: n}, () => vocab[Math.floor(rng() * vocab.length)]).join(' ');
    const r = penroseReply(mem, text, ctx, rng);
    assert.doesNotMatch(r.text, URGENCY, text);
    assert.ok(!r.action || r.action.type === 'show-terms', `${text}: only clause cards`);
    if (r.action) assert.ok(clause(r.action.clauseId), `${text}: clause exists`);
    assert.ok(r.text.length > 0 && r.text !== '…', text);
  }
});

test('persona: no reactions to other residents, no offer language in any authored line', () => {
  assert.deepEqual(PERSONA.reactions, []);
  assert.ok(penroseLineCount().total > 20);
  const lines = PERSONA.intents.flatMap(i => i.responses).map(r => (typeof r === 'string' ? r : typeof r.text === 'string' ? r.text : '')).join(' ');
  assert.doesNotMatch(lines, /\b(free money|deposit now|claim|hurry|offer for you)\b/i);
});

test('staff: Mr Penrose stands at his gallery desk, never wanders, and isn\'t one of the 20 residents', () => {
  assert.equal(RESIDENTS.length, 20);
  const p = STAFF.find(s => s.id === PENROSE_ID);
  assert.equal(p.room, 'hall');
  assert.equal(personById(PENROSE_ID), p);
  const sim = new HotelResidents(seeded(3));
  assert.equal(sim.agents.length, 20, 'staff are not in the resident simulation');
  const a = sim.get(PENROSE_ID);
  assert.deepEqual([a.x, a.y], [5.5, 1.5]);
  assert.ok(sim.inRoom('hall').includes(a));
  for (let i = 0; i < 3000; i++) sim.tick(.2);
  assert.deepEqual([a.x, a.y, a.room], [5.5, 1.5, 'hall']);
  assert.equal(sim.describe(a), 'At the small-print desk');
});

test('matcher: section words choose where to look but don\'t outscore an answer', () => {
  // "Bonus wagering" repeats the section name; the expiry question must still land on expiry.
  assert.equal(matchClause('when does my bonus expire', data).clause.clauseId, 'b-2');
  assert.equal(matchClause('is there a cap on free spin winnings', data).clause.clauseId, 'fs-2');
  assert.equal(matchClause('marmalade', data).kind, 'none');
});
