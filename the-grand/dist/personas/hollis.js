// Hollis, the Cashier (spec §4.4). A functional NPC for the NPC brain (npc-brain.js), at the lobby cashier window.
//
// House rules:
//  - Read-only. Facts come from ctx.data.banking and are read out as written: methods, limits, times, fees,
//    verification, pending period, reversal rule. The card behind each answer is the read-only facts panel.
//  - Never shows a payment form, never asks for payment details (and asks players not to share them),
//    never says "deposit now", never links deposits to offers.
//  - "How do I deposit?" gets the method facts and nothing else.
//  - Reversal: the rule from data, stated plainly, never encouraged.
//  - No unprompted mentions at all: his opener is a greeting.
//
// Every reply carries {intent, p, via, dataIds} (spec §2.7).

import {respond, classify, lineCount} from '../npc-brain.js';
import {money} from '../cards.js';

export const HOLLIS_ID = 104;

const bank = ctx => ctx.data?.banking || null;
const stage = (mem, action = null, dataIds = []) => { mem.pending = {action, dataIds}; };
const view = v => ({type: 'open-cashier-info', view: v});
const range = m => `${money(m.min)} to ${money(m.max)}`;
const list = items => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
const NO_DATA = 'The cashier’s ledger hasn’t come up yet. Try me again shortly.';

// One intent per banking topic: a line built only from the banking record, plus the matching facts panel.
const topic = (id, rank, patterns, cardView, say, extra = {}) => ({
  id, rank, patterns,
  extract: (text, ctx) => ({b: bank(ctx), text}),
  effect: (mem, ctx, s) => { mem.topic = id; stage(mem, s.b ? (typeof cardView === 'function' ? cardView(s) : view(cardView)) : null, s.b ? ['banking'] : []); },
  responses: [
    {when: (m, c, s) => !s.b, text: () => NO_DATA},
    {when: (m, c, s) => !!s.b, text: (m, c, s) => say(s.b, s)},
  ],
  ...extra,
});

// "Card: 10 credits to 5,000 credits, instant; bank transfer: …" — one clause per method, all from data.
const methodLine = (ms, f) => ms.map((m, i) => `${i ? m.label.toLowerCase() : m.label}: ${f(m)}`).join('; ');
const deposits = b => methodLine(b.depositMethods || [], m => `${range(m)}, ${m.processing.toLowerCase()}`);
const withdrawals = b => methodLine(b.withdrawalMethods || [], m => `${range(m)}, ${m.processing.toLowerCase()}`);
const asksAboutDeposits = text => /\b(deposit|top[- ]?up|pay(ing)? in|add (money|funds|credits))\w*\b/i.test(text) && !/\bwithdraw|cash ?out|pay ?out\b/i.test(text);

