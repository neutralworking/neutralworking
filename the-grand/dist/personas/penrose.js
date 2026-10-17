// Mr Penrose, Clerk of Small Print (spec §4.3). A functional NPC for the NPC brain (npc-brain.js).
//
// House rules:
//  - He quotes clauses verbatim, on a card (`show-terms`). His spoken line is framing only.
//  - A spoken summary only on `plainEnglish`: the clause's authored `plain` sentence, never his own words,
//    always ending with END.
//  - He never applies a clause to the player's own case.
//  - No offers, no urgency, no butting into other conversations.
//
// Every reply carries {intent, p, via, dataIds} so QA can trace which clause produced which line (spec §2.7).

import {respond, classify, tokens, lineCount} from '../npc-brain.js';
import {day} from '../cards.js';

export const PENROSE_ID = 100;
export const END = 'The clause itself is the one that counts.';
export const SECTION_LABEL = {general: 'general', bonus: 'bonus', competition: 'competition', free_spins: 'free spins', banking: 'banking', responsible_gambling: 'safer play', privacy: 'privacy'};

// ---------- Clause search ----------

// Words that point at the same idea in the terms. Keys are npc-brain tokens (lower case, stemmed).
const TERM_WORDS = {
  wagering: 'wager', wagered: 'wager', playthrough: 'wager', rollover: 'wager', turnover: 'wager',
  expiry: 'expir', expire: 'expir', expir: 'expir', expiration: 'expir', deadline: 'expir', valid: 'expir',
  maximum: 'cap', max: 'cap', capp: 'cap', limit: 'limit', ceiling: 'cap',
  winning: 'win', won: 'win', winn: 'win', payout: 'win',
  withdrawal: 'withdraw', cashout: 'withdraw',
  deposit: 'deposit', payment: 'deposit', pay: 'deposit',
  verification: 'verif', verify: 'verif', verifi: 'verif', kyc: 'verif', identity: 'verif', id: 'verif', document: 'verif', passport: 'verif',
  revers: 'reverse', reversal: 'reverse', reverse: 'reverse', cancel: 'reverse', undo: 'reverse',
  scor: 'score', point: 'score', tied: 'tie', tiebreak: 'tie',
  priz: 'prize', reward: 'prize', winner: 'result',
  entry: 'enter', enter: 'enter', join: 'enter', opt: 'enter', sign: 'enter',
  eligibility: 'eligible', eligib: 'eligible', qualify: 'eligible',
  stor: 'store', store: 'store', saved: 'store', save: 'store', kept: 'store', keep: 'store',
  wipe: 'wipe', wiped: 'wipe', delete: 'wipe', deleted: 'wipe', erase: 'wipe', forget: 'wipe',
  exclusion: 'exclude', exclud: 'exclude', exclude: 'exclude', timeout: 'break', pause: 'break', cool: 'break', cooling: 'break',
  old: 'age', adult: 'age', underage: 'age', '18': 'age',
  value: 'money', worth: 'money',
  bonu: 'bonus', bonuse: 'bonus',
};
// Words that only name a section. They choose where to look, then stop counting, so a heading that
// repeats the section name ("Bonus wagering") doesn't outscore one that answers the question.
const SECTION_CUES = {
  bonus: ['bonus', 'bonuse'], free_spins: ['free', 'spin'], competition: ['competition', 'tournament', 'leaderboard', 'race', 'contest'],
  banking: ['banking', 'bank', 'cashier'], responsible_gambling: ['responsible', 'gambling', 'safer', 'safe', 'wellbeing'], privacy: ['privacy', 'private'],
};
let CUE_WORDS = null; // built lazily from SECTION_CUES through the same token pipeline as queries
// Filler that carries no meaning for clause search.
const NOISE = new Set(('a an the i me my mine you your is are was were be been am do does did to of in on at for with and or but so if it its this that ' +
  'these those what why how who when where which can could would should will have has had not hi hey hello please thank thanks im dont ' +
  'about from into there here then than them they we us our get got say said tell some any one all no yes there terms term clause clauses ' +
  'rule rules condition conditions small print t c tc tcs policy mr penrose sir say says said written read show find look up ' +
  'happen happens long take much many work works mean means does do on off over under per just only also again exactly').split(' '));

