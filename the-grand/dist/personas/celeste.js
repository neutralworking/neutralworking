// Celeste, the Bonus Concierge (spec §4.1). A functional NPC for the NPC brain (npc-brain.js).
//
// House rules:
//  - Facts come from data (ctx.data.bonuses) and go on cards; her lines are framing. Summaries, reasons and
//    numbers she speaks are read from the bonus record, never composed.
//  - She never calls a bonus "best", never "free money", never uses urgency language.
//  - She mentions offers unprompted at most once per session, and never after "no thanks".
//  - A deposit requirement is described only when the player asks, and neutrally.
//  - When offers are blocked (ctx.offersBlocked, set by the wellbeing gate or account state) she returns no
//    offer actions at all. The app's gate runs first and would strip them anyway.
//
// Every reply carries {intent, p, via, dataIds} (spec §2.7).

import {respond, classify, lineCount} from '../npc-brain.js';
import {when, money} from '../cards.js';
import {matchClause} from './penrose.js';

export const CELESTE_ID = 101;

// ---------- Which bonus does the player mean? ----------

const KIND_WORDS = {
  deposit_match: ['welcome', 'match', 'first', 'new'], reload: ['reload', 'weekend', 'topup'], cashback: ['cashback', 'sunday', 'loss', 'back'],
  loyalty: ['loyalty', 'regular', 'lounge', 'thank'], no_deposit: ['nodeposit'],
};
const GENERIC = new Set('a an the this that it one bonus bonuses offer offers deal deals promo i me my you your what which how does do is are can for to of on and or please claim take it why when explain tell about more wagering playthrough end ends expire'.split(' '));
const wordsOf = text => String(text).toLowerCase().replace(/top[- ]up/g, 'topup').replace(/no[- ]deposit/g, 'nodeposit').match(/[a-z0-9]+/g)?.filter(w => !GENERIC.has(w)).map(w => (w.length > 4 ? w.replace(/s$/, '') : w)).filter(w => !GENERIC.has(w)) || [];
const keysFor = b => new Set([...wordsOf(b.title), ...wordsOf(b.id.replace(/-/g, ' ')), ...(KIND_WORDS[b.kind] || [])]);
export const REFERS_BACK = /\b(it|that|this|them|those|these|that one|this one|the one|same one)\b/i;

// → {bonus} when the text (or the conversation) points at one bonus, {many} when it could be several.
export function matchBonus(text, bonuses, focusId = null) {
  const list = bonuses || [];
  const q = wordsOf(text);
  const ranked = list.map(b => { const k = keysFor(b); return {b, score: q.filter(w => k.has(w)).length}; }).filter(x => x.score).sort((x, y) => y.score - x.score);
  if (ranked.length && (ranked.length === 1 || ranked[0].score > ranked[1].score)) return {bonus: ranked[0].b};
  if (ranked.length) return {many: ranked.map(x => x.b)};
  const focus = list.find(b => b.id === focusId);
  if (focus && (REFERS_BACK.test(text) || !q.length)) return {bonus: focus};
  if (list.length === 1) return {bonus: list[0]};
  return {many: list};
}

const bonusesOf = ctx => ctx.data?.bonuses || [];
// Open to the player now (claimable) or already theirs (claimed). Locked offers are mentioned, not carded.
const openOf = ctx => bonusesOf(ctx).filter(b => b.claimable || b.claimedAt);
const lockedOf = ctx => bonusesOf(ctx).filter(b => !b.claimable && !b.claimedAt);
const blocked = ctx => !!ctx.offersBlocked;
const termsAction = ref => (ref ? {type: 'show-terms', section: ref.section, clauseId: ref.clauseId} : null);
const stage = (mem, action = null, dataIds = []) => { mem.pending = {action, dataIds}; };
const offersCard = ids => ({type: 'show-offers', kind: 'bonus', ids});
// Choice chips carry the question, so tapping one answers it: "Claim Weekend reload", not just "Weekend reload".
const choose = (mem, list, ask = t => t) => { mem.choices = list.slice(0, 3).map(b => ask(b.title)); };

// The bonus this turn is about: from the text, else from the conversation. Sets focus as a side effect.
function pick(text, ctx, mem, {includeAll = true} = {}) {
  const list = bonusesOf(ctx).filter(b => includeAll || b.claimable);
  const m = matchBonus(text, list, mem.focus);
  if (m.bonus) mem.focus = m.bonus.id;
  return m;
}

