// PromoData (spec §3.2, §3.3): the single source for everything functional NPCs say about offers,
// competitions, records, terms and banking. Personas never invent these facts; they read a snapshot.
//
// interface PromoData {
//   bonuses(player)    → Promise<Bonus[]>          eligible, current offers only
//   freeSpins(player)  → Promise<FreeSpinOffer[]>  eligible, current, with spins remaining
//   competitions()     → Promise<{live, upcoming}> status derived from dates
//   records(filter?)   → Promise<CompetitionResult[]>
//   terms(section)     → Promise<TermsClause[]>
//   banking()          → Promise<BankingRules>
// }
//
// FixtureData implements it over the SIMULATED fixtures in ./fixtures. Fixture dates may be relative
// ("now", "now+2d", "now-2h", "now+5d+4h") so live/upcoming stay fresh; they resolve against an
// injectable clock (anchored at load). ApiData (NW-181) will implement the same interface behind a server-side proxy.

export const TERMS_PAGE = 'terms.html';
export const SECTIONS = ['general', 'bonus', 'competition', 'free_spins', 'banking', 'responsible_gambling', 'privacy'];
const UNIT = { m: 6e4, h: 36e5, d: 864e5 };

// "now+5d+4h" → ISO string. ISO strings pass through. Anything else → null.
export function resolveTime(value, now) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('now')) { const t = Date.parse(value); return Number.isNaN(t) ? null : new Date(t).toISOString(); }
  let t = now;
  const parts = value.slice(3).match(/[+-]\d+[mhd]/g) || [];
  if (parts.join('') !== value.slice(3)) return null;
  for (const p of parts) t += (p[0] === '-' ? -1 : 1) * Number(p.slice(1, -1)) * UNIT[p.slice(-1)];
  return new Date(t).toISOString();
}

// Resolve every *At field (startsAt, endsAt, expiresAt, endedAt, setAt, updatedAt) recursively.
function resolveDates(node, now) {
  if (Array.isArray(node)) return node.map(n => resolveDates(n, now));
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = /At$/.test(k) && typeof v === 'string' ? resolveTime(v, now) : resolveDates(v, now);
  return out;
}
const withUrl = ref => (ref ? { ...ref, url: `${TERMS_PAGE}#${ref.clauseId}` } : ref);

// Offers are only shown to players who can safely receive them (spec §2.3, §5).
export const offersAllowed = p => !!p && p.ageVerified && !p.selfExcluded && !p.coolingOff && !p.limitsReached;

export class FixtureData {
  // Relative dates are anchored once, at load; status and expiry are checked against the live clock,
  // so a race that is live at load ends on time during a long session.
  constructor(fixtures, { now = () => Date.now(), anchor } = {}) { this.now = now; this.anchor = anchor ?? now(); this.data = resolveDates(fixtures, this.anchor); }
  _resolved() { return this.data; }

