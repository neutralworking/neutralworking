// Competitions in the prototype (NW-179). Pure: no DOM, no storage; the app saves `state`.
//
// Opting in is recorded per competition. While a competition is live, rounds on its eligible games add to the
// player's score (prototype scoring: credits won, for every competition kind; the fixture's `scoring` sentence
// is what players read). Standing is the player's place among the competition's fixture standings.
// Nothing here nudges: it records and reports.

export const entryOf = (state, id) => state.competitions?.[id] || null;

// Is the player in this competition? Opt-in competitions need an opt-in; the others count everyone who plays.
export const isEntered = (comp, entry) => (comp.optInRequired ? !!entry?.optedIn : !!entry);

export function optInProblem(state, comp, now = Date.now()) {
  if (!comp) return 'unknown';
  if (!comp.optInRequired) return 'automatic';
  if (entryOf(state, comp.id)?.optedIn) return 'already';
  if (!(Date.parse(comp.endsAt) > now)) return 'finished';
  return null;
}

export function optIn(state, comp, now = Date.now()) {
  const problem = optInProblem(state, comp, now);
  if (problem) return {ok: false, reason: problem};
  state.competitions = {...(state.competitions || {}), [comp.id]: {...(entryOf(state, comp.id) || {score: 0}), optedIn: true, optedInAt: now}};
  return {ok: true};
}

// A round on `gameName` while competitions are live. `comps` are competition records (raw or snapshot).
export function noteCompetitionRound(state, comps, gameName, payout, now = Date.now()) {
  const touched = [];
  for (const c of comps || []) {
    const live = Date.parse(c.startsAt) <= now && now < Date.parse(c.endsAt);
    if (!live || (c.eligibleGames?.length && !c.eligibleGames.includes(gameName))) continue;
    const entry = entryOf(state, c.id);
    if (c.optInRequired && !entry?.optedIn) continue;
    state.competitions = {...(state.competitions || {}), [c.id]: {...(entry || {}), score: (entry?.score || 0) + Math.max(0, Math.floor(payout))}};
    touched.push(c.id);
  }
  return touched;
}

// The player's place among the standings (ties go to whoever got there first, so the player ranks below equals).
export function standingFor(comp, entry) {
  if (!isEntered(comp, entry)) return null;
  const score = entry?.score || 0, ahead = (comp.standings || []).filter(r => r.score >= score).length;
  return {rank: ahead + 1, score};
}

// Standings with the player's row placed by score and everyone below renumbered.
export function standingsWith(comp, standing) {
  const rows = (comp.standings || []).map(r => ({...r}));
  if (!standing) return rows;
  const at = standing.rank - 1;
  rows.splice(at, 0, {rank: standing.rank, displayName: 'You', score: standing.score, you: true});
  return rows.map((r, i) => ({...r, rank: i + 1}));
}

// Validate saved competition entries (engine.loadState).
export function loadCompetitions(s) {
  const out = {};
  const id = k => typeof k === 'string' && /^[\w-]{1,60}$/.test(k);
  if (s?.competitions && typeof s.competitions === 'object') for (const [k, e] of Object.entries(s.competitions)) {
    if (!id(k) || !e || typeof e !== 'object') continue;
    const n = x => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
    out[k] = {score: n(e.score), ...(e.optedIn === true ? {optedIn: true, optedInAt: n(e.optedInAt)} : {})};
  }
  return out;
}