export const SECTION_RX = [
  ['free_spins', /\bfree[ -]?spins?\b|\bspins?\b/i],
  ['bonus', /\bbonus(es)?\b|\bwelcome offer\b|\breload\b|\bcashback\b|\bdeposit match\b|\bplaythrough\b/i],
  ['competition', /\b(competitions?|tournaments?|leaderboards?|races?|contests?|prize draws?|opt(ing)?[ -]?in|ties?|tied|tie-?break)\b/i],
  ['banking', /\b(banking|withdraw(al|als|ing|n)?|deposit(s|ing)?|cash ?out|cashier|payments?|kyc|verif(y|ied|ication)|identity|pending|revers(e|al)|bank)\b/i],
  ['responsible_gambling', /\b(responsible|safer play|safer gambling|self[ -]?exclu\w*|exclude me|time[ -]?out|cool(ing)?[ -]?off|take a break|break from|limits?|addict\w*|problem gambling|wellbeing)\b/i],
  ['privacy', /\b(privacy|personal data|my data|data|cookies?|gdpr|stored|tracking)\b/i],
  ['general', /\b(age|18\+?|over 18|minimum age|how old|fictional|real money|monetary|about these terms|general terms)\b/i],
];
export function sectionOf(text) {
  for (const [section, rx] of SECTION_RX) if (rx.test(text)) return section;
  return null;
}

const norm = w => TERM_WORDS[w] || w;
export function words(text) {
  return [...new Set(tokens(text).map(norm).filter(w => w.length > 1 && !NOISE.has(w)))];
}

export function allClauses(data) {
  const t = data?.terms;
  if (!t) return [];
  return Array.isArray(t) ? t : Object.values(t).flat();
}

const prepared = new WeakMap();
function prep(clause) {
  let p = prepared.get(clause);
  if (!p) { p = {heading: new Set(words(clause.heading)), text: new Set(words(clause.text)), exact: clause.heading.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}; prepared.set(clause, p); }
  return p;
}

