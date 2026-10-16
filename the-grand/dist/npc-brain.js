// NPC brain: a small, data-driven conversational engine for scripted characters.
// No model, no network. A persona supplies intents (rules + example phrases), response pools with
// conditions and effects, and reactions to other characters. The engine classifies the input,
// picks a response the character hasn't used recently, fills slots and applies effects.
//
// Functional NPCs (bonuses, competitions, terms) can attach an `action` to a response (e.g. {open: 'bonus-panel'})
// and fill slots from live data via persona.slots(); the engine passes both through untouched.
//
// The classifier returns ranked {id, p} decisions. An external classifier (for example a hosted
// typed-decision model) can replace it by passing {intent, p} to respond(): the persona still writes
// every word.

const STOP = new Set(('a an the i me my mine myself you your yours yourself is are was were be been being am do does did to of in on at for with ' +
  'and or but so if it its this that these those just really very what why how who when where which can could would should will ' +
  'shall have has had not hi hey hello please thank im dont youre lol ok okay oh well about from into out up down there here then ' +
  'than them they we us our get got make made say said tell told some any one all no yes').split(' '));

// Words that mean the same thing to the classifier.
const SYNONYMS = {
  hiya: 'hello', hey: 'hello', hi: 'hello', evening: 'hello', howdy: 'hello', greetings: 'hello',
  gorgeous: 'beautiful', pretty: 'beautiful', stunning: 'beautiful', lovely: 'beautiful', elegant: 'beautiful', fit: 'sexy', hot: 'sexy', cute: 'sexy',
  keycard: 'key', keys: 'key', room: 'suite', rooms: 'suite', bed: 'suite',
  credit: 'money', credits: 'money', cash: 'money', coins: 'money', slots: 'slot', machines: 'machine',
  drinks: 'drink', cocktail: 'drink', cocktails: 'drink', martini: 'drink', wine: 'drink', champagne: 'drink', whisky: 'drink', gin: 'drink',
  smoke: 'cigarette', smoking: 'cigarette', cig: 'cigarette', cigarettes: 'cigarette', fag: 'cigarette',
  dancing: 'dance', danced: 'dance', apologise: 'sorry', apologize: 'sorry', apologies: 'sorry',
  sad: 'unhappy', lonely: 'unhappy', depressed: 'unhappy', miserable: 'unhappy', down: 'unhappy',
  bored: 'boring', dull: 'boring', joke: 'funny', jokes: 'funny', laugh: 'funny',
  dress: 'outfit', fishnets: 'outfit', boa: 'outfit', lipstick: 'outfit', heels: 'outfit',
};

