// Simulated bonus claims (NW-177, spec open question 4: a claim grants fictional credits).
// Pure: no DOM, no storage. The app saves `state` as usual.
//
// A claim adds the bonus as fictional bonus credits and records a wagering requirement (grant × multiplier),
// which counts down as the player spins on the bonus's eligible games. Nothing here is money: credits are
// fictional and can't be withdrawn (terms g-1), and nothing converts or expires automatically yet.

export const GAME_NAMES = {gold: 'Grand Sevens', neon: 'Nova Nights'};

// How many fictional credits a claim grants. Fixed-value bonuses grant their amount. Percentage bonuses
// have no real top-up to apply to in the prototype, so the claim simulates the qualifying top-up and grants the cap.
export function claimGrant(bonus) {
  const v = bonus?.value;
  if (!v) return 0;
  if (Number.isFinite(v.amount)) return Math.max(0, Math.floor(v.amount));
  if (Number.isFinite(v.cap?.amount)) return Math.max(0, Math.floor(v.cap.amount));
  return 0;
}
export const grantIsSimulatedCap = bonus => !Number.isFinite(bonus?.value?.amount) && Number.isFinite(bonus?.value?.cap?.amount);
export const wagerTarget = (bonus, grant = claimGrant(bonus)) => (bonus?.wagering ? Math.floor(grant * bonus.wagering.multiplier) : 0);

// Why a bonus can't be claimed right now, or null.
export function claimProblem(state, bonus, now = Date.now()) {
  if (!bonus) return 'unknown';
  if (state.claimed?.[bonus.id]) return 'claimed';
  if (!bonus.claimable) return 'not-claimable';
  if (Date.parse(bonus.startsAt) > now || !(Date.parse(bonus.expiresAt) > now)) return 'expired';
  if (!claimGrant(bonus)) return 'no-value';
  return null;
}

export function claimBonus(state, bonus, now = Date.now()) {
  const problem = claimProblem(state, bonus, now);
  if (problem) return {ok: false, reason: problem};
  const grant = claimGrant(bonus), target = wagerTarget(bonus, grant);
  state.claimed = {...(state.claimed || {}), [bonus.id]: new Date(now).toISOString()};
  state.bonusLedger = {...(state.bonusLedger || {}), [bonus.id]: {granted: grant, target, wagered: 0, games: [...(bonus.eligibleGames || [])], claimedAt: now}};
  state.credits += grant;
  return {ok: true, grant, target};
}

// A round on `game` (engine id) counts towards every claimed bonus that lists that game and still has wagering left.
export function noteWager(state, game, stake) {
  const name = GAME_NAMES[game] || game, touched = [];
  for (const [id, e] of Object.entries(state.bonusLedger || {})) {
    if (e.wagered >= e.target || (e.games.length && !e.games.includes(name))) continue;
    e.wagered = Math.min(e.target, e.wagered + stake);
    touched.push(id);
  }
  return touched;
}

// Validate saved claims (engine.loadState).
export function loadClaims(s) {
  const claimed = {}, bonusLedger = {};
  const id = k => typeof k === 'string' && /^[\w-]{1,60}$/.test(k);
  if (s?.claimed && typeof s.claimed === 'object') for (const [k, v] of Object.entries(s.claimed)) if (id(k) && typeof v === 'string' && !Number.isNaN(Date.parse(v))) claimed[k] = v;
  if (s?.bonusLedger && typeof s.bonusLedger === 'object') for (const [k, e] of Object.entries(s.bonusLedger)) {
    if (!id(k) || !claimed[k] || !e || typeof e !== 'object') continue;
    const n = x => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
    const target = n(e.target);
    bonusLedger[k] = {granted: n(e.granted), target, wagered: Math.min(target, n(e.wagered)), games: Array.isArray(e.games) ? e.games.filter(g => typeof g === 'string').slice(0, 10).map(g => g.slice(0, 40)) : [], claimedAt: n(e.claimedAt)};
  }
  return {claimed, bonusLedger};
}
