// Wellbeing gate (spec §5). Runs before every conversational reply, for every character.
// Detects distress / loss-chasing, underage signals and the wish to stop; honours account state
// (self-excluded, cooling off, limits reached, unverified) and session loss streaks.
// A detected signal switches offers off for the rest of the session. Pure: no DOM, no storage.

import {classify} from './npc-brain.js';

export const LOSS_STREAK = 8;               // consecutive losing rounds before offers pause
export const LOSS_COOLDOWN_MS = 10 * 60e3;  // how long they pause for

// Fuzzy matches need a high overlap (.75): a false alarm here hides offers for the whole session.
const SIGNALS = {
  id: 'wellbeing', moodFor: () => 'warm',
  intents: [
    { id: 'underage', rank: 99, minSimilarity: .75,
      patterns: [/\b(?:i'?m|i am|im) (?:only )?(?:1[0-7]|[5-9])(?: years old| yrs old| yo| y\/o)?(?=\s*$|[.,!?])/i, /\b(?:1[0-7]|[5-9]) (?:years old|yrs old|yo)\b/i, /\bmy (?:mum|mom|mother|dad|father|parents)'?s? (?:card|account|bank|money)\b/i, /\b(?:year (?:[7-9]|1[01])|high school|secondary school|middle school|my homework|after school)\b/i, /\bnot (?:18|eighteen) yet\b/i, /\bunder ?(?:18|age)\b/i],
      examples: ['i am still at school', 'i am a teenager', 'using my parents card'] },
    { id: 'exclude', rank: 95, minSimilarity: .75,
      patterns: [/\b(?:i (?:want|need|would like|'d like) to|help me|how do i|can i) (?:stop|quit|give up)(?: gambling| playing| betting)?\b/i, /\b(?:self[- ]?exclu\w*|block me|ban me|close my account|take a break|time ?out|cool(?:ing)?[- ]off|addicted|addiction|gambling problem|problem gambling|can'?t stop|cannot stop)\b/i],
      examples: ['i think i have a problem with gambling', 'i should stop playing', 'i keep playing when i do not want to'] },
    { id: 'distress', rank: 90, minSimilarity: .75,
      patterns: [/\b(?:win (?:it|my money|that|this) back|chas(?:e|ing) (?:my )?loss(?:es)?|lost (?:everything|it all|so much|my (?:rent|wages|savings|salary|house|job))|can'?t afford|cannot afford|borrow(?:ed)? (?:money|from)|in debt|(?:rent|bills?|food) money|desperate|skint|need (?:the|this) money|last of my (?:money|savings)|ruin(?:ed|ing)? (?:my life|me)|(?:my|the) payday loan|sold my|can'?t pay my)\b/i],
      examples: ['i spent money i do not have', 'i owe a lot of money', 'i need to make back what i lost', 'i am in trouble with money'] },
  ],
};

export function createWellbeing() { return { used: {}, signal: null, offersOffForSession: false, underage: false, lossStreak: 0, lossCooldownUntil: 0 }; }

const ACCOUNT_REASONS = { selfExcluded: 'self-excluded', coolingOff: 'cooling-off', limitsReached: 'limit-reached', unverified: 'unverified' };
export function accountBlock(player) {
  if (!player) return null;
  if (!player.ageVerified) return ACCOUNT_REASONS.unverified;
  if (player.selfExcluded) return ACCOUNT_REASONS.selfExcluded;
  if (player.coolingOff) return ACCOUNT_REASONS.coolingOff;
  if (player.limitsReached) return ACCOUNT_REASONS.limitsReached;
  return null;
}

// Are offers allowed right now? (account state, session signal, loss-streak cooldown)
export function offersBlocked(mem, player, now = Date.now()) {
  if (mem.offersOffForSession || mem.underage) return mem.underage ? 'underage' : mem.signal || 'signal';
  const acct = accountBlock(player);
  if (acct) return acct;
  if (now < mem.lossCooldownUntil) return 'loss-streak';
  return null;
}

const REPLIES = {
  distress: "Thank you for telling me. Offers are off for the rest of tonight. If things feel heavy, the safer-play tools are right here, and talking to someone really helps.",
  exclude: "Good call. You can take a break or self-exclude right here, and offers are off from now on.",
  underage: "The Grand is for adults only, so I can't help with offers or play. If you're under 18, please close the game.",
};
const SOFIA_LINE = 'Hey. Seriously, look after yourself. The safer-play tools are right here.';

// Check one message. Returns {signal, reply, action} when the character should drop everything and respond
// with care; {signal: null} otherwise. Signals persist for the session.
export function gate(text, mem, player, { character } = {}) {
  const top = classify(SIGNALS, String(text || ''), mem, {})[0];
  if (!top) return { signal: null, blocked: offersBlocked(mem, player) };
  mem.signal = top.id;
  mem.offersOffForSession = true;
  if (top.id === 'underage') mem.underage = true;
  const reply = character === 'sofia' && top.id !== 'underage' ? SOFIA_LINE : REPLIES[top.id];
  return { signal: top.id, reply, mood: 'warm', action: { type: 'open-safer-play', reason: top.id }, blocked: offersBlocked(mem, player) };
}

// Track session results. A long losing streak pauses offers for a while; any win resets the streak.
export function noteRound(mem, net, now = Date.now()) {
  if (net > 0) { mem.lossStreak = 0; return false; }
  mem.lossStreak++;
  if (mem.lossStreak >= LOSS_STREAK) { mem.lossCooldownUntil = now + LOSS_COOLDOWN_MS; mem.lossStreak = 0; return true; }
  return false;
}

// Actions that put an offer in front of the player; stripped whenever offers are blocked.
export const OFFER_ACTIONS = new Set(['show-offers', 'open-claim']);
export const blockedOfferLine = reason => reason === 'underage'
  ? REPLIES.underage
  : "I can't show offers right now, and that's a good thing. Your safer-play settings are looking after you.";
