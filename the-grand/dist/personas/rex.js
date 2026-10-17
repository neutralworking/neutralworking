// Rex, the Tournament Steward (spec §4.2). A functional NPC for the NPC brain (npc-brain.js), in the Gold Lounge.
//
// House rules:
//  - Competition facts (dates, scoring, prizes, standings, winners) come from data. He speaks the scoring
//    sentence and prize list as written; dates and countdowns live on the cards.
//  - Standing is reported as data only: rank and score, nothing else. No "only X behind", no "keep going",
//    no encouragement to play more.
//  - Winners appear under the anonymised display names supplied upstream.
//  - Mentions competitions unprompted at most once per session, never after "no thanks", never while offers
//    are blocked. Listing competitions and opting in count as offers; records, standings and terms don't.
//
// Every reply carries {intent, p, via, dataIds} (spec §2.7).

import {respond, classify, lineCount} from '../npc-brain.js';
import {day} from '../cards.js';
import {matchBonus} from './celeste.js';

export const REX_ID = 103;

const comps = ctx => ctx.data?.competitions || {live: [], upcoming: []};
const liveOf = ctx => comps(ctx).live || [];
const upcomingOf = ctx => comps(ctx).upcoming || [];
const allOf = ctx => [...liveOf(ctx), ...upcomingOf(ctx)];
const recordsOf = ctx => ctx.data?.records || [];
const blocked = ctx => !!ctx.offersBlocked;
const stage = (mem, action = null, dataIds = []) => { mem.pending = {action, dataIds}; };
const termsAction = ref => (ref ? {type: 'show-terms', section: ref.section, clauseId: ref.clauseId} : null);
const OFFER_TYPES = new Set(['show-competitions', 'opt-in', 'show-offers', 'open-claim']);
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const word = k => WORDS[k] ?? String(k);
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const n = (k, one, many) => (k === 1 ? one : many.replace('#', word(k)));

// Which competition does the text mean? Kind words ("race", "tournament", "draw") count as part of the name.
const KIND = {race: 'race', tournament: 'tournament cup', leaderboard: 'leaderboard', prize_draw: 'prize draw'};
// Words that say what the question is about, not which competition: they never pick one.
const TOPIC = /\b(prizes?|scor(e|es|ed|ing)|points?|terms|rules|entry|enter(ing)?|opt(ing)?[ -]?in|standings?|leader ?board|competitions?|results?|winners?|records?|how am i doing)\b/gi;
export function matchCompetition(text, list, focusId = null) {
  text = String(text).replace(TOPIC, ' ');
  const keyed = list.map(c => ({...c, title: `${c.title} ${KIND[c.kind] || ''}`, kind: undefined}));
  const m = matchBonus(text, keyed, focusId);
  const back = x => list.find(c => c.id === x.id);
  return m.bonus ? {comp: back(m.bonus)} : {many: (m.many || []).map(back)};
}
// The competition this turn is about. `fallback` picks one when nothing is named: the single live one, say.
function pick(text, ctx, mem, pool = allOf(ctx), fallback = null) {
  const m = matchCompetition(text, pool, mem.focus);
  const comp = m.comp || (m.many.length === pool.length ? fallback?.(pool) : null) || null;
  if (comp) mem.focus = comp.id;
  return {comp, many: comp ? [] : m.many};
}
const onlyOne = list => (list.length === 1 ? list[0] : null);
const choose = (mem, list, ask) => { mem.choices = list.slice(0, 3).map(c => ask(c.title)); };

// A per-competition fact intent: answers for one competition, or asks which.
const aboutOne = (id, rank, patterns, say, ask, action = () => null, {offer = false} = {}) => ({
  id, rank, patterns,
  extract: (text, ctx, mem) => ({...pick(text, ctx, mem, allOf(ctx), pool => onlyOne(liveOf(ctx)) || onlyOne(pool)), ctx}),
  effect: (mem, ctx, s) => {
    if (s.comp) { mem.choices = null; stage(mem, offer && blocked(ctx) ? null : action(s.comp), [s.comp.id]); }
    else { if (allOf(ctx).length) choose(mem, s.many.length ? s.many : allOf(ctx), ask); stage(mem); }
  },
  responses: [
    {when: (m, c, s) => offer && blocked(c), text: () => 'I can’t go into competitions right now.'},
    {when: (m, c, s) => !(offer && blocked(c)) && !!s.comp, text: (m, c, s) => say(s.comp, c, m)},
    {when: (m, c, s) => !(offer && blocked(c)) && !s.comp && allOf(c).length > 0, text: () => 'Which competition?'},
    {when: (m, c, s) => !(offer && blocked(c)) && !s.comp && !allOf(c).length, text: () => 'Nothing is running or scheduled right now.'},
  ],
});