export const PERSONA = {
  name: 'Hollis',
  moodFor: () => 'warm',
  reactions: [], // functional NPCs never butt into other conversations (spec §3.1)
  intents: [
    // Anything that looks like a card number or security code: never taken, never repeated back.
    {id: 'paymentDetails', rank: 99,
      patterns: [/\b(?:\d[ -]?){13,19}\b/, /\b(cvv|cvc|security code|sort code|iban|pin)\b.{0,20}\d/i, /\bmy card (number|details) (is|are)\b/i],
      effect: mem => stage(mem),
      responses: ['Please don’t share card or bank details here. I never need them, and there are no real payments in this prototype.']},
    {id: 'setLimit', rank: 92,
      patterns: [/\bset (a |my |an? )?((deposit|loss|spending|daily|weekly|monthly|session) ){0,2}limits?\b/i, /\b(limit|cap) (my|how much i) (spend|spending|deposits?|losses|play)\b/i, /\bchange my limits?\b/i, /\b(lower|reduce|raise|remove) my limits?\b/i, /\bput a limit on\b/i, /\bstop me (from )?(spending|losing)\b/i],
      effect: mem => stage(mem, {type: 'open-safer-play', reason: 'limits', view: 'limits'}),
      responses: ['Of course. Your limits are on the card.', 'Here are your limit settings. Lowering one works straight away.']},
    // Offers are not his business, and he never ties a deposit to one.
    {id: 'offers', rank: 90,
      patterns: [/\b(bonus(es)?|offers?|promo(tion)?s?|free spins?|cashback|reload|welcome)\b/i],
      effect: mem => stage(mem),
      responses: ['I only handle banking rules, I’m afraid.']},
    topic('reverseWithdrawal', 88, [/\b(reverse|cancel|undo|stop|take back|chang(e|ed) my mind about)\b.{0,20}\b(withdrawal|cash ?out|pay ?out)\b/i, /\b(withdrawal|cash ?out)\b.{0,20}\b(reversed?|cancell?ed|undone)\b/i, /\breversal\b/i],
      'withdraw', b => (b.reversalAllowed === false ? `Withdrawals can’t be reversed once requested.` : b.reversalAllowed ? `A withdrawal can be reversed during its ${b.pendingPeriod || 'pending'} pending period.` : 'There’s no reversal rule on record.')),
    topic('pendingWithdrawal', 86, [/\bpending\b/i, /\bwhy (is|has) my (withdrawal|cash ?out|pay ?out)\b/i, /\b(withdrawal|cash ?out)\b.{0,20}\b(stuck|waiting|on hold|not (arrived|come|through))\b/i, /\bwhere('?s| is) my (withdrawal|money|cash ?out|pay ?out)\b/i],
      'withdraw', b => (b.pendingPeriod ? `Withdrawals stay pending for ${b.pendingPeriod} before processing starts.` : 'There’s no pending period on record.')),
    topic('verification', 84, [/\bverif\w*\b/i, /\bkyc\b/i, /\b(id|identity|passport|proof of address|documents?)\b/i, /\bwhy do you need my\b/i],
      'verification', b => (b.verification?.required ? `${b.verification.when}, you’ll need to verify: ${list(b.verification.documents)}.` : 'No verification is required.')),
    topic('fees', 82, [/\bfees?\b/i, /\bcharges?\b/i, /\bdoes it cost\b/i, /\b(is|are) (it|there|they) free\b/i, /\bcommission\b/i],
      s => view(asksAboutDeposits(s.text) ? 'deposit' : 'withdraw'),
      (b, s) => {
        const methods = asksAboutDeposits(s.text) ? b.depositMethods || [] : b.withdrawalMethods || [], kind = asksAboutDeposits(s.text) ? 'deposits' : 'withdrawals';
        const listed = methods.filter(m => m.fee), unlisted = methods.filter(m => !m.fee);
        const known = methodLine(listed, m => m.fee.toLowerCase()), label = kind === 'deposits' ? 'Deposit fees' : 'Withdrawal fees';
        return `${label}. ${listed.length ? `${known}.` : 'None are listed.'}${listed.length && unlisted.length ? ` No fee is listed for ${list(unlisted.map(m => m.label.toLowerCase()))}.` : ''}`;
      }),
    topic('limits', 80, [/\blimits?\b/i, /\b(max(imum)?|min(imum)?) (deposit|withdrawal|amount)\b/i, /\bhow much can i (deposit|withdraw|take out|put in)\b/i, /\b(daily|weekly|monthly) (cap|max)\b/i],
      'limits', b => {
        const l = b.limits || {}, parts = [['daily', l.daily], ['weekly', l.weekly], ['monthly', l.monthly]].filter(([, v]) => v).map(([k, v]) => `${money(v)} ${k}`);
        return `Account limits: ${parts.length ? list(parts) : 'none on record'}.${l.playerSetLimits ? ' You can set your own limits too.' : ''}`;
      }),
    topic('processingTimes', 78, [/\bhow long\b/i, /\bhow (fast|quick(ly)?|soon)\b/i, /\bprocessing\b/i, /\bwhen (will|do|does) (i|it|my|the) (get|arrive|receive|clear|land|come)\b/i, /\b(days?|hours?) (to|for) (arrive|clear|process)\b/i, /\btimings?\b/i],
      s => view(asksAboutDeposits(s.text) ? 'deposit' : 'withdraw'),
      (b, s) => (asksAboutDeposits(s.text)
        ? `Deposit times. ${methodLine(b.depositMethods || [], m => m.processing.toLowerCase())}.`
        : `Withdrawal times. ${methodLine(b.withdrawalMethods || [], m => m.processing.toLowerCase())}.`)),
    topic('withdrawalMethods', 76, [/\bwithdraw\w*\b/i, /\bcash ?out\b/i, /\bpay ?outs?\b/i, /\btake (my )?(money|winnings|credits) out\b/i, /\bget my (money|winnings) out\b/i],
      'withdraw', b => `Withdrawal methods. ${withdrawals(b)}.`),
    // Method facts only: no prompt, no encouragement, no link to anything else.
    topic('depositMethods', 74, [/\bdeposit\w*\b/i, /\btop[- ]?up\b/i, /\bpay(ing)? in\b/i, /\badd (money|funds|credits)\b/i, /\bpayment methods?\b/i, /\bhow (do|can) i pay\b/i, /\bwhat methods?\b/i],
      'deposit', b => `Deposit methods. ${deposits(b)}.`),
    topic('bankingTerms', 60, [/\bterms\b/i, /\bsmall print\b/i, /\brules\b/i, /\bclause\b/i],
      s => ({type: 'show-terms', section: s.b.termsRef?.section || 'banking', clauseId: s.b.termsRef?.clauseId || 'k-1'}),
      () => 'The banking terms. Mr Penrose in the Gallery has the rest.'),
    {id: 'who', rank: 30,
      patterns: [/\bwho are you\b/i, /\bwhat do you do\b/i, /\byour (job|role)\b/i, /\bwhat are you for\b/i, /\bwho('?s| is) hollis\b/i],
      effect: mem => stage(mem),
      responses: ['Hollis, the cashier. I can tell you how deposits, withdrawals, limits and verification work. I don’t take payments.']},
    {id: 'greet', rank: 10, patterns: [/^\s*(hi|hello|hey|hiya|evening|good (evening|morning|afternoon)|greetings)\b[\s\w.,!]{0,20}$/i],
      effect: mem => stage(mem),
      responses: ['Good evening. What would you like to know?', 'Evening. Ask me how anything at the cashier works.']},
    {id: 'thanks', rank: 10, patterns: [/^\s*(thanks|thank you|cheers|ta|great|perfect)\b/i],
      effect: mem => stage(mem),
      responses: ['You’re welcome.', 'Any time.']},
    {id: 'bye', rank: 12, patterns: [/\b(bye|goodbye|good ?night|see you|that'?s all|that is all|nothing else|i'?m done)\b/i],
      effect: mem => stage(mem),
      responses: [{text: 'Good evening.', ended: true}]},
    {id: 'fallback', fallback: true,
      effect: mem => stage(mem),
      responses: ['I can tell you about deposits, withdrawals, limits, fees and verification.', 'That’s outside the cashier’s window, I’m afraid. Ask me about withdrawals or limits.']},
  ],
  voice: (result, r, mem) => {
    const pending = mem.pending || {action: null, dataIds: []};
    mem.pending = null;
    return {...result, mood: 'warm', action: pending.action, dataIds: pending.dataIds};
  },
};

// ---------- Public API ----------

export function createHollis() { return {used: {}, turns: 0, topic: null, pending: null}; }

export function hollisReply(mem, input, ctx = {}, rng = Math.random, opts = {}) {
  return respond(PERSONA, mem, input, ctx, rng, opts);
}

// A greeting only: the cashier never brings up money on his own.
export function hollisOpener() {
  return {text: 'Good evening. What would you like to know?', mood: 'warm', action: null, intent: 'opener', dataIds: []};
}

// Suggestions lead with withdrawals and limits; deposits are answered when asked, never suggested.
export function hollisSuggestions() {
  return ['How long do withdrawals take?', 'Set a limit', 'What ID do you need?'];
}

export const hollisFarewell = () => 'Good evening.';
export const hollisClassify = (mem, text, ctx = {}) => classify(PERSONA, text, mem, ctx);
export const hollisLineCount = () => lineCount(PERSONA);

export function hollisCharacter(mem = createHollis()) {
  return {
    mem,
    reply: (text, ctx, rng) => hollisReply(mem, text, ctx, rng),
    opener: () => hollisOpener(),
    suggestions: () => hollisSuggestions(),
    farewell: hollisFarewell,
  };
}
