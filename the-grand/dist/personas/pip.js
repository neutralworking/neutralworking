// Pip, the Spin Attendant (spec §4.5). A functional NPC for the NPC brain (npc-brain.js), in the Neon Arcade.
//
// House rules (same as Celeste):
//  - Facts come from data (ctx.data.freeSpins) and go on cards; his lines are framing, and any number he
//    speaks is read from the offer record.
//  - Never "free money", never "best", never urgency language.
//  - Mentions spins unprompted at most once per session, never after "no thanks", never while offers are blocked.
//  - Using spins on a game the offer doesn't cover is refused, with the reason built from the offer's data.
//
// Every reply carries {intent, p, via, dataIds} (spec §2.7).

import {respond, classify, lineCount} from '../npc-brain.js';
import {when, money} from '../cards.js';
import {matchBonus} from './celeste.js';
import {gameReason, GAME_IDS} from '../data/spins.js';

export const PIP_ID = 102;

const offersOf = ctx => ctx.data?.freeSpins || [];
const blocked = ctx => !!ctx.offersBlocked;
const stage = (mem, action = null, dataIds = []) => { mem.pending = {action, dataIds}; };
const termsAction = ref => (ref ? {type: 'show-terms', section: ref.section, clauseId: ref.clauseId} : null);
const card = ids => ({type: 'show-offers', kind: 'free_spins', ids});
const left = o => o.remaining ?? o.spins;
const total = ctx => offersOf(ctx).reduce((n, o) => n + left(o), 0);

// The cabinet a message targets, as the engine id ('gold' | 'neon'), and the text left for finding the offer.
// "on <game>" names the target; "my nova spins" names the offer. A lone game mention does both.
const GAMES = '(nova( nights)?|neon|(grand )?sevens?|gold)';
const idOf = name => (/nova|neon/i.test(name) ? 'neon' : 'gold');
export function gameIn(text) {
  const on = new RegExp(`\\b(on|at|in|with|for) (the )?${GAMES}\\b`, 'i').exec(text);
  if (on) return {game: idOf(on[0]), rest: text.replace(on[0], ' '), explicit: true};
  const any = new RegExp(`\\b${GAMES}\\b`, 'i').exec(text);
  if (any) return {game: idOf(any[0]), rest: text.replace(any[0], ' '), explicit: false};
  return {game: null, rest: text};
}

// Resolve which offer (and game) a "use"/"which games" message is about.
// → {offer, game, refuse?} | {many} | {none}
export function resolve(text, ctx, mem) {
  const list = offersOf(ctx), {game, rest, explicit} = gameIn(text);
  if (!list.length) return {none: true, game};
  const m = matchBonus(rest, list, mem.focus);
  let offer = m.bonus || null;
  if (!offer && game) {
    const fits = m.many.filter(o => !gameReason(o, game));
    if (fits.length === 1) offer = fits[0];
    else if (!fits.length) return {game, noneFor: game};
    else return {many: fits, game};
  }
  if (!offer) return {many: m.many, game};
  mem.focus = offer.id;
  return {offer, game, explicit, refuse: game ? gameReason(offer, game) : null};
}

const gameName = id => Object.entries(GAME_IDS).find(([, v]) => v === id)?.[0] || id;
const choose = (mem, list, ask) => { mem.choices = list.slice(0, 3).map(o => ask(o.title)); };

// The offer this turn is about, from the text or the conversation.
function pick(text, ctx, mem) {
  const m = matchBonus(text, offersOf(ctx), mem.focus);
  if (m.bonus) mem.focus = m.bonus.id;
  return m;
}
// Intents that read one fact off one offer share this shape.
const factIntent = (id, patterns, ask, say, rank = 60) => ({
  id, rank, patterns,
  extract: (text, ctx, mem) => ({m: pick(text, ctx, mem)}),
  effect: (mem, ctx, s) => { if (s.m.bonus) { mem.choices = null; stage(mem, null, [s.m.bonus.id]); } else { if (!blocked(ctx)) choose(mem, s.m.many, ask); stage(mem); } },
  responses: [
    {when: (m, c) => blocked(c), text: () => 'I can’t go into offers right now.'},
    {when: (m, c, s) => !blocked(c) && !!s.m.bonus, text: (m, c, s) => say(s.m.bonus, c)},
    {when: (m, c, s) => !blocked(c) && !s.m.bonus && s.m.many.length > 0, text: () => 'Which spins? You have more than one set.'},
    {when: (m, c, s) => !blocked(c) && !s.m.bonus && !s.m.many.length, text: () => 'You don’t have any free spins right now.'},
  ],
});

