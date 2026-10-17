// Player-set limits (NW-180). Pure: no DOM, no storage; the app saves `state`.
//
// A daily loss limit on paid play. Lowering it (or setting one) takes effect immediately (terms r-1); raising or
// removing it waits RAISE_DELAY_MS, so a limit can't be lifted in the heat of a session. Losses are the day's net
// result on paid rounds (wins offset losses), counted per calendar day in the player's time zone.
// Reaching the limit stops paid play for the rest of the day and sets `limitsReached`, which pauses offers.

// Whole spins at three lines (75 credits a spin): 2, 4, 10 and 20 spins' worth.
export const LIMIT_OPTIONS = [150, 300, 750, 1500];
// Any limit a player already holds is kept exactly as set, including amounts from before the options changed:
// silently dropping or loosening a safety limit is never acceptable.
const validLimit = v => Number.isInteger(v) && v > 0 && v <= 1e6;
export const RAISE_DELAY_MS = 24 * 36e5;

// Calendar day in the player's time zone (falls back to UTC).
export function dayKey(now = Date.now(), timeZone) {
  try { return new Date(now).toLocaleDateString('en-CA', timeZone ? {timeZone} : {}); }
  catch { return new Date(now).toISOString().slice(0, 10); }
}

// The limit in force now, applying a raise or removal once its wait is over.
export function lossLimit(state, now = Date.now()) {
  const p = state.pendingLossLimit;
  if (p && now >= p.at) { state.lossLimit = p.amount; state.pendingLossLimit = null; }
  return state.lossLimit ?? null;
}

// amount: one of LIMIT_OPTIONS, or null to remove. → {applied: 'now' | 'later' | 'unchanged', at?}
export function setLossLimit(state, amount, now = Date.now()) {
  if (amount !== null && !LIMIT_OPTIONS.includes(amount)) return {applied: 'invalid'};
  const current = lossLimit(state, now);
  if (amount === current) { state.pendingLossLimit = null; return {applied: 'unchanged'}; }
  const tighter = amount !== null && (current === null || amount < current);
  if (tighter) { state.lossLimit = amount; state.pendingLossLimit = null; return {applied: 'now'}; }
  state.pendingLossLimit = {amount, at: now + RAISE_DELAY_MS};
  return {applied: 'later', at: state.pendingLossLimit.at};
}

// Today's net loss on paid play (0 when ahead).
export function lostToday(state, now = Date.now(), timeZone) {
  const d = state.dayNet;
  return d && d.day === dayKey(now, timeZone) ? Math.max(0, -d.net) : 0;
}

export function noteResult(state, net, now = Date.now(), timeZone) {
  const day = dayKey(now, timeZone);
  state.dayNet = state.dayNet?.day === day ? {day, net: state.dayNet.net + net} : {day, net};
  return limitReached(state, now, timeZone);
}

export function limitReached(state, now = Date.now(), timeZone) {
  const limit = lossLimit(state, now);
  return limit !== null && lostToday(state, now, timeZone) >= limit;
}

// Would this paid round's stake take the player past the limit? (Checked before spinning.)
export function wouldExceed(state, stake, now = Date.now(), timeZone) {
  const limit = lossLimit(state, now);
  return limit !== null && lostToday(state, now, timeZone) + stake > limit;
}

// Validate saved limits (engine.loadState).
export function loadLimits(s) {
  const out = {lossLimit: null, pendingLossLimit: null, dayNet: null};
  if (validLimit(s?.lossLimit)) out.lossLimit = s.lossLimit;
  const p = s?.pendingLossLimit;
  if (p && (p.amount === null || validLimit(p.amount)) && Number.isFinite(p.at)) out.pendingLossLimit = {amount: p.amount, at: Math.floor(p.at)};
  const d = s?.dayNet;
  if (d && typeof d.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.day) && Number.isFinite(d.net)) out.dayNet = {day: d.day, net: Math.floor(d.net)};
  return out;
}