// ---------- Persona ----------

const EXPLAIN_RX = [/\bhow (does|do|did) (it|that|this|the|they)\b/i, /\bexplain\b/i, /\btell me (about|more)\b/i, /\bwhat('?s| is) (the |that |this )?[\w ]*(bonus|offer|reload|cashback|loyalty|welcome)\b/i, /\bmore (about|on|details)\b/i, /\bdetails\b/i, /\bwhat do i get\b/i, /\bwhat'?s the catch\b/i];

export const PERSONA = {
  name: 'Celeste',
  moodFor: () => 'warm',
  reactions: [], // functional NPCs never butt into other conversations (spec §3.1)
  intents: [
    {id: 'noThanks', rank: 90,
      patterns: [/\bno,? thanks?\b/i, /\bno thank you\b/i, /\bnot interested\b/i, /\bno offers\b/i, /\bdon'?t want (any|offers|bonuses|it|them)\b/i, /\bstop (offering|showing|mentioning)\b/i, /^\s*(i'?m (good|fine|ok|okay)|no|nah|pass|not now|not tonight)\s*[.!]*\s*$/i],
      effect: mem => { mem.declined = true; mem.choices = null; stage(mem); },
      responses: ['Of course. I won’t bring them up again tonight.', 'Understood. Ask me any time if you change your mind.']},
    {id: 'notEligible', rank: 85,
      patterns: [/\bwhy (can'?t|cannot|can i not|isn'?t|is it not|not|no|don'?t)\b/i, /\bnot (eligible|available|allowed|claimable)\b/i, /\b(locked|unavailable|greyed out)\b/i, /\bhow do i (unlock|get access)\b/i],
      extract: (text, ctx, mem) => {
        const m = pick(text, ctx, mem);
        if (m.bonus) return {b: m.bonus};
        const locked = bonusesOf(ctx).filter(b => !b.claimable && !b.claimedAt);
        if (locked.length === 1 && !REFERS_BACK.test(text) && !/\b(welcome|first|new)\b/i.test(text)) { mem.focus = locked[0].id; return {b: locked[0]}; }
        // Not in her list at all (e.g. the welcome offer for an existing player): the bonus terms explain who it's for.
        const c = matchClause(text, ctx.data, {section: 'bonus'});
        return {b: null, clause: c.kind === 'clause' ? c.clause : null};
      },
      effect: (mem, ctx, s) => {
        if (s.b) stage(mem, termsAction(s.b.termsRef), [s.b.id, s.b.termsRef?.clauseId].filter(Boolean));
        else if (s.clause) stage(mem, termsAction(s.clause), [s.clause.clauseId]);
        else stage(mem);
      },
      responses: [
        {when: (m, c, s) => s.b && !s.b.claimable && !s.b.claimedAt, text: (m, c, s) => `${s.b.title}: ${s.b.notClaimableReason || 'not open to you yet.'} The clause is on the card.`},
        {when: (m, c, s) => s.b?.claimedAt, text: (m, c, s) => `You’ve already claimed ${s.b.title}.`},
        {when: (m, c, s) => s.b?.claimable, text: (m, c, s) => `${s.b.title} is open to you.`},
        {when: (m, c, s) => !s.b && !!s.clause, text: () => 'That one isn’t open to you tonight. The clause explains who it’s for.'},
        {when: (m, c, s) => !s.b && !s.clause, text: () => 'Which bonus did you mean? I’ll check what the terms say.'},
      ]},
    {id: 'claim', rank: 80,
      patterns: [/\bclaim\b/i, /\bredeem\b/i, /\bactivate\b/i, /\bsign me up\b/i, /\bi('ll| will) (take|have)\b(?! a (break|look|rest))/i, /\bi'?d like (it|that|this|the \w+( \w+)? (bonus|offer|one))\b/i, /\bi want (it|that|this|that one|this one|the \w+( \w+)? (bonus|offer|one))\b/i, /^\s*yes,? please\b/i],
      extract: (text, ctx, mem) => ({m: pick(text, ctx, mem)}),
      effect: (mem, ctx, s) => {
        const b = s.m.bonus;
        if (blocked(ctx) || !b) { if (!b && !blocked(ctx)) choose(mem, s.m.many.filter(x => x.claimable), t => `Claim ${t}`); stage(mem); return; }
        mem.choices = null;
        if (b.claimable && !b.claimedAt) stage(mem, {type: 'open-claim', kind: 'bonus', id: b.id}, [b.id]);
        else stage(mem, termsAction(b.termsRef), [b.id]);
      },
      responses: [
        {when: (m, c) => blocked(c), text: () => 'I can’t show offers right now.'},
        // Exactly one of these applies: the brain picks at random among responses whose condition holds.
        {when: (m, c, s) => !blocked(c) && !s.m.bonus && !s.m.many.some(x => x.claimable), text: () => 'There’s nothing to claim right now.'},
        {when: (m, c, s) => !blocked(c) && !s.m.bonus && s.m.many.some(x => x.claimable), text: () => 'Which one would you like?'},
        {when: (m, c, s) => !blocked(c) && !!s.m.bonus?.claimedAt, text: (m, c, s) => `You’ve already claimed ${s.m.bonus.title}.`},
        {when: (m, c, s) => !blocked(c) && s.m.bonus && !s.m.bonus.claimedAt && !s.m.bonus.claimable, text: (m, c, s) => `${s.m.bonus.title} can’t be claimed yet: ${s.m.bonus.notClaimableReason || 'see the terms.'}`},
        {when: (m, c, s) => !blocked(c) && !!s.m.bonus?.claimable, text: (m, c, s) => `${s.m.bonus.title}. Here’s exactly what claiming does.`},
      ]},
    // She never says which bonus is best for the player (spec §4.1 "must not").
    {id: 'recommend', rank: 75,
      patterns: [/\bbest\b/i, /\bwhich (one )?should i\b/i, /\brecommend\w*\b/i, /\bwhat would you (pick|choose|take|go for)\b/i, /\bworth (it|claiming|taking)\b/i, /\bgood (one|deal)\b/i, /\bbetter\b/i],
      effect: (mem, ctx) => { const list = openOf(ctx); stage(mem, blocked(ctx) || !list.length ? null : offersCard(list.map(b => b.id)), list.map(b => b.id)); },
      responses: [
        {when: (m, c) => !blocked(c), text: () => 'That’s not for me to say. Each card has the same facts, side by side.'},
        {when: (m, c) => blocked(c), text: () => 'I can’t show offers right now.'},
      ]},
    {id: 'depositRule', rank: 70,
      patterns: [/\bdeposit\b/i, /\btop[- ]?up\b/i, /\bdo i (need|have) to (pay|deposit|top up|put money)\b/i],
      extract: (text, ctx, mem) => ({m: pick(text, ctx, mem)}),
      effect: (mem, ctx, s) => { const b = s.m.bonus; stage(mem, b ? termsAction(b.termsRef) : null, b ? [b.id] : []); if (!b) choose(mem, s.m.many, t => `Does ${t} need a top-up?`); },
      responses: [
        {when: (m, c, s) => s.m.bonus?.minDeposit, text: (m, c, s) => `${s.m.bonus.title} applies to a top-up of at least ${money(s.m.bonus.minDeposit)}.`},
        {when: (m, c, s) => s.m.bonus && !s.m.bonus.minDeposit, text: (m, c, s) => `${s.m.bonus.title} doesn’t need a top-up.`},
        {when: (m, c, s) => !s.m.bonus, text: () => 'Which bonus? Deposits themselves are the cashier’s business, not mine.'},
      ]},
    {id: 'wagering', rank: 60,
      patterns: [/\bwager(ing|ed|s)?\b/i, /\bplay ?through\b/i, /\brollover\b/i, /\bturnover\b/i, /\bhow many times\b/i],
      extract: (text, ctx, mem) => {
        const m = pick(text, ctx, mem), c = matchClause('wagering', ctx.data, {section: 'bonus'});
        return {b: m.bonus || null, clause: c.kind === 'clause' ? c.clause : null};
      },
      effect: (mem, ctx, s) => { const ref = s.b?.termsRef || s.clause; stage(mem, termsAction(ref), [s.b?.id, ref?.clauseId].filter(Boolean)); },
      responses: [
        {when: (m, c, s) => s.b?.wagering, text: (m, c, s) => `Wagering is how many times bonus credits are played before they become normal credits. ${s.b.title}: ${s.b.wagering.multiplier}× the ${s.b.wagering.appliesTo}.`},
        {when: (m, c, s) => s.b && !s.b.wagering, text: (m, c, s) => `${s.b.title} has no wagering.`},
        {when: (m, c, s) => !s.b, text: () => 'Wagering is how many times bonus credits are played before they become normal credits. Each offer card shows its own.'},
      ]},
    {id: 'expiry', rank: 60,
      patterns: [/\bwhen (does|do|will) (it|they|that|this|the [\w ]+) (end|expire|run out|finish|stop)\b/i, /\bexpir(y|e|es|ing|ation)\b/i, /\bhow long (do i have|is it (on|open|valid|available)|does it last)\b/i, /\bdeadline\b/i, /\bruns? out\b/i, /\btime left\b/i, /\buntil when\b/i],
      extract: (text, ctx, mem) => {
        const m = pick(text, ctx, mem);
        return {m, date: m.bonus ? when(m.bonus.expiresAt, ctx.timeZone) : ''};
      },
      effect: (mem, ctx, s) => { if (s.m.bonus) stage(mem, null, [s.m.bonus.id]); else { choose(mem, s.m.many, t => `When does ${t} end?`); stage(mem); } },
      responses: [
        {when: (m, c, s) => s.m.bonus && !blocked(c), text: (m, c, s) => `${s.m.bonus.title} ends ${s.date}, your time.`},
        {when: (m, c, s) => s.m.bonus && blocked(c), text: () => 'I can’t go into offers right now.'},
        {when: (m, c, s) => !s.m.bonus, text: () => 'Which one? Each card shows its end date too.'},
      ]},
    {id: 'explainBonus', rank: 50,
      patterns: [...EXPLAIN_RX, /^[^?!.]{3,48}[?!.]?$/],
      extract: (text, ctx, mem) => {
        // The catch-all pattern only counts when the whole message is an offer's title.
        if (!EXPLAIN_RX.some(rx => rx.test(text)) && !bonusesOf(ctx).some(b => b.title.toLowerCase() === text.toLowerCase().replace(/[?!.]+$/, '').trim())) return null;
        const m = pick(text, ctx, mem); return m.bonus ? {b: m.bonus, max: money(m.bonus.maxWin)} : null;
      },
      effect: (mem, ctx, s) => { mem.choices = null; stage(mem, termsAction(s.b.termsRef), [s.b.id, s.b.termsRef?.clauseId].filter(Boolean)); },
      responses: [
        {when: (m, c, s) => !!s.b.wagering, text: (m, c, s) => `${s.b.summary} Wagering ${s.b.wagering.multiplier}× the ${s.b.wagering.appliesTo}, ${s.max ? `max win ${s.max}` : 'no win cap'}.`},
        {when: (m, c, s) => !s.b.wagering, text: (m, c, s) => `${s.b.summary} No wagering, ${s.max ? `max win ${s.max}` : 'no win cap'}.`},
      ]},
    {id: 'whatBonuses', rank: 40,
      patterns: [/\b(any|what|which|got|have i got|show( me)?|list|see|are there)\b.{0,24}\b(bonus(es)?|offers?|deals?|promos?|promotions?|rewards?)\b/i, /^\s*(bonus(es)?|offers?|promos?|deals?)\s*\??\s*$/i, /\bwhat('?s| is) (on offer|available|open)\b/i, /\bwhat can i (get|claim)\b/i],
      effect: (mem, ctx) => {
        mem.mentioned = true;
        if (blocked(ctx)) { stage(mem); return; }
        const list = openOf(ctx), locked = lockedOf(ctx);
        mem.choices = locked.length ? ['Claim one', `Why can’t I claim ${locked[0].title}?`, 'What is wagering?'] : null;
        if (list.length === 1) mem.focus = list[0].id;
        stage(mem, list.length ? offersCard(list.map(b => b.id)) : null, list.map(b => b.id));
      },
      responses: [
        {when: (m, c) => blocked(c), text: () => 'I can’t show offers right now.'},
        {when: (m, c) => !blocked(c) && !openOf(c).length, text: (m, c) => (lockedOf(c).length ? 'Nothing is open to you yet. Ask me why, if you like.' : 'Nothing is open to you right now.')},
        {when: (m, c) => !blocked(c) && openOf(c).length >= 1, text: (m, c) => `${openOf(c).length === 1 ? 'One offer is' : `${openOf(c).length} offers are`} open to you tonight${lockedOf(c).length ? `, and ${lockedOf(c).length === 1 ? 'one isn’t' : `${lockedOf(c).length} aren’t`} yet` : ''}. The cards have the details.`},
      ]},
    {id: 'who', rank: 30,
      patterns: [/\bwho are you\b/i, /\bwhat do you do\b/i, /\byour (job|role)\b/i, /\bwhat are you for\b/i, /\bwho('?s| is) celeste\b/i],
      effect: mem => stage(mem),
      responses: ['Celeste, the concierge. I look after the hotel’s bonuses, and the terms that come with them.']},
    {id: 'greet', rank: 10, patterns: [/^\s*(hi|hello|hey|hiya|evening|good (evening|morning|afternoon)|greetings)\b[\s\w.,!]{0,20}$/i],
      effect: mem => stage(mem),
      responses: ['Good evening. How can I help?', 'Evening. Ask me anything about the bonuses.']},
    {id: 'thanks', rank: 10, patterns: [/^\s*(thanks|thank you|cheers|ta|lovely|perfect|great)\b/i],
      effect: mem => stage(mem),
      responses: ['You’re welcome.', 'Any time. I’ll be at the desk.']},
    {id: 'bye', rank: 12, patterns: [/\b(bye|goodbye|good ?night|see you|that'?s all|that is all|nothing else|i'?m done)\b/i],
      effect: mem => stage(mem),
      responses: [{text: 'Good evening. Enjoy The Grand.', ended: true}]},
    {id: 'fallback', fallback: true,
      effect: mem => stage(mem),
      responses: ['I look after the bonuses. Ask me what’s open to you, or how one works.', 'I’m only any use on bonuses, I’m afraid. Ask me about one.']},
  ],
  // Attach the staged action and data ids; never let an offer action through while offers are blocked.
  voice: (result, r, mem, ctx) => {
    const pending = mem.pending || {action: null, dataIds: []};
    mem.pending = null;
    const action = blocked(ctx) && pending.action && (pending.action.type === 'show-offers' || pending.action.type === 'open-claim') ? null : pending.action;
    return {...result, mood: 'warm', action, dataIds: pending.dataIds};
  },
};

// ---------- Public API ----------

export function createCeleste() { return {used: {}, turns: 0, focus: null, choices: null, pending: null, mentioned: false, declined: false}; }

export function celesteReply(mem, input, ctx = {}, rng = Math.random, opts = {}) {
  return respond(PERSONA, mem, input, ctx, rng, opts);
}

// One unprompted mention per session, never after "no thanks", never while offers are blocked.
export function celesteOpener(mem, ctx = {}) {
  const n = bonusesOf(ctx).filter(b => b.claimable).length;
  if (!mem.mentioned && !mem.declined && !blocked(ctx) && n) {
    mem.mentioned = true;
    return {text: `Good evening. There ${n === 1 ? 'is one offer' : `are ${n} offers`} open to you tonight, if you’d like to hear about ${n === 1 ? 'it' : 'them'}.`, mood: 'warm', action: null, intent: 'opener', dataIds: []};
  }
  return {text: 'Good evening. How can I help?', mood: 'warm', action: null, intent: 'opener', dataIds: []};
}

export function celesteSuggestions(mem, ctx = {}) {
  if (mem.choices?.length) return mem.choices;
  if (blocked(ctx) || mem.declined) return ['What is wagering?', 'Who are you?'];
  const focus = bonusesOf(ctx).find(b => b.id === mem.focus);
  if (focus) return [focus.claimable && !focus.claimedAt ? 'Claim it' : 'Why can’t I claim it?', 'When does it end?', 'What is wagering?'];
  return ['Any bonuses?', 'What is wagering?', 'No thanks'];
}

export const celesteFarewell = () => 'Good evening. Enjoy The Grand.';
export const celesteClassify = (mem, text, ctx = {}) => classify(PERSONA, text, mem, ctx);
export const celesteLineCount = () => lineCount(PERSONA);

// The shape app.js registers in its PERSONAS map.
export function celesteCharacter(mem = createCeleste()) {
  return {
    mem,
    reply: (text, ctx, rng) => celesteReply(mem, text, ctx, rng),
    opener: ctx => celesteOpener(mem, ctx),
    suggestions: ctx => celesteSuggestions(mem, ctx),
    farewell: celesteFarewell,
  };
}
