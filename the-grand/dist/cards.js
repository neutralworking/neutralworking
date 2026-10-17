// Cards for functional NPCs: rendered from data, never from persona text (spec §3.4, §6).
import { claimGrant, wagerTarget, grantIsSimulatedCap } from './data/claims.js';

// Pure: renderCards(action, data, opts) → [{html, text}]. The talk bar shows the html; the text is
// mirrored into the aria-live region. `data` is the session snapshot of PromoData (spec §3.3).

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = m => (m && Number.isFinite(m.amount) ? `${m.amount.toLocaleString('en-GB')} ${m.currency || ''}`.trim() : '');
export function when(iso, timeZone) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try { return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', ...(timeZone ? { timeZone } : {}) }); }
  catch { return d.toISOString().slice(0, 16).replace('T', ' '); }
}
export function day(iso, timeZone) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(timeZone ? { timeZone } : {}) }); }
  catch { return d.toISOString().slice(0, 10); }
}
// A neutral countdown for live cards (spec §4.2: countdowns on cards only, never in speech).
export function timeLeft(iso, now = Date.now()) {
  const ms = Date.parse(iso) - now;
  if (!(ms > 0)) return '';
  const m = Math.round(ms / 6e4), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? `${d} d ${h} h` : h ? `${h} h ${mm} min` : `${mm} min`;
}
const pct = v => (v && Number.isFinite(v.percent) ? `${v.percent}% up to ${money(v.cap)}` : money(v));

