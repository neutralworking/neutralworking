// Free spins (NW-178). Pure: no DOM, no storage; the app saves `state`.
//
// A free-spin offer is already the player's: "using" it plays rounds at the offer's spin value on an
// eligible game without spending credits. Winnings are paid as fictional bonus credits (terms fs-2), capped
// at the offer's max win across all its spins, and carry wagering (winnings × multiplier) tracked in the
// same ledger as claimed bonuses, under `fs:<offer id>`.

import {spin} from '../engine.js';
import {GAME_NAMES} from './claims.js';

export const GAME_IDS = Object.fromEntries(Object.entries(GAME_NAMES).map(([id, name]) => [name, id]));
export const ledgerKey = offerId => `fs:${offerId}`;

// Spins left on an offer for this player: the offer's own count, less what they've used here. A snapshot offer
// carries baseRemaining (its `remaining` already has use taken off); a raw offer only has remaining/spins.
export function spinsLeft(state, offer) {
  const base = offer?.baseRemaining ?? offer?.remaining ?? offer?.spins ?? 0;
  return Math.max(0, base - (state.freeSpinsUsed?.[offer.id] || 0));
}

// Why these spins can't be used on this game, in words built from the offer's own data. Null when they can.
export function gameReason(offer, game) {
  const name = GAME_NAMES[game] || game, games = offer?.eligibleGames || [];
  if (!games.length || games.includes(name)) return null;
  return `${offer.title} can only be used on ${games.join(' or ')}.`;
}

export function spinProblem(state, offer, game, now = Date.now()) {
  if (!offer) return {code: 'unknown', reason: 'Those spins aren’t available.'};
  if (!offer.claimable) return {code: 'not-claimable', reason: offer.notClaimableReason || `${offer.title} can’t be used right now.`};
  if (!(Date.parse(offer.expiresAt) > now)) return {code: 'expired', reason: `${offer.title} has expired.`};
  if (!spinsLeft(state, offer)) return {code: 'used', reason: `No spins left on ${offer.title}.`};
  const r = gameReason(offer, game);
  if (r) return {code: 'game', reason: r};
  return null;
}

// Play one free spin. Returns {ok, symbols, payout, raw, capped, left, bet} or {ok:false, ...problem}.
export function freeSpin(state, offer, game, rng = Math.random, now = Date.now()) {
  const problem = spinProblem(state, offer, game, now);
  if (problem) return {ok: false, ...problem};
  const bet = Math.max(1, Math.floor(offer.spinValue?.amount || 0));
  // The round runs on a stake the player never paid: a shadow balance holding exactly one spin's value.
  const shadow = {credits: bet, spins: state.spins, wins: state.wins};
  const outcome = spin(shadow, game, rng, bet, 1); // free spins play the middle line, at the offer's spin value
  const key = ledgerKey(offer.id), entry = state.bonusLedger?.[key] || {granted: 0, target: 0, wagered: 0, games: [...(offer.eligibleGames || [])], claimedAt: now};
  const cap = offer.maxWin?.amount, room = Number.isFinite(cap) ? Math.max(0, cap - entry.granted) : Infinity;
  const payout = Math.min(outcome.payout, room);
  entry.granted += payout;
  entry.target = Math.floor(entry.granted * (offer.wagering?.multiplier || 0));
  state.bonusLedger = {...(state.bonusLedger || {}), [key]: entry};
  state.freeSpinsUsed = {...(state.freeSpinsUsed || {}), [offer.id]: (state.freeSpinsUsed?.[offer.id] || 0) + 1};
  state.credits += payout;
  state.spins = shadow.spins;
  state.wins = shadow.wins;
  return {ok: true, symbols: outcome.symbols, rows: outcome.rows, payout, raw: outcome.payout, capped: payout < outcome.payout, left: spinsLeft(state, offer), bet};
}