export const PERSONA = {
  name: 'Pip',
  moodFor: () => 'warm',
  reactions: [], // functional NPCs never butt into other conversations (spec §3.1)
  intents: [
    {id: 'noThanks', rank: 90,
      patterns: [/\bno,? thanks?\b/i, /\bno thank you\b/i, /\bnot interested\b/i, /\bno (offers|spins)\b/i, /\bdon'?t want (any|offers|spins|them|it)\b/i, /\bstop (offering|showing|mentioning)\b/i, /^\s*(i'?m (good|fine|ok|okay)|no|nah|pass|not now|not tonight)\s*[.!]*\s*$/i],
      effect: mem => { mem.declined = true; mem.choices = null; stage(mem); },
      responses: ['No problem. I won’t mention them again tonight.', 'Sure thing. Ask me if you change your mind.']},
    {id: 'recommend', rank: 85,
      patterns: [/\bbest\b/i, /\bwhich( \w+)? should i\b/i, /\brecommend\w*\b/i, /\bwhat would you (pick|choose|play|go for)\b/i, /\bworth (it|using|playing)\b/i, /\bgood (one|deal)\b/i, /\bbetter\b/i, /\bluck(y|ier|iest)?\b/i],
      effect: (mem, ctx) => { const l = offersOf(ctx); stage(mem, blocked(ctx) || !l.length ? null : card(l.map(o => o.id)), l.map(o => o.id)); },
      responses: [
        {when: (m, c) => !blocked(c), text: () => 'Not my call to make. The cards show each one the same way.'},
        {when: (m, c) => blocked(c), text: () => 'I can’t go into offers right now.'},
      ]},
    {id: 'useSpins', rank: 80,
      patterns: [/\b(use|play|spend|try|start|redeem|activate)\b.{0,24}\b(spins?|them|it|those|these)\b/i, /\blet'?s (play|spin|go)\b/i, /\bopen (the |a )?(game|cabinet|machine)\b/i, /^\s*use (on )?(nova|grand|sevens)/i],
      extract: (text, ctx, mem) => ({r: resolve(text, ctx, mem)}),
      effect: (mem, ctx, s) => {
        const {r} = s;
        if (blocked(ctx)) { stage(mem); return; }
        if (r.offer && !r.refuse) {
          mem.choices = null;
          const games = r.offer.eligibleGames || [], game = r.game || (games.length === 1 ? GAME_IDS[games[0]] : null);
          if (game) stage(mem, {type: 'open-claim', kind: 'free_spins', id: r.offer.id, game}, [r.offer.id]);
          else stage(mem, card([r.offer.id]), [r.offer.id]);
          return;
        }
        if (r.offer && r.refuse) { stage(mem, termsAction(r.offer.termsRef), [r.offer.id, r.offer.termsRef?.clauseId].filter(Boolean)); return; }
        if (r.many) choose(mem, r.many, t => `Use ${t}`);
        stage(mem);
      },
      responses: [
        {when: (m, c) => blocked(c), text: () => 'I can’t open spins right now.'},
        {when: (m, c, s) => !blocked(c) && s.r.offer && !s.r.refuse && (s.r.game || (s.r.offer.eligibleGames || []).length === 1), text: (m, c, s) => `${gameName(s.r.game || GAME_IDS[s.r.offer.eligibleGames[0]])} it is. ${left(s.r.offer)} spins at ${money(s.r.offer.spinValue)} each.`},
        {when: (m, c, s) => !blocked(c) && s.r.offer && !s.r.refuse && !s.r.game && (s.r.offer.eligibleGames || []).length > 1, text: () => 'Which game? The card has a button for each.'},
        {when: (m, c, s) => !blocked(c) && !!s.r.refuse, text: (m, c, s) => `Can’t do that one: ${s.r.refuse} The clause is on the card.`},
        {when: (m, c, s) => !blocked(c) && !!s.r.noneFor, text: (m, c, s) => `None of your spins can be used on ${gameName(s.r.noneFor)}.`},
        {when: (m, c, s) => !blocked(c) && !!s.r.none, text: () => 'You don’t have any free spins right now.'},
        {when: (m, c, s) => !blocked(c) && !!s.r.many, text: () => 'Which spins would you like to use?'},
      ]},
    {id: 'whichGames', rank: 82, // a question about where spins work beats "use" inside it
      patterns: [/\bwhich games?\b/i, /\bwhat games?\b/i, /\b(can|do|could) (i|they|these|those) (use|play|be used)\b.{0,30}\bon\b/i, /\bwhere can i (use|play)\b/i, /\bwork(s)? on\b/i, /\b(valid|eligible|good) (on|for)\b/i, /\bwhat (machine|cabinet|slot)s?\b/i],
      extract: (text, ctx, mem) => ({r: resolve(text, ctx, mem)}),
      effect: (mem, ctx, s) => {
        const {r} = s;
        if (r.offer) { mem.choices = null; stage(mem, r.refuse ? termsAction(r.offer.termsRef) : null, [r.offer.id]); }
        else { if (r.many && !blocked(ctx)) choose(mem, r.many, t => `Which games for ${t}?`); stage(mem); }
      },
      responses: [
        {when: (m, c) => blocked(c), text: () => 'I can’t go into offers right now.'},
        {when: (m, c, s) => !blocked(c) && s.r.offer && !s.r.refuse && !s.r.explicit, text: (m, c, s) => `${s.r.offer.title} can be used on ${s.r.offer.eligibleGames.join(' and ')}.`},
        {when: (m, c, s) => !blocked(c) && s.r.offer && !s.r.refuse && !!s.r.explicit, text: (m, c, s) => `Yes. ${s.r.offer.title} can be used on ${gameName(s.r.game)}.`},
        {when: (m, c, s) => !blocked(c) && !!s.r.refuse, text: (m, c, s) => `No. ${s.r.refuse}`},
        {when: (m, c, s) => !blocked(c) && !!s.r.noneFor, text: (m, c, s) => `None of your spins can be used on ${gameName(s.r.noneFor)}.`},
        {when: (m, c, s) => !blocked(c) && !!s.r.none, text: () => 'You don’t have any free spins right now.'},
        {when: (m, c, s) => !blocked(c) && !!s.r.many, text: () => 'Which spins? Each set has its own games.'},
      ]},
    factIntent('spinWagering', [/\bwager(ing|ed|s)?\b/i, /\bplay ?through\b/i, /\brollover\b/i, /\bturnover\b/i, /\bhow many times\b/i, /\bstrings attached\b/i, /\bwhat'?s the catch\b/i], t => `Wagering on ${t}?`,
      o => (o.wagering ? `Winnings from ${o.title} come as bonus credits, wagered ${o.wagering.multiplier}× before they’re normal credits.` : `${o.title} has no wagering on winnings.`)),
    factIntent('maxWin', [/\bmax(imum)? win\b/i, /\bcap(ped)?\b/i, /\bhow much can i win\b/i, /\bmost (i|you) can win\b/i, /\blimit on (winnings|wins|what)\b/i, /\bwin limit\b/i],
      t => `Max win on ${t}?`, o => (money(o.maxWin) ? `${o.title}: winnings are capped at ${money(o.maxWin)} in total.` : `${o.title} has no win cap.`)),
    factIntent('spinValue', [/\bspin value\b/i, /\bvalue\b/i, /\bhow much (is|are) (each|a|one|the|they|it|every)\b/i, /\bworth\b/i, /\bstake\b/i, /\bbet size\b/i, /\bper spin\b/i, /\bhow big\b/i],
      t => `Spin value on ${t}?`, o => `${o.title}: each spin is played at ${money(o.spinValue)}.`, 60),
    {...factIntent('expiry', [/\bwhen (does|do|will) (it|they|that|this|these|those|the [\w ]+) (end|expire|run out|finish|stop|go)\b/i, /\bexpir(y|e|es|ing|ation)\b/i, /\bhow long (do i have|are they (good|valid)|have i got)\b/i, /\bdeadline\b/i, /\bruns? out\b/i, /\btime left\b/i, /\buntil when\b/i],
      t => `When do ${t} expire?`, (o, c) => `${o.title} expire ${when(o.expiresAt, c.timeZone)}, your time.`, 84)}, // "how long do I have to use them" is about time, not using
    {id: 'whatSpins', rank: 40,
      patterns: [/\b(any|what|which|got|have i got|show( me)?|list|see|are there|do i have|how many)\b.{0,24}\b(free )?spins?\b/i, /^\s*(free )?spins?\s*\??\s*$/i, /\btell me (about|more)\b/i, /\bexplain\b/i, /\bdetails\b/i, /\bwhat('?s| is) (on|available)\b/i],
      extract: (text, ctx, mem) => {
        // A named offer narrows the cards to that one; "spins" on its own means all of them.
        const named = /\b(\d+|nova|grand|sevens?|nights?|neon|gold)\b/i.test(text);
        const m = matchBonus(text, offersOf(ctx), null);
        return {one: named && m.bonus ? m.bonus : null};
      },
      effect: (mem, ctx, s) => {
        mem.mentioned = true;
        if (blocked(ctx)) { stage(mem); return; }
        const list = s.one ? [s.one] : offersOf(ctx);
        mem.choices = null;
        if (list.length === 1) mem.focus = list[0].id;
        stage(mem, list.length ? card(list.map(o => o.id)) : null, list.map(o => o.id));
      },
      responses: [
        {when: (m, c) => blocked(c), text: () => 'I can’t show offers right now.'},
        {when: (m, c, s) => !blocked(c) && !offersOf(c).length, text: () => 'You don’t have any free spins right now.'},
        {when: (m, c, s) => !blocked(c) && !!s.one, text: (m, c, s) => `${s.one.title}. The card has the details.`},
        {when: (m, c, s) => !blocked(c) && !s.one && offersOf(c).length === 1, text: () => 'You have one set of spins. The card has the details.'},
        {when: (m, c, s) => !blocked(c) && !s.one && offersOf(c).length > 1, text: (m, c) => `${total(c)} spins across ${offersOf(c).length} offers. The cards have the details.`},
      ]},
    {id: 'who', rank: 30,
      patterns: [/\bwho are you\b/i, /\bwhat do you do\b/i, /\byour (job|role)\b/i, /\bwhat are you for\b/i, /\bwho('?s| is) pip\b/i],
      effect: mem => stage(mem),
      responses: ['Pip. I look after free spins in the Arcade: which games they’re for, and the terms that come with them.']},
    {id: 'greet', rank: 10, patterns: [/^\s*(hi|hello|hey|hiya|yo|evening|good (evening|morning|afternoon)|greetings)\b[\s\w.,!]{0,20}$/i],
      effect: mem => stage(mem),
      responses: ['Hey. How can I help?', 'Evening. Ask me anything about free spins.']},
    {id: 'thanks', rank: 10, patterns: [/^\s*(thanks|thank you|cheers|ta|nice|great|cool)\b/i],
      effect: mem => stage(mem),
      responses: ['Any time.', 'No problem. I’ll be by the cabinets.']},
    {id: 'bye', rank: 12, patterns: [/\b(bye|goodbye|good ?night|see you|later|that'?s all|that is all|nothing else|i'?m done)\b/i],
      effect: mem => stage(mem),
      responses: [{text: 'See you around the Arcade.', ended: true}]},
    {id: 'fallback', fallback: true,
      effect: mem => stage(mem),
      responses: ['I only know about free spins, I’m afraid. Ask me what you’ve got.', 'Free spins are my thing. Ask me which games yours are for.']},
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

export function createPip() { return {used: {}, turns: 0, focus: null, choices: null, pending: null, mentioned: false, declined: false}; }

export function pipReply(mem, input, ctx = {}, rng = Math.random, opts = {}) {
  return respond(PERSONA, mem, input, ctx, rng, opts);
}

// One unprompted mention per session, never after "no thanks", never while offers are blocked.
export function pipOpener(mem, ctx = {}) {
  const n = offersOf(ctx).length;
  if (!mem.mentioned && !mem.declined && !blocked(ctx) && n) {
    mem.mentioned = true;
    return {text: `Hey. You have free spins on ${n === 1 ? 'one offer' : `${n} offers`}, if you’d like to hear about them.`, mood: 'warm', action: null, intent: 'opener', dataIds: []};
  }
  return {text: 'Hey. How can I help?', mood: 'warm', action: null, intent: 'opener', dataIds: []};
}

export function pipSuggestions(mem, ctx = {}) {
  if (mem.choices?.length) return mem.choices;
  if (blocked(ctx) || mem.declined) return ['What is wagering?', 'Who are you?'];
  if (offersOf(ctx).some(o => o.id === mem.focus)) return ['Use them', 'Which games?', 'What’s the max win?'];
  return ['What spins have I got?', 'Which games?', 'No thanks'];
}

export const pipFarewell = () => 'See you around the Arcade.';
export const pipClassify = (mem, text, ctx = {}) => classify(PERSONA, text, mem, ctx);
export const pipLineCount = () => lineCount(PERSONA);

export function pipCharacter(mem = createPip()) {
  return {
    mem,
    reply: (text, ctx, rng) => pipReply(mem, text, ctx, rng),
    opener: ctx => pipOpener(mem, ctx),
    suggestions: ctx => pipSuggestions(mem, ctx),
    farewell: pipFarewell,
  };
}