// Rank clauses against free text. Returns {kind, clause?, options, section, ranked}.
//  kind 'clause'    one clear best match
//  kind 'ambiguous' two or more share the best score; options are the top 3
//  kind 'browse'    a section was named but nothing in it matched; options are its clauses
//  kind 'none'      nothing matched
//  kind 'nodata'    the terms haven't loaded
export function matchClause(text, data, {section = sectionOf(text), within = null} = {}) {
  const clauses = allClauses(data);
  if (!clauses.length) return {kind: 'nodata', options: [], section, ranked: []};
  const exact = String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const hit = clauses.find(c => prep(c).exact === exact || c.clauseId.toLowerCase() === exact);
  if (hit) return {kind: 'clause', clause: hit, options: [hit], section: hit.section, ranked: [{clause: hit, score: 100}]};

  const pool = clauses.filter(c => (!within || c.section === within) && (!section || c.section === section));
  CUE_WORDS ??= new Set(words(Object.values(SECTION_CUES).flat().join(' ')));
  const q = words(text).filter(w => !CUE_WORDS.has(w));
  const ranked = pool.map(c => {
    const p = prep(c);
    let score = 0;
    for (const w of q) score += (p.heading.has(w) ? 3 : 0) + (p.text.has(w) ? 1 : 0);
    return {clause: c, score};
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    if (section) return {kind: 'browse', options: pool, section, ranked};
    return {kind: 'none', options: [], section, ranked};
  }
  const best = ranked[0].score, tied = ranked.filter(x => x.score === best);
  if (tied.length === 1) return {kind: 'clause', clause: ranked[0].clause, options: [ranked[0].clause], section, ranked};
  // Two or more equal: offer the top three headings, padded from the same section where possible.
  const options = ranked.slice(0, 3).map(x => x.clause);
  for (const c of pool) if (options.length < 3 && !options.includes(c) && c.section === options[0].section) options.push(c);
  return {kind: 'ambiguous', options, section, ranked};
}

const findById = (data, ref) => ref && allClauses(data).find(c => c.section === ref.section && c.clauseId === ref.clauseId);
const termsAction = c => ({type: 'show-terms', section: c.section, clauseId: c.clauseId});
const refOf = c => ({section: c.section, clauseId: c.clauseId});

// ---------- Persona ----------

// Stash what the reply should do; `voice` attaches it to the result.
const stage = (mem, pending) => { mem.pending = pending; };
function settle(mem, m) {
  if (m.kind === 'clause') { mem.focus = refOf(m.clause); mem.choices = null; stage(mem, {action: termsAction(m.clause), dataIds: [m.clause.clauseId]}); }
  else if (m.kind === 'ambiguous' || m.kind === 'browse') { mem.choices = m.options.map(c => c.heading); stage(mem, {action: null, dataIds: m.options.map(c => c.clauseId)}); }
  else { mem.choices = null; stage(mem, {action: null, dataIds: []}); }
}
const sectionWord = m => SECTION_LABEL[m.section] || 'those';

// Responses shared by every clause-finding intent. Framing only: the clause goes on the card.
const CLAUSE_RESPONSES = [
  {when: (m, c, s) => s.m.kind === 'clause', text: (m, c, s) => `Clause ${s.m.clause.clauseId}, “${s.m.clause.heading}”. Word for word.`},
  {when: (m, c, s) => s.m.kind === 'clause', text: (m, c, s) => `Here it is, exactly as written: ${s.m.clause.clauseId}.`},
  {when: (m, c, s) => s.m.kind === 'clause', text: (m, c, s) => `That is clause ${s.m.clause.clauseId}. I don’t paraphrase unless asked.`},
  {when: (m, c, s) => s.m.kind === 'ambiguous', text: () => 'Several clauses answer to that. Which did you mean?'},
  {when: (m, c, s) => s.m.kind === 'ambiguous', text: () => 'That could be one of these. Pick a heading and I’ll read it.'},
  {when: (m, c, s) => s.m.kind === 'browse', text: (m, c, s) => s.m.options.length === 1 ? `The ${sectionWord(s.m)} terms are one clause.` : `The ${sectionWord(s.m)} terms run to ${s.m.options.length} clauses. Which one?`},
  {when: (m, c, s) => s.m.kind === 'none', text: () => 'I can’t find a clause for that. Try a heading, or a section.'},
  {when: (m, c, s) => s.m.kind === 'nodata', text: () => 'The ledger hasn’t come up from the archive yet. Try me again shortly.'},
];
// A section with a single clause is shown, not browsed.
const single = m => (m.kind === 'browse' && m.options.length === 1 ? {...m, kind: 'clause', clause: m.options[0]} : m);
const clauseIntent = (id, section, patterns, examples, rank) => ({
  id, rank, patterns, examples,
  extract: (text, ctx) => ({m: single(matchClause(text, ctx.data, {section}))}),
  effect: (mem, ctx, slots) => settle(mem, slots.m),
  responses: CLAUSE_RESPONSES,
});

// Personal-case phrasing: he won't say how a clause applies to you (spec §4.3).
const MY_CASE = [
  /\b(will|would|could|do|does|did|am|have|has) i (lose|get|keep|be|still|qualify|count|win|owe|forfeit)\b/i,
  /\bam i (eligible|allowed|ok|okay|fine|safe|covered|in trouble|going to|able to)\b/i,
  /\b(in|for) my (case|situation|account)\b/i,
  /\b(does|would|will) (this|that|it) (apply|mean anything) (to|for) me\b/i,
  /\bwhat happens to my (?!data|information|details|personal)/i, /\bwhat about me\b/i, /\bfor me specifically\b/i, /\bam i going to be\b/i,
  /\bmy (bonus|spins|winnings|withdrawal|deposit|account|credits) (be|get|is|are)\b/i,
];

export const PERSONA = {
  name: 'Mr Penrose',
  moodFor: () => 'warm',
  reactions: [], // functional NPCs never butt into other conversations (spec §3.1)
  intents: [
    {id: 'myCase', rank: 95, patterns: MY_CASE,
      extract: (text, ctx, mem) => {
        const m = matchClause(text, ctx.data);
        const c = m.kind === 'clause' ? m.clause : findById(ctx.data, mem.focus);
        return {c: c || null};
      },
      effect: (mem, ctx, s) => { if (s.c) { mem.focus = refOf(s.c); stage(mem, {action: termsAction(s.c), dataIds: [s.c.clauseId]}); } else stage(mem, {action: null, dataIds: []}); },
      responses: [
        {when: (m, c, s) => !!s.c, text: (m, c, s) => `I can’t say how ${s.c.clauseId} applies to you. Here is what it says; support can look at your account.`},
        {when: (m, c, s) => !!s.c, text: (m, c, s) => `Not for me to rule on your case, I’m afraid. ${s.c.clauseId} reads as follows.`},
        {when: (m, c, s) => !s.c, text: () => 'I can’t say how the terms apply to you. I can show you what they say.'},
      ]},
    {id: 'plainEnglish', rank: 90,
      patterns: [/\bplain(er)? (english|words|terms|language)\b/i, /\bin english\b/i, /\bsimpl(e|er|y|ify)\b/i, /\blayman/i, /\bwhat (does|did) (that|it|this) (mean|say)\b/i,
        /\b(summar(y|ise|ize)|tl;?dr|eli5|gist|in short|short version|nutshell)\b/i, /\bexplain (it|that|this)\b/i, /\bbreak (it|that) down\b/i, /\bnormal words\b/i, /\btranslate\b/i, /\bmeaning\b/i],
      extract: (text, ctx, mem) => {
        const m = matchClause(text, ctx.data);
        return {c: (m.kind === 'clause' ? m.clause : findById(ctx.data, mem.focus)) || null};
      },
      effect: (mem, ctx, s) => { if (s.c) { mem.focus = refOf(s.c); stage(mem, {action: termsAction(s.c), dataIds: [s.c.clauseId]}); } else stage(mem, {action: null, dataIds: []}); },
      responses: [
        {when: (m, c, s) => !!s.c?.plain, text: (m, c, s) => `${s.c.plain} ${END}`},
        {when: (m, c, s) => s.c && !s.c.plain, text: () => `I have no plain version of that one, and I won’t improvise. ${END}`},
        {when: (m, c, s) => !s.c, text: () => 'Plain English for which clause? Ask me about one first.'},
      ]},
    {id: 'whatChanged', rank: 85,
      patterns: [/\bwhat('?s| has| have)? changed\b/i, /\b(have|has|did|were)\b.{0,24}\bchang(ed|e)\b/i, /\b(any )?changes\b/i, /\b(last |latest |recent(ly)? )?updated?\b/i, /\bversion\b/i, /\bnew terms\b/i, /\bamend(ed|ments?)\b/i, /\bhow (old|recent|current) are\b/i, /\bup to date\b/i],
      extract: (text, ctx, mem) => {
        const list = allClauses(ctx.data);
        if (!list.length) return {latest: null};
        const latest = list.reduce((a, b) => (Date.parse(b.updatedAt) > Date.parse(a.updatedAt) ? b : a));
        const m = matchClause(text, ctx.data);
        const c = m.kind === 'clause' && m.ranked[0]?.score > 0 ? m.clause : findById(ctx.data, mem.focus);
        return {latest, c: c || null, date: day(latest.updatedAt, ctx.timeZone), cdate: c ? day(c.updatedAt, ctx.timeZone) : ''};
      },
      effect: (mem, ctx, s) => {
        if (s.c) { mem.focus = refOf(s.c); stage(mem, {action: termsAction(s.c), dataIds: [s.c.clauseId]}); }
        else stage(mem, {action: s.latest ? termsAction(s.latest) : null, dataIds: s.latest ? [s.latest.clauseId] : []});
      },
      responses: [
        {when: (m, c, s) => !!s.c, text: (m, c, s) => `${s.c.clauseId} is at version ${s.c.version}, updated ${s.cdate}. The card has it.`},
        {when: (m, c, s) => !s.c && !!s.latest, text: (m, c, s) => `These terms are version ${s.latest.version}, last updated ${s.date}.`},
        {when: (m, c, s) => !s.latest, text: () => 'The ledger hasn’t come up from the archive yet. Try me again shortly.'},
      ]},
    {id: 'listSections', rank: 35,
      patterns: [/\bwhat (terms|sections|rules|clauses) (are there|do you (have|keep))\b/i, /\b(index|contents|table of contents)\b/i, /\blist (the |all )?(terms|sections|clauses)\b/i, /\ball (the )?terms\b/i, /\bfull terms\b/i, /\bwhole (document|thing)\b/i],
      effect: mem => { mem.choices = ['Bonus terms', 'Free spin terms', 'Competition terms']; stage(mem, {action: null, dataIds: []}); },
      responses: [
        {text: 'Bonuses, free spins, competitions, banking, safer play, privacy. The full document is linked on every card.'},
      ]},
    {id: 'who', rank: 30,
      patterns: [/\bwho are you\b/i, /\bwhat do you do\b/i, /\byour (job|role)\b/i, /\bwhat is this (desk|place)\b/i, /\bwho('?s| is) (mr )?penrose\b/i, /\bwhat are you for\b/i],
      effect: mem => stage(mem, {action: null, dataIds: []}),
      responses: [
        {text: 'Penrose. Clerk of Small Print. I read the terms out exactly as written.'},
        {text: 'I keep the terms. Ask me about any clause and I’ll show you the wording.'},
      ]},
    clauseIntent('freeSpinTerms', 'free_spins', [SECTION_RX[0][1]], ['free spin terms', 'rules for free spins', 'spin winnings'], 62),
    clauseIntent('bonusTerms', 'bonus', [SECTION_RX[1][1]], ['bonus terms', 'bonus rules', 'welcome offer rules'], 58),
    clauseIntent('competitionTerms', 'competition', [SECTION_RX[2][1]], ['competition terms', 'tournament rules', 'leaderboard rules'], 56),
    clauseIntent('bankingTerms', 'banking', [SECTION_RX[3][1]], ['banking terms', 'withdrawal rules', 'deposit rules'], 54),
    clauseIntent('responsibleGambling', 'responsible_gambling', [SECTION_RX[4][1]], ['safer play terms', 'self exclusion rules'], 60),
    clauseIntent('privacy', 'privacy', [SECTION_RX[5][1]], ['privacy terms', 'what happens to my data'], 52),
    // Anything else with a recognisable keyword. A rule that always matches, ranked lowest, so the
    // extract decides: no keyword hit, no claim.
    {id: 'findClause', rank: 0, patterns: [/[a-z]/i],
      extract: (text, ctx) => { const m = matchClause(text, ctx.data, {section: sectionOf(text)}); return m.kind === 'clause' || m.kind === 'ambiguous' || m.kind === 'nodata' ? {m} : null; },
      effect: (mem, ctx, slots) => settle(mem, slots.m),
      responses: CLAUSE_RESPONSES},
    {id: 'greet', rank: 10, patterns: [/^\s*(hi|hello|hey|hiya|evening|good (evening|morning|afternoon)|greetings)\b[\s\w.,!]{0,20}$/i],
      effect: mem => stage(mem, {action: null, dataIds: []}),
      responses: ['Good evening. Which clause can I find for you?', 'Evening. The terms are all here, every word.']},
    {id: 'thanks', rank: 10, patterns: [/^\s*(thanks|thank you|cheers|ta|much obliged|appreciated)\b/i],
      effect: mem => stage(mem, {action: null, dataIds: []}),
      responses: ['You’re welcome. Read it twice; it’s good practice.', 'Not at all. I’ll be at the desk.']},
    {id: 'bye', rank: 12, patterns: [/\b(bye|goodbye|good ?night|see you|that'?s all|that is all|nothing else|i'?m done)\b/i],
      effect: mem => stage(mem, {action: null, dataIds: []}),
      responses: [{text: 'Good evening to you. The desk is always open.', ended: true}]},
    {id: 'notFound', fallback: true,
      effect: mem => { mem.choices = null; stage(mem, {action: null, dataIds: []}); },
      responses: ['I can’t find a clause for that. Try a heading, or a section.', 'Nothing in the terms answers to that. Ask me about bonuses, spins or banking.']},
  ],
  // Attach the staged action and the data ids to every reply.
  voice: (result, r, mem) => {
    const pending = mem.pending || {action: null, dataIds: []};
    mem.pending = null;
    return {...result, mood: 'warm', action: pending.action, dataIds: pending.dataIds};
  },
};

// ---------- Public API ----------

export function createPenrose() { return {used: {}, turns: 0, focus: null, choices: null, pending: null}; }

export function penroseReply(mem, input, ctx = {}, rng = Math.random, opts = {}) {
  return respond(PERSONA, mem, input, ctx, rng, opts);
}

// Focus a clause before he's spoken to (another card's Terms link routes here).
export function penroseFocus(mem, ref) { mem.focus = ref && ref.section && ref.clauseId ? {section: ref.section, clauseId: ref.clauseId} : null; mem.choices = null; }

export function penroseOpener(mem, ctx = {}) {
  const c = findById(ctx.data, mem.focus);
  if (c) return {text: `You were reading ${c.clauseId}, I believe. Here it is in full.`, mood: 'warm', action: termsAction(c), intent: 'opener', dataIds: [c.clauseId]};
  return {text: 'Penrose, Clerk of Small Print. Which clause can I find for you?', mood: 'warm', action: null, intent: 'opener', dataIds: []};
}

export function penroseSuggestions(mem) {
  if (mem.choices?.length) return mem.choices.slice(0, 4);
  if (mem.focus) return ['In plain English?', 'What’s changed?', 'Free spin terms'];
  return ['What’s the wagering on free spins?', 'Bonus terms', 'What’s changed?'];
}

export const penroseFarewell = () => 'Good evening. The terms will keep.';
export const penroseClassify = (mem, text, ctx = {}) => classify(PERSONA, text, mem, ctx);
export const penroseLineCount = () => lineCount(PERSONA);

// The shape app.js registers in its PERSONAS map: {reply, opener, suggestions, focus, farewell}.
export function penroseCharacter(mem = createPenrose()) {
  return {
    mem,
    reply: (text, ctx, rng) => penroseReply(mem, text, ctx, rng),
    opener: ctx => penroseOpener(mem, ctx),
    suggestions: () => penroseSuggestions(mem),
    focus: ref => penroseFocus(mem, ref),
    farewell: penroseFarewell,
  };
}