const prizeLine = c => (c.prizes || []).map(p => `${p.rank}: ${p.prize}`).join(', ');

export const PERSONA = {
  name: 'Rex',
  moodFor: () => 'warm',
  reactions: [], // functional NPCs never butt into other conversations (spec §3.1)
  intents: [
    {id: 'noThanks', rank: 95,
      patterns: [/\bno,? thanks?\b/i, /\bno thank you\b/i, /\bnot interested\b/i, /\bdon'?t want (any|to enter|competitions|it)\b/i, /\bstop (offering|showing|mentioning)\b/i, /^\s*(i'?m (good|fine|ok|okay)|no|nah|pass|not now|not tonight)\s*[.!]*\s*$/i],
      effect: mem => { mem.declined = true; mem.choices = null; stage(mem); },
      responses: ['Understood. I won’t bring them up again tonight.', 'Of course. The records board is always there if you’re curious.']},
    {id: 'recommend', rank: 90,
      patterns: [/\bbest\b/i, /\bwhich (one )?should i\b/i, /\brecommend\w*\b/i, /\bworth (it|entering|joining)\b/i, /\bshould i (enter|join|opt|play)\b/i, /\bcan i win\b/i, /\bchances?\b/i, /\bodds\b/i],
      effect: mem => stage(mem),
      responses: [{text: 'That’s for you to decide. The cards set them out the same way.'}]},
    // Standing: rank and score, as data, and nothing more (spec §4.2 "must not").
    {id: 'myStanding', rank: 85,
      patterns: [/\bhow am i doing\b/i, /\bmy (standing|rank|ranking|position|place|score|points)\b/i, /\bwhere am i\b/i, /\bwhat('?s| is) my\b.{0,10}\b(rank|position|place|score)\b/i, /\bam i (winning|in the lead|on the (board|leaderboard))\b/i, /\bhow('?m| am) i placed\b/i],
      extract: (text, ctx, mem) => {
        const m = matchCompetition(text, liveOf(ctx), mem.focus);
        const entered = liveOf(ctx).filter(c => c.playerStanding);
        const comp = m.comp || (entered.length === 1 ? entered[0] : onlyOne(liveOf(ctx)));
        if (comp) mem.focus = comp.id;
        return {comp, entered};
      },
      effect: (mem, ctx, s) => {
        if (s.comp?.playerStanding) { mem.choices = null; stage(mem, {type: 'show-leaderboard', competitionId: s.comp.id}, [s.comp.id]); }
        else { if (!s.comp && s.entered.length > 1) choose(mem, s.entered, t => `My standing in ${t}`); stage(mem, null, s.comp ? [s.comp.id] : []); }
      },
      responses: [
        {when: (m, c, s) => !!s.comp?.playerStanding, text: (m, c, s) => `${s.comp.title}: you’re #${s.comp.playerStanding.rank} with ${s.comp.playerStanding.score.toLocaleString('en-GB')} points.`},
        {when: (m, c, s) => s.comp && !s.comp.playerStanding, text: (m, c, s) => `You’re not entered in the ${s.comp.title}.`},
        {when: (m, c, s) => !s.comp && s.entered.length > 1, text: () => 'You’re in more than one. Which?'},
        {when: (m, c, s) => !s.comp && s.entered.length <= 1, text: () => 'Nothing is live right now, so there’s no standing to show.'},
      ]},
    {id: 'leaderboard', rank: 80,
      patterns: [/\bleader ?board\b/i, /\bstandings\b/i, /\bwho('?s| is) (winning|leading|top|on top|in the lead|first)\b/i, /\btop (ten|10|five|5|three|3)\b/i, /\bthe table\b/i],
      extract: (text, ctx, mem) => ({...pick(text, ctx, mem, liveOf(ctx), pool => onlyOne(pool))}),
      effect: (mem, ctx, s) => { if (s.comp) stage(mem, {type: 'show-leaderboard', competitionId: s.comp.id}, [s.comp.id]); else { if (liveOf(ctx).length > 1) choose(mem, liveOf(ctx), t => `Leaderboard for ${t}`); stage(mem); } },
      responses: [
        {when: (m, c, s) => !!s.comp, text: (m, c, s) => `The ${s.comp.title} standings. Names are anonymised.`},
        {when: (m, c, s) => !s.comp && liveOf(c).length > 1, text: () => 'Which competition?'},
        {when: (m, c, s) => !s.comp && !liveOf(c).length, text: () => 'Nothing is live right now. The records board has past results.'},
      ]},
    {id: 'pastResults', rank: 78,
      patterns: [/\bwho won\b/i, /\b(last|previous|recent) (week|competition|race|tournament|results?|winners?)\b/i, /\bpast results\b/i, /\bwinners?\b/i, /\bresults?\b/i, /\bhow did (the|last)\b.{0,30}\b(end|go|finish)\b/i],
      extract: (text, ctx, mem) => {
        const list = recordsOf(ctx), m = matchBonus(text, list.map(r => ({id: r.competitionId, title: r.title})), null);
        const rec = m.bonus ? list.find(r => r.competitionId === m.bonus.id) : list[0] || null; // records arrive newest first
        return {rec, ended: rec ? day(rec.endedAt, ctx.timeZone) : ''};
      },
      effect: (mem, ctx, s) => stage(mem, s.rec ? {type: 'show-records', competitionId: s.rec.competitionId, limit: 1} : null, s.rec ? [s.rec.competitionId] : []),
      responses: [
        {when: (m, c, s) => !!s.rec, text: (m, c, s) => `The ${s.rec.title}, which ended ${s.ended}. Winners are on the card, names anonymised.`},
        {when: (m, c, s) => !s.rec, text: () => 'There are no past results yet.'},
      ]},
    {id: 'records', rank: 76,
      patterns: [/\brecords?\b/i, /\ball[- ]time\b/i, /\bbiggest (win|score)\b/i, /\bhighest (score|win)\b/i, /\bhall of (records|fame)\b/i, /\bmost rounds\b/i, /\bever\b/i],
      effect: (mem, ctx) => stage(mem, recordsOf(ctx).length ? {type: 'show-records', limit: 3} : null, recordsOf(ctx).map(r => r.competitionId).slice(0, 3)),
      responses: [
        {when: (m, c) => recordsOf(c).length > 0, text: () => 'The records. The same board hangs in the Gallery.'},
        {when: (m, c) => !recordsOf(c).length, text: () => 'No records have been set yet.'},
      ]},
    aboutOne('optIn', 74, [/\bopt(ing)?[ -]?(me )?in\b/i, /\bsign me up\b/i, /\benter me\b/i, /\bcount me in\b/i, /\bi('d| would) like to (enter|join)\b/i, /\bjoin (the|it|that)\b/i],
      (c) => (!c.optInRequired ? `No opt-in for the ${c.title}. Play on ${(c.eligibleGames || []).join(' or ') || 'any game'} while it’s live counts.` : c.optedIn ? `You’re already opted in to the ${c.title}.` : `The ${c.title}. Confirm on the card if you’d like to opt in.`),
      t => `Opt in to ${t}`, c => (c.optInRequired && !c.optedIn ? {type: 'opt-in', competitionId: c.id} : null), {offer: true}),
    // Questions about entering rank above the opt-in request itself: "how do I join?" asks, "sign me up" acts.
    aboutOne('howToEnter', 75, [/\bhow (do|can) i (enter|join|take part|get in|qualify|play)\b/i, /\bhow does (entry|entering) work\b/i, /\bdo i (need|have) to (opt|sign|enter|register)\b/i, /\bentry\b/i, /\beligib\w*\b/i],
      (c) => (c.optInRequired ? `The ${c.title} needs an opt-in first. Only play after that counts.` : `No opt-in for the ${c.title}. Play on ${(c.eligibleGames || []).join(' or ') || 'any game'} while it’s live counts.`),
      t => `How do I enter ${t}?`, c => termsAction(c.termsRef)),
    aboutOne('scoring', 70, [/\bscor(e|ed|es|ing)\b/i, /\bhow (do|does|are) (you|i|it|points)\b.{0,20}\b(win|scored|work|count|earned)\b/i, /\bpoints?\b/i, /\brules\b/i, /\bhow does (it|the \w+) work\b/i, /\bhow do i win\b/i],
      c => `${c.title}: ${c.scoring}`, t => `Scoring for ${t}?`, c => termsAction(c.termsRef)),
    aboutOne('prizes', 70, [/\bprizes?\b/i, /\bwhat (can|do) (you|i|they|the winners?) (win|get)\b/i, /\breward\w*\b/i, /\bpay ?outs?\b/i, /\bwhat'?s up for grabs\b/i, /\bfirst place\b/i],
      c => `${c.title} prizes: ${prizeLine(c)}.`, t => `Prizes for ${t}?`),
    aboutOne('competitionTerms', 68, [/\bterms\b/i, /\bsmall print\b/i, /\bt ?& ?c'?s?\b/i, /\bconditions\b/i, /\bclause\b/i],
      c => `The terms for the ${c.title}. Mr Penrose in the Gallery has the rest.`, t => `Terms for ${t}`, c => termsAction(c.termsRef)),
    {id: 'upcomingCompetitions', rank: 66,
      patterns: [/\b(upcoming|coming up|next|later|scheduled|soon|this week|tomorrow|future)\b/i, /\bwhat('?s| is) (on )?next\b/i, /\banything (else )?coming\b/i],
      effect: (mem, ctx) => { mem.mentioned = true; stage(mem, blocked(ctx) || !upcomingOf(ctx).length ? null : {type: 'show-competitions', status: 'upcoming'}, upcomingOf(ctx).map(c => c.id)); },
      responses: [
        {when: (m, c) => blocked(c), text: () => 'I can’t go into competitions right now.'},
        {when: (m, c) => !blocked(c) && !upcomingOf(c).length, text: () => 'Nothing is scheduled yet.'},
        {when: (m, c) => !blocked(c) && upcomingOf(c).length > 0, text: (m, c) => `${cap(n(upcomingOf(c).length, 'one competition is', '# competitions are'))} coming up. Dates are on the cards, in your time.`},
      ]},
    {id: 'liveCompetitions', rank: 64,
      patterns: [/\bwhat('?s| is) (on|happening|running|going on)\b/i, /\b(any|what|which|show( me)?|list|are there)\b.{0,24}\b(competitions?|tournaments?|races?|contests?|events?|draws?)\b/i, /\b(live|right now|on now|tonight|currently|at the moment)\b/i, /^\s*(competitions?|tournaments?|races?)\s*\??\s*$/i],
      extract: text => ({liveOnly: /\b(live|right now|on now|currently|at the moment)\b/i.test(text)}),
      effect: (mem, ctx, s) => {
        mem.mentioned = true;
        if (blocked(ctx)) { stage(mem); return; }
        const list = s.liveOnly ? liveOf(ctx) : allOf(ctx);
        // Live first, then upcoming: the card renderer keeps that order when no status is given.
        stage(mem, list.length ? {type: 'show-competitions', ...(s.liveOnly ? {status: 'live'} : {})} : null, list.map(c => c.id));
      },
      responses: [
        {when: (m, c) => blocked(c), text: () => 'I can’t go into competitions right now.'},
        {when: (m, c, s) => !blocked(c) && s.liveOnly, text: (m, c) => (liveOf(c).length ? `${cap(n(liveOf(c).length, 'one competition is', '# competitions are'))} live now. The card has the details.` : 'Nothing is live right now.')},
        {when: (m, c, s) => !blocked(c) && !s.liveOnly && !allOf(c).length, text: () => 'Nothing is running or scheduled right now.'},
        {when: (m, c, s) => !blocked(c) && !s.liveOnly && allOf(c).length > 0, text: (m, c) => `${liveOf(c).length ? `${cap(word(liveOf(c).length))} live now` : 'Nothing live now'}, ${word(upcomingOf(c).length)} coming up. Live ones first on the cards.`},
      ]},
    {id: 'who', rank: 30,
      patterns: [/\bwho are you\b/i, /\bwhat do you do\b/i, /\byour (job|role)\b/i, /\bwhat are you for\b/i, /\bwho('?s| is) rex\b/i],
      effect: mem => stage(mem),
      responses: ['Rex, the Tournament Steward. I keep the competitions, the standings and the records.']},
    {id: 'greet', rank: 10, patterns: [/^\s*(hi|hello|hey|hiya|evening|good (evening|morning|afternoon)|greetings)\b[\s\w.,!]{0,20}$/i],
      effect: mem => stage(mem),
      responses: ['Good evening. What can I tell you?', 'Evening. Ask me about competitions or the records.']},
    {id: 'thanks', rank: 10, patterns: [/^\s*(thanks|thank you|cheers|ta|great|perfect)\b/i],
      effect: mem => stage(mem),
      responses: ['You’re welcome.', 'Any time.']},
    {id: 'bye', rank: 12, patterns: [/\b(bye|goodbye|good ?night|see you|that'?s all|that is all|nothing else|i'?m done)\b/i],
      effect: mem => stage(mem),
      responses: [{text: 'Good evening.', ended: true}]},
    {id: 'fallback', fallback: true,
      effect: mem => stage(mem),
      responses: ['I keep the competitions and the records. Ask me what’s on, or who won last week.', 'Competitions and records are my department. Ask me about either.']},
  ],
  // Attach the staged action and data ids; never let an offer action through while offers are blocked.
  voice: (result, r, mem, ctx) => {
    const pending = mem.pending || {action: null, dataIds: []};
    mem.pending = null;
    const action = blocked(ctx) && pending.action && OFFER_TYPES.has(pending.action.type) ? null : pending.action;
    return {...result, mood: 'warm', action, dataIds: pending.dataIds};
  },
};

// ---------- Public API ----------

export function createRex() { return {used: {}, turns: 0, focus: null, choices: null, pending: null, mentioned: false, declined: false}; }

export function rexReply(mem, input, ctx = {}, rng = Math.random, opts = {}) {
  return respond(PERSONA, mem, input, ctx, rng, opts);
}

// One unprompted mention per session, never after "no thanks", never while offers are blocked.
export function rexOpener(mem, ctx = {}) {
  const live = liveOf(ctx).length, next = upcomingOf(ctx).length;
  if (!mem.mentioned && !mem.declined && !blocked(ctx) && live + next) {
    mem.mentioned = true;
    const parts = [live && `${n(live, 'one competition', '# competitions')} live`, next && `${n(next, 'one', '#')} coming up`].filter(Boolean).join(' and ');
    return {text: `Good evening. There’s ${parts}, if you’d like to hear about them.`, mood: 'warm', action: null, intent: 'opener', dataIds: []};
  }
  return {text: 'Good evening. What can I tell you?', mood: 'warm', action: null, intent: 'opener', dataIds: []};
}

export function rexSuggestions(mem, ctx = {}) {
  if (mem.choices?.length) return mem.choices;
  if (blocked(ctx) || mem.declined) return ['Who won last week?', 'Show the records'];
  if (liveOf(ctx).some(c => c.playerStanding)) return ['How am I doing?', 'What’s on?', 'Who won last week?'];
  return ['What’s on?', 'Who won last week?', 'No thanks'];
}

export const rexFarewell = () => 'Good evening.';
export const rexClassify = (mem, text, ctx = {}) => classify(PERSONA, text, mem, ctx);
export const rexLineCount = () => lineCount(PERSONA);

export function rexCharacter(mem = createRex()) {
  return {
    mem,
    reply: (text, ctx, rng) => rexReply(mem, text, ctx, rng),
    opener: ctx => rexOpener(mem, ctx),
    suggestions: ctx => rexSuggestions(mem, ctx),
    farewell: rexFarewell,
  };
}