// Typographic apostrophes and quotes (chips, phone keyboards) read as plain ones, so patterns only need ' and ".
export const plain = s => String(s ?? '').replace(/[\u2018\u2019\u02bc]/g, "'").replace(/[\u201c\u201d]/g, '"');
const stem = w => (w.length > 5 ? w.replace(/(ing|edly|ed|ly|es|s)$/, '') : w.length > 3 ? w.replace(/s$/, '') : w);
export function tokens(text) {
  return (String(text).toLowerCase().match(/[a-z0-9']+/g) || [])
    .map(w => w.replace(/'(s|re|m|ll|ve|d)$/, ''))
    .map(w => SYNONYMS[w] || SYNONYMS[stem(w)] || stem(w));
}
const contentTokens = text => tokens(text).filter(w => !STOP.has(w));

// Cosine similarity of two token sets. One shared word is only enough when the input is a single word,
// so "the thing is marmalade" doesn't match "how are things".
function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  const A = new Set(a), B = new Set(b);
  let hit = 0; for (const w of A) if (B.has(w)) hit++;
  if (hit < 2 && A.size > 1) return 0;
  return hit / Math.sqrt(A.size * B.size);
}

// Precompute example token sets once per persona.
function prepare(persona) {
  if (persona._prepared) return persona;
  for (const intent of persona.intents) intent._examples = (intent.examples || []).map(contentTokens).filter(x => x.length);
  persona._prepared = true;
  return persona;
}

// Rank applicable intents. A rule (regex) hit always beats similarity; among rule hits, higher rank wins.
export function classify(persona, text, mem, ctx = {}) {
  prepare(persona);
  text = plain(text);
  const toks = contentTokens(text), out = [];
  for (const intent of persona.intents) {
    if (intent.fallback) continue;
    if (intent.when && !intent.when(mem, ctx)) continue;
    let score = 0, via = null, slots = {};
    if (intent.patterns && intent.patterns.some(re => re.test(text))) { score = 1 + (intent.rank || 0) / 100; via = 'rule'; }
    else if (intent._examples.length && toks.length) {
      const sim = Math.max(...intent._examples.map(ex => similarity(toks, ex)));
      if (sim >= (intent.minSimilarity || .5)) { score = sim * .85; via = 'similar'; }
    }
    if (!score) continue;
    if (intent.extract) { const s = intent.extract(text, ctx, mem); if (!s) continue; slots = s; }
    out.push({ id: intent.id, score, via, slots });
  }
  out.sort((a, b) => b.score - a.score);
  const z = out.reduce((sum, x) => sum + Math.exp(x.score * 6), 0);
  return out.map(x => ({ ...x, p: +(Math.exp(x.score * 6) / z).toFixed(3) }));
}

// Choose a response the character hasn't used recently, honouring each response's condition.
export function choose(mem, key, responses, ctx, slots, rng) {
  const pool = responses.map((r, i) => ({ r: typeof r === 'string' ? { text: r } : r, i })).filter(({ r }) => !r.when || r.when(mem, ctx, slots));
  if (!pool.length) return null;
  const used = new Set(mem.used[key] || []);
  let candidates = pool.filter(x => !used.has(x.i));
  if (!candidates.length) { for (const x of pool) used.delete(x.i); candidates = pool; }
  const pick = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))];
  used.add(pick.i); mem.used[key] = [...used];
  return pick.r;
}

const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
export function fill(text, slots) {
  return String(text).replace(/\{(\^?)(\w+)\}/g, (m, up, k) => {
    const v = slots[k];
    if (v === undefined || v === null) return '';
    return up ? cap(v) : String(v);
  }).replace(/\s{2,}/g, ' ').trim();
}

// Respond to the player. opts.intent lets an external classifier decide the intent.
export function respond(persona, mem, input, ctx = {}, rng = Math.random, opts = {}) {
  prepare(persona);
  const text = plain(input).replace(/\s+/g, ' ').trim().slice(0, 140);
  mem.turns = (mem.turns || 0) + 1;
  mem.used = mem.used || {};
  const base = persona.slots ? persona.slots(mem, ctx, rng) : {};
  const out = (r, intentId, extra = {}, slots = {}) => {
    const all = { ...base, ...slots };
    const line = typeof r.text === 'function' ? r.text(mem, ctx, all) : fill(r.text, all);
    return { text: line, mood: r.mood || extra.mood || persona.moodFor(mem), walkAway: !!r.walkAway, ended: !!r.ended, invite: !!r.invite, needs: r.needs || null, action: r.action || null, intent: intentId, p: extra.p ?? 1, via: extra.via || 'rule' };
  };
  const run = (intentId, slots = {}, extra = {}) => {
    const intent = persona.intents.find(i => i.id === intentId);
    if (!intent) return null;
    if (intent.effect) intent.effect(mem, ctx, slots, rng);
    const all = { ...base, ...slots };
    if (mem.patience !== undefined && mem.patience <= 0 && intent.id !== persona.stormIntent && persona.stormIntent) return run(persona.stormIntent, slots, extra);
    const r = choose(mem, intent.id, intent.responses, ctx, all, rng);
    if (!r) return null;
    if (r.effect) r.effect(mem, ctx, all, rng);
    mem.lastIntent = intent.id;
    const result = out(r, intent.id, { ...extra, mood: intent.mood }, slots);
    // A persona can colour the delivery by mood (accent, language, verbal tics).
    return persona.voice ? persona.voice(result, r, mem, ctx, rng) : result;
  };

  // Pre-filters the persona can define: noise, repeats, shouting.
  if (persona.pre) { const p = persona.pre(mem, text, ctx, rng); if (p) return run(p.intent, p.slots || {}, { via: 'pre' }); }

  if (opts.intent) {
    const intent = persona.intents.find(i => i.id === opts.intent);
    const slots = intent?.extract ? intent.extract(text, ctx, mem) : {};
    if (intent && slots !== null) { const r = run(intent.id, slots || {}, { p: opts.p ?? 1, via: 'external' }); if (r) return r; }
  }
  for (const c of classify(persona, text, mem, ctx)) {
    const r = run(c.id, c.slots, { p: c.p, via: c.via });
    if (r) return r;
  }
  // Fallbacks in order (e.g. callbacks, questions, reflection, filler).
  for (const f of persona.intents.filter(i => i.fallback)) {
    if (f.when && !f.when(mem, ctx)) continue;
    const slots = f.extract ? f.extract(text, ctx, mem, rng) : {};
    if (slots === null) continue;
    const r = run(f.id, slots || {}, { p: 0, via: 'fallback' });
    if (r) return r;
  }
  return { text: '…', mood: persona.moodFor(mem), intent: 'none', p: 0, via: 'none' };
}

// React to something another character said nearby. Returns null when the character stays quiet.
export function react(persona, mem, speaker, said, ctx = {}, rng = Math.random) {
  prepare(persona);
  mem.used = mem.used || {};
  const name = String(speaker || ''), text = String(said || '');
  const base = { ...(persona.slots ? persona.slots(mem, ctx, rng) : {}), speaker: name };
  const pools = (persona.reactions || []).filter(x => (!x.speaker || x.speaker === name) && (!x.match || x.match.test(text)));
  // Most specific first: speaker + topic, then speaker, then topic, then generic.
  pools.sort((a, b) => (!!b.speaker + !!b.match * 2) - (!!a.speaker + !!a.match * 2));
  for (const pool of pools) {
    const r = choose(mem, `react:${pool.speaker || ''}:${pool.match || ''}`, pool.lines, ctx, base, rng);
    if (r) return { text: fill(typeof r === 'string' ? r : r.text, base), mood: 'smug', to: name };
  }
  return null;
}

// Every authored line a persona can say, for coverage checks and content review.
export function lineCount(persona) {
  const intents = persona.intents.reduce((n, i) => n + i.responses.length, 0);
  const reactions = (persona.reactions || []).reduce((n, r) => n + r.lines.length, 0);
  return { intents, reactions, total: intents + reactions };
}
