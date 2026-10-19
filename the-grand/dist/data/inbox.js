// The inbox (bottom menu). Pure: no DOM, no storage; the app saves `state`.
// Receipts and account notices only: claims, opt-ins, limits, breaks, pauses. Never marketing, so the unread
// count is always something the player did or something that affects their account.

export const INBOX_MAX = 30;
export const KINDS = ['receipt', 'safety', 'notice'];
export const WELCOME = {kind: 'notice', title: 'Welcome to The Grand', body: 'Receipts and account notices arrive here: claims, opt-ins, limits and breaks. Never marketing.'};

export function addMessage(state, {kind = 'notice', title, body = ''}, now = Date.now()) {
  const list = state.inbox || [];
  const id = list.reduce((n, m) => Math.max(n, m.id), 0) + 1;
  state.inbox = [{id, t: now, kind: KINDS.includes(kind) ? kind : 'notice', title: String(title).slice(0, 80), body: String(body).slice(0, 280), read: false}, ...list].slice(0, INBOX_MAX);
  return state.inbox[0];
}
export const unreadCount = state => (state.inbox || []).filter(m => !m.read).length;
export function markAllRead(state) { for (const m of state.inbox || []) m.read = true; }

// Validate saved messages (engine.loadState). A save with no inbox yet gets the welcome note.
export function loadInbox(s) {
  if (!Array.isArray(s?.inbox)) return [{id: 1, t: 0, ...WELCOME, read: false}];
  const seen = new Set();
  return s.inbox.filter(m => m && Number.isInteger(m.id) && !seen.has(m.id) && seen.add(m.id) && typeof m.title === 'string')
    .slice(0, INBOX_MAX)
    .map(m => ({id: m.id, t: Number.isFinite(m.t) && m.t >= 0 ? Math.floor(m.t) : 0, kind: KINDS.includes(m.kind) ? m.kind : 'notice', title: m.title.slice(0, 80), body: typeof m.body === 'string' ? m.body.slice(0, 280) : '', read: m.read === true}));
}