  bonusesSync(player) {
    if (!offersAllowed(player)) return [];
    const t = this.now();
    return (this._resolved().bonuses || [])
      .filter(b => Date.parse(b.startsAt) <= t && Date.parse(b.expiresAt) > t)
      .filter(b => !b.eligibility?.newPlayersOnly || player.isNew)
      .filter(b => !b.eligibility?.countries || (player.country && b.eligibility.countries.includes(player.country)))
      .map(b => { const claimedAt = player.claimed?.[b.id] || undefined; return { ...b, termsRef: withUrl(b.termsRef), claimedAt, claimable: !!b.claimable && !claimedAt, progress: player.bonusLedger?.[b.id] || undefined }; });
  }
  freeSpinsSync(player) {
    if (!offersAllowed(player)) return [];
    const t = this.now();
    return (this._resolved().freeSpins || [])
      // Spins the player has used here come off the offer's remaining count (NW-178).
      // baseRemaining keeps the offer's own count, so spins.js can recount after a spin without a fresh snapshot.
      .map(f => ({ ...f, baseRemaining: f.remaining ?? f.spins, remaining: Math.max(0, (f.remaining ?? f.spins) - (player.freeSpinsUsed?.[f.id] || 0)), progress: player.bonusLedger?.[`fs:${f.id}`] || undefined }))
      .filter(f => Date.parse(f.expiresAt) > t && f.remaining > 0)
      .map(f => ({ ...f, termsRef: withUrl(f.termsRef) }));
  }
  competitionsSync(player = {}) {
    const t = this.now(), live = [], upcoming = [];
    for (const c of this._resolved().competitions || []) {
      const s = Date.parse(c.startsAt), e = Date.parse(c.endsAt);
      const mine = player.competitions?.[c.id] || {};
      const item = { ...c, termsRef: withUrl(c.termsRef), optedIn: c.optInRequired ? !!mine.optedIn : undefined, playerStanding: mine.standing || undefined };
      if (s <= t && t < e) live.push({ ...item, status: 'live' });
      else if (t < s) upcoming.push({ ...item, status: 'upcoming' });
    }
    const byStart = (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt);
    return { live: live.sort(byStart), upcoming: upcoming.sort(byStart) };
  }
  recordsSync(filter = {}) {
    let list = [...(this._resolved().records || [])].sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt));
    if (filter.competitionId) list = list.filter(r => r.competitionId === filter.competitionId);
    return filter.limit ? list.slice(0, filter.limit) : list;
  }
  termsSync(section) {
    return (this._resolved().terms || []).filter(c => !section || c.section === section).map(c => ({ ...c, url: `${TERMS_PAGE}#${c.clauseId}` }));
  }
  bankingSync() { const b = this._resolved().banking; return b ? { ...b, termsRef: withUrl(b.termsRef) } : null; }

  // The PromoData interface (async, so ApiData can share it).
  async bonuses(p) { return this.bonusesSync(p); }
  async freeSpins(p) { return this.freeSpinsSync(p); }
  async competitions(p) { return this.competitionsSync(p); }
  async records(f) { return this.recordsSync(f); }
  async terms(s) { return this.termsSync(s); }
  async banking() { return this.bankingSync(); }

  // Session snapshot for personas and cards (ctx.data).
  snapshot(player) {
    const terms = {};
    for (const s of SECTIONS) terms[s] = this.termsSync(s);
    return { bonuses: this.bonusesSync(player), freeSpins: this.freeSpinsSync(player), competitions: this.competitionsSync(player), records: this.recordsSync({ limit: 10 }), terms, banking: this.bankingSync(), player: { offersAllowed: offersAllowed(player) } };
  }
}

const FILES = { terms: 'terms.json', bonuses: 'bonuses.json', freeSpins: 'free-spins.json', competitions: 'competitions.json', records: 'records.json', banking: 'banking.json' };
// Shape the six fixture files into one fixtures object.
export function assembleFixtures(files) {
  return { terms: files.terms.clauses, bonuses: files.bonuses.bonuses, freeSpins: files.freeSpins.freeSpins, competitions: files.competitions.competitions, records: files.records.records, banking: files.banking.banking };
}
export async function loadFixtures(base, fetchImpl = globalThis.fetch) {
  const entries = await Promise.all(Object.entries(FILES).map(async ([k, f]) => { const r = await fetchImpl(new URL(f, base)); if (!r.ok) throw new Error(`${f}: ${r.status}`); return [k, await r.json()]; }));
  return assembleFixtures(Object.fromEntries(entries));
}

// The player context functional NPCs see, derived from game state.
export function playerFromState(state, now = Date.now()) {
  return {
    id: 'local', ageVerified: true, // the prototype is 18+ on entry
    selfExcluded: !!state.selfExcluded, coolingOff: !!(state.coolingOffUntil && now < state.coolingOffUntil), limitsReached: !!state.limitsReached,
    isNew: !state.funded, country: state.country || undefined, competitions: state.competitions || {}, claimed: state.claimed || {}, bonusLedger: state.bonusLedger || {}, freeSpinsUsed: state.freeSpinsUsed || {},
  };
}