function card({ kind, title, rows = [], body = '', termsRef = null, simulated = true, extra = '' }) {
  const id = `card-${Math.random().toString(36).slice(2, 8)}`;
  const shown = rows.filter(([, v]) => v !== '' && v !== null && v !== undefined);
  const html = `<article class="npc-card" tabindex="0" aria-labelledby="${id}"><header><span class="card-kicker">${esc(kind)}</span><h4 id="${id}">${esc(title)}</h4></header>${body ? `<p class="card-body">${esc(body)}</p>` : ''}${shown.length ? `<dl>${shown.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}${extra}<footer>${termsRef ? `<button type="button" class="card-terms" data-action="show-terms" data-section="${esc(termsRef.section)}" data-clause="${esc(termsRef.clauseId)}">Terms</button>` : ''}${simulated ? '<span class="demo-chip">SIMULATED</span>' : ''}</footer></article>`;
  const text = [`${kind}: ${title}.`, body, ...shown.map(([k, v]) => `${k}: ${v}.`)].filter(Boolean).join(' ');
  return { html, text };
}
const unavailable = (kind, what) => card({ kind, title: `${what} not available yet`, body: 'This information has not been loaded.', simulated: true });

const RENDER = {
  'show-offers'(a, data, o) {
    const isSpins = a.kind === 'free_spins', list = (isSpins ? data?.freeSpins : data?.bonuses) || [];
    const items = a.ids ? list.filter(x => a.ids.includes(x.id)) : list;
    if (!data) return [unavailable(isSpins ? 'FREE SPINS' : 'BONUS', isSpins ? 'Free spins' : 'Bonuses')];
    if (!items.length) return [card({ kind: isSpins ? 'FREE SPINS' : 'BONUS', title: isSpins ? 'No free spins right now' : 'No bonuses right now' })];
    return items.map(x => isSpins
      ? card({ kind: 'FREE SPINS', title: x.title, termsRef: x.termsRef,
        rows: [['Spins', x.remaining ?? x.spins], ['Spin value', money(x.spinValue)], ['Games', (x.eligibleGames || []).join(', ')], ['Expires', when(x.expiresAt, o.timeZone)], ['Wagering', x.wagering ? `${x.wagering.multiplier}× winnings` : 'None'], ['Max win', money(x.maxWin) || 'No cap'],
          ['Won so far', x.progress ? `${x.progress.granted.toLocaleString('en-GB')} bonus credits` : ''], ['Wagering progress', x.progress?.target ? `${x.progress.wagered.toLocaleString('en-GB')} of ${x.progress.target.toLocaleString('en-GB')} credits` : '']],
        extra: x.claimable && (x.remaining ?? x.spins) > 0 ? `<div class="card-actions">${(x.eligibleGames || []).map(g => `<button type="button" data-action="spins-use" data-id="${esc(x.id)}" data-game="${esc(g)}">Use on ${esc(g)}</button>`).join('')}</div>` : '' })
      // No minimum-deposit row: a deposit requirement is only described when the player asks (spec §4.1).
      : card({ kind: 'BONUS', title: x.title, body: x.summary, termsRef: x.termsRef,
        rows: [['Value', pct(x.value)], ['Wagering', x.wagering ? `${x.wagering.multiplier}× ${x.wagering.appliesTo}` : 'None'], ['Max win', money(x.maxWin) || 'No cap'], ['Games', (x.eligibleGames || []).join(', ')], ['Expires', when(x.expiresAt, o.timeZone)],
          ['Status', x.claimedAt ? 'Claimed' : x.claimable ? 'Available' : 'Not available'], ['Why not', !x.claimedAt && x.claimable === false ? (x.notClaimableReason || '') : ''],
          ['Wagering progress', x.progress && x.progress.target ? `${x.progress.wagered.toLocaleString('en-GB')} of ${x.progress.target.toLocaleString('en-GB')} credits` : '']],
        extra: x.claimable && !x.claimedAt ? `<div class="card-actions"><button type="button" data-action="claim-open" data-id="${esc(x.id)}">Claim (simulated)</button></div>` : '' }));
  },
  'show-competitions'(a, data, o) {
    if (!data?.competitions) return [unavailable('COMPETITION', 'Competitions')];
    const list = (a.status === 'upcoming' ? data.competitions.upcoming : a.status === 'live' ? data.competitions.live : [...data.competitions.live, ...data.competitions.upcoming]) || [];
    const items = a.ids ? list.filter(x => a.ids.includes(x.id)) : list;
    if (!items.length) return [card({ kind: 'COMPETITION', title: a.status === 'upcoming' ? 'Nothing scheduled yet' : 'Nothing live right now' })];
    return items.map(x => card({ kind: x.status === 'live' ? 'LIVE COMPETITION' : 'UPCOMING', title: x.title, body: x.scoring, termsRef: x.termsRef,
      rows: [['Starts', when(x.startsAt, o.timeZone)], ['Ends', when(x.endsAt, o.timeZone)], ['Time left', x.status === 'live' ? timeLeft(x.endsAt, o.now) : ''], ['Prizes', (x.prizes || []).map(p => `${p.rank}: ${p.prize}`).join(' · ')], ['Games', (x.eligibleGames || []).join(', ')], ['Entry', x.optInRequired ? (x.optedIn ? 'Opted in' : 'Opt-in required') : 'Automatic'], ['Your standing', x.playerStanding ? `#${x.playerStanding.rank} · ${x.playerStanding.score} pts` : '']] }));
  },
  'show-leaderboard'(a, data) {
    const c = [...(data?.competitions?.live || []), ...(data?.competitions?.upcoming || [])].find(x => x.id === a.competitionId);
    if (!c) return [unavailable('LEADERBOARD', 'Leaderboard')];
    const rows = (c.standings || []).slice(0, 10);
    const extra = rows.length ? `<ol class="card-table">${rows.map(r => `<li${(r.you || (!rows.some(x => x.you) && c.playerStanding?.rank === r.rank)) ? ' class="you"' : ''}><span>#${r.rank}</span><span>${esc(r.displayName)}</span><span>${esc(r.score)}</span></li>`).join('')}</ol>` : '';
    return [card({ kind: 'LEADERBOARD', title: c.title, termsRef: c.termsRef, extra, rows: [['Your standing', c.playerStanding ? `#${c.playerStanding.rank} · ${c.playerStanding.score} pts` : 'Not entered']] })];
  },
  'show-records'(a, data, o) {
    if (!data?.records) return [unavailable('RECORDS', 'Records')];
    const list = a.competitionId ? data.records.filter(r => r.competitionId === a.competitionId) : data.records;
    if (!list.length) return [card({ kind: 'RECORDS', title: 'No results yet' })];
    return list.slice(0, a.limit || 3).map(r => card({ kind: 'RESULTS', title: r.title, simulated: true,
      extra: `<ol class="card-table">${(r.winners || []).slice(0, 5).map(w => `<li><span>#${w.rank}</span><span>${esc(w.displayName)}</span><span>${esc(w.prize)}</span></li>`).join('')}</ol>`,
      rows: [['Ended', when(r.endedAt, o.timeZone)], ...(r.records || []).map(x => [x.label, `${x.value} (${x.holder})`])] }));
  },
  // Mr Penrose's clause card (spec §4.3): the clause verbatim, its version date and a link to the full document.
  // Shown anywhere else (a Terms link on an offer), it also offers to take the player to Penrose.
  'show-terms'(a, data, o) {
    const clause = (data?.terms?.[a.section] || []).find(c => c.clauseId === a.clauseId);
    if (!clause) return [unavailable('TERMS', 'This clause')];
    const link = clause.url ? `<a class="card-link" href="${esc(clause.url)}" target="_blank" rel="noopener">Read the full terms</a>` : '';
    const ask = o.from === 'penrose' ? '' : `<div class="card-actions"><button type="button" data-action="ask-penrose" data-section="${esc(clause.section)}" data-clause="${esc(clause.clauseId)}">Ask Mr Penrose</button></div>`;
    return [card({ kind: `TERMS · ${clause.section.replace(/_/g, ' ').toUpperCase()} · ${clause.clauseId}`, title: clause.heading, body: clause.text, simulated: true,
      rows: [['Version', `${clause.version} · updated ${day(clause.updatedAt, o.timeZone)}`]], extra: link + ask })];
  },
  'open-cashier-info'(a, data) {
    const b = data?.banking;
    if (!b) return [unavailable('BANKING', 'Banking rules')];
    const methods = list => list.map(m => `${m.label}: ${money(m.min)}–${money(m.max)}, ${m.processing}${m.fee ? `, fee ${m.fee}` : ''}`).join(' · ');
    const views = {
      deposit: [['Methods', methods(b.depositMethods || [])]],
      withdraw: [['Methods', methods(b.withdrawalMethods || [])], ['Pending period', b.pendingPeriod || ''], ['Reversal', b.reversalAllowed === undefined ? '' : b.reversalAllowed ? 'Allowed during the pending period' : 'Not allowed']],
      limits: [['Daily', money(b.limits?.daily)], ['Weekly', money(b.limits?.weekly)], ['Monthly', money(b.limits?.monthly)], ['Your own limits', b.limits?.playerSetLimits ? 'You can set your own limits' : '']],
      verification: [['Required', b.verification?.required ? 'Yes' : 'No'], ['When', b.verification?.when || ''], ['Documents', (b.verification?.documents || []).join(', ')]],
    };
    const view = views[a.view] ? a.view : 'withdraw';
    return [card({ kind: 'BANKING', title: { deposit: 'Deposit methods', withdraw: 'Withdrawals', limits: 'Limits', verification: 'Verification' }[view], termsRef: b.termsRef, rows: views[view] })];
  },
  'open-safer-play'(a) {
    const extra = '<div class="card-actions"><button type="button" data-action="safer-play" data-tool="limits">Set limits</button><button type="button" data-action="safer-play" data-tool="timeout">Take a break</button><button type="button" data-action="safer-play" data-tool="exclude">Self-exclusion</button></div>';
    return [card({ kind: 'SAFER PLAY', title: 'Look after yourself', body: 'Tools to set limits, take a break, or step away. Support is available any time.', extra, simulated: true })];
  },
  // Simulated claim panel (NW-177): what the claim grants, as fictional bonus credits, and the wagering it carries.
  'open-claim'(a, data) {
    const x = (data?.bonuses || []).find(b => b.id === a.id);
    if (!x) return [unavailable('CLAIM', 'This bonus')];
    if (x.claimedAt) return [card({ kind: 'CLAIM', title: x.title, body: 'Already claimed.', termsRef: x.termsRef })];
    if (!x.claimable) return [card({ kind: 'CLAIM', title: x.title, body: x.notClaimableReason || 'This bonus can’t be claimed right now.', termsRef: x.termsRef })];
    const grant = claimGrant(x), target = wagerTarget(x, grant), unit = x.value?.cap?.currency || x.value?.currency || 'credits';
    const body = grantIsSimulatedCap(x) ? 'Simulated: the qualifying top-up is assumed, so the full amount is added as fictional bonus credits. Nothing is paid.' : 'Simulated: adds fictional bonus credits. Nothing is paid.';
    return [card({ kind: 'CLAIM', title: x.title, body, termsRef: x.termsRef,
      rows: [['You get', `${grant.toLocaleString('en-GB')} fictional bonus ${unit}`], ['Wagering', target ? `${target.toLocaleString('en-GB')} ${unit} on ${(x.eligibleGames || []).join(', ') || 'any game'}` : 'None'], ['Max win', money(x.maxWin) || 'No cap']],
      extra: `<div class="card-actions"><button type="button" class="primary" data-action="claim-confirm" data-id="${esc(x.id)}">Confirm claim</button><button type="button" data-action="claim-cancel">Not now</button></div>` })];
  },
  'opt-in'(a, data) {
    const c = [...(data?.competitions?.live || []), ...(data?.competitions?.upcoming || [])].find(x => x.id === a.competitionId);
    if (!c) return [unavailable('COMPETITION', 'This competition')];
    if (!c.optInRequired) return [card({ kind: 'ENTRY', title: c.title, body: 'No opt-in needed: play on the eligible games while it’s live counts.', termsRef: c.termsRef })];
    if (c.optedIn) return [card({ kind: 'OPT IN', title: c.title, body: 'You’re opted in.', termsRef: c.termsRef })];
    return [card({ kind: 'OPT IN', title: c.title, body: c.scoring, termsRef: c.termsRef, extra: `<div class="card-actions"><button type="button" class="primary" data-action="opt-in-confirm" data-competition="${esc(c.id)}">Opt in</button><button type="button" data-action="claim-cancel">Not now</button></div>` })];
  },
};

export const CARD_TYPES = Object.keys(RENDER);
export function renderCards(action, data, opts = {}) {
  if (!action || !RENDER[action.type]) return [];
  try { return RENDER[action.type](action, data, opts); }
  catch { return [unavailable('NOTICE', 'This information')]; }
}
