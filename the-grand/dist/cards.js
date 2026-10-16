// Cards for functional NPCs: rendered from data, never from persona text (spec §3.4, §6).
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
      ? card({ kind: 'FREE SPINS', title: x.title, termsRef: x.termsRef, rows: [['Spins', x.remaining ?? x.spins], ['Spin value', money(x.spinValue)], ['Games', (x.eligibleGames || []).join(', ')], ['Expires', when(x.expiresAt, o.timeZone)], ['Wagering', x.wagering ? `${x.wagering.multiplier}×` : 'None'], ['Max win', money(x.maxWin) || 'No cap']] })
      : card({ kind: 'BONUS', title: x.title, body: x.summary, termsRef: x.termsRef, rows: [['Value', pct(x.value)], ['Wagering', x.wagering ? `${x.wagering.multiplier}× ${x.wagering.appliesTo}` : 'None'], ['Min deposit', money(x.minDeposit)], ['Max win', money(x.maxWin) || 'No cap'], ['Games', (x.eligibleGames || []).join(', ')], ['Expires', when(x.expiresAt, o.timeZone)], ['Status', x.claimedAt ? 'Claimed' : x.claimable ? 'Available' : 'Not available']] }));
  },
  'show-competitions'(a, data, o) {
    if (!data?.competitions) return [unavailable('COMPETITION', 'Competitions')];
    const list = (a.status === 'upcoming' ? data.competitions.upcoming : a.status === 'live' ? data.competitions.live : [...data.competitions.live, ...data.competitions.upcoming]) || [];
    const items = a.ids ? list.filter(x => a.ids.includes(x.id)) : list;
    if (!items.length) return [card({ kind: 'COMPETITION', title: a.status === 'upcoming' ? 'Nothing scheduled yet' : 'Nothing live right now' })];
    return items.map(x => card({ kind: x.status === 'live' ? 'LIVE COMPETITION' : 'UPCOMING', title: x.title, body: x.scoring, termsRef: x.termsRef,
      rows: [['Starts', when(x.startsAt, o.timeZone)], ['Ends', when(x.endsAt, o.timeZone)], ['Prizes', (x.prizes || []).map(p => `${p.rank}: ${p.prize}`).join(' · ')], ['Games', (x.eligibleGames || []).join(', ')], ['Entry', x.optInRequired ? (x.optedIn ? 'Opted in' : 'Opt-in required') : 'Automatic'], ['Your standing', x.playerStanding ? `#${x.playerStanding.rank} · ${x.playerStanding.score} pts` : '']] }));
  },
  'show-leaderboard'(a, data) {
    const c = [...(data?.competitions?.live || []), ...(data?.competitions?.upcoming || [])].find(x => x.id === a.competitionId);
    if (!c) return [unavailable('LEADERBOARD', 'Leaderboard')];
    const rows = (c.standings || []).slice(0, 10);
    const extra = rows.length ? `<ol class="card-table">${rows.map(r => `<li${c.playerStanding?.rank === r.rank ? ' class="you"' : ''}><span>#${r.rank}</span><span>${esc(r.displayName)}</span><span>${esc(r.score)}</span></li>`).join('')}</ol>` : '';
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
  'show-terms'(a, data) {
    const clause = (data?.terms?.[a.section] || []).find(c => c.clauseId === a.clauseId);
    if (!clause) return [unavailable('TERMS', 'This clause')];
    return [card({ kind: `TERMS · ${clause.section.replace('_', ' ').toUpperCase()}`, title: clause.heading, body: clause.text, simulated: true,
      rows: [['Version', `${clause.version} · updated ${when(clause.updatedAt)}`]],
      extra: clause.url ? `<a class="card-link" href="${esc(clause.url)}" target="_blank" rel="noopener">Read the full terms</a>` : '' })];
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
  'opt-in'(a, data) {
    const c = [...(data?.competitions?.live || []), ...(data?.competitions?.upcoming || [])].find(x => x.id === a.competitionId);
    if (!c) return [unavailable('COMPETITION', 'This competition')];
    return [card({ kind: 'OPT IN', title: c.title, body: c.scoring, termsRef: c.termsRef, extra: `<div class="card-actions"><button type="button" class="primary" data-action="opt-in-confirm" data-competition="${esc(c.id)}">Opt in</button></div>` })];
  },
};

export const CARD_TYPES = Object.keys(RENDER);
export function renderCards(action, data, opts = {}) {
  if (!action || !RENDER[action.type]) return [];
  try { return RENDER[action.type](action, data, opts); }
  catch { return [unavailable('NOTICE', 'This information')]; }
}
