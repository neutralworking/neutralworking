// Sofia — The Grand's resident con artist.
// Pure dialogue engine: no DOM, no storage, deterministic with an injected rng.
// She lies about who she is, gossips about the other guests and runs a long con for your room key.
// House rule: she is unpleasant, but she never nudges the player to spend or fund credits.

export const SOFIA_VERSION = 1;

const STOP = new Set(("a an the i me my mine myself you your yours yourself is are was were be been being am do does did " +
  "to of in on at for with and or but so if it its it's this that these those just really very what why how who when " +
  "where which can could would should will shall have has had not no yes hi hey hello please thanks thank im i'm dont " +
  "don't youre you're lol ok okay oh well about from into out up down there here then than them they we us our sofia " +
  "like want know think going get got make made say said tell told").split(' '));

// Every "who are you" gets a fresh lie, and she remembers each one so you can catch her out.
const LIES = [
  'a duchess. Technically',
  'the architect of this hotel. The good parts',
  'a retired jewel appraiser',
  "here on the owner's personal invitation",
  "a concert pianist. I stopped playing. It upset people how good I was",
  "the hotel's mystery inspector. Smile, you're being graded",
];

const GOSSIP = {
  jules: ["Jules? He wears borrowed cufflinks. Mine, actually.", "Jules tips in compliments. The staff are planning something."],
  mika: ["Mika came for a quick look three months ago. Nobody has the heart to tell her checkout was at noon.", "Mika says she's 'still here'. So is the mould in 212."],
  theo: ["Theo thinks the Gold Lounge loves him. The Gold Lounge loves his tab.", "Theo asked me to dinner once. I sent my coat. It had a lovely time."],
};

const ROOM_BARBS = {
  suite: 'Your suite. My future suite. Details.',
  lobby: 'The lobby. Where people with nowhere better to be wait to be noticed.',
  gold: 'The Gold Lounge. All velvet, no taste.',
  neon: "The Neon Arcade. It's for people who peaked.",
  roof: "The rooftop. The view's wasted on most of you.",
};

const NOT_NAMES = new Set(['fine','good','great','ok','okay','sorry','here','not','just','so','very','really','bored','tired',
  'lost','new','back','alright','well','sure','leaving','going','done','happy','sad','hungry','busy','lonely','confused','the','a']);

const RX = {
  bye: /\b(bye|goodbye|good ?night|see (you|ya)|later then|i(?:'m| am) (?:leaving|off|going now))\b/i,
  kickOut: /\b(get out|go away|leave me alone|leave my|out of my|piss off|please leave|time to go|you should go)\b/i,
  hosting: /\b(welcome|make yourself at home|drink|glass|reserve|champagne|pour|cheers)\b/i,
  why: /\b(why|what for|what do you want it for)\b/i,
  invite: /\b(come (?:up|over|with me|to my)|visit me|invite|join me|nightcap|drinks? (?:in|at) my|my (?:suite|room|place) (?:later|tonight|now)|up to (?:408|my))\b/i,
  nameIs: /\b(?:my name(?:'s| is)|call me|the name's)\s+([A-Za-z][A-Za-z'-]{1,17})/i,
  nameSoft: /\b(?:i am|i'm|im|it's|its)\s+([A-Z][a-z'-]{1,17})\b/,
  whoAreYou: /\b(who are you|what(?:'s| is) your name|your name|tell me about (?:yourself|you)|what do you do|where are you from|what are you|who r u)\b/i,
  liar: /\b(liar|lying|you lie|lies|you said|that's not true|thats not true|not true|you told me|thought you were|i thought you)\b/i,
  threat: /\b(report|manager|security|police|reception|complain|ban(?:ned)?|kick you out|throw you out|call the)\b/i,
  profanity: /\b(f+u+c+k\w*|shit\w*|bitch\w*|bastard|wanker|twat|dick|ass(?:hole)?|piss off|crap)\b/i,
  insult: /\b(stupid|idiot|dumb|ugly|hate you|rude|awful|horrible|nasty|shut up|annoying|loser|witch|evil|bad person|terrible|creep|fool|you(?:'re| are) (?:so )?(?:mean|boring|old|the worst))\b/i,
  apology: /\b(sorry|apolog\w*|my bad|forgive me)\b/i,
  flirt: /\b(date|kiss|marry|love you|fancy you|go out with|dinner with me|you(?:'re| are) (?:so )?(?:cute|sexy|hot))\b/i,
  compliment: /\b(beautiful|gorgeous|pretty|lovely|elegant|stunning|smart|clever|amazing|nice (?:dress|hair|outfit|shoes|style|coat)|love your|like your|cool|charming|you look (?:great|good|nice|amazing|lovely))\b/i,
  howAreYou: /\b(how are you|how're you|how(?:'s| is) it going|how you doing|you ok|you alright|how have you been)\b/i,
  greet: /^\s*(hi|hey|hello|evening|good evening|hiya|yo|howdy|greetings|morning|afternoon)\b/i,
  room: /\b(suite|room|key|keys|408|keycard|door|bed|let yourself in|broke in|break in|get in|got in)\b/i,
  money: /\b(credits?|money|rich|broke|cash|win|won|jackpot|slots?|machines?|spin|bet|gamble|lucky|luck|casino|deposit\w*|fund\w*|pay\w*|buy\w*|purchas\w*|top ?up|wallet)\b/i,
  guest: /\b(jules|mika|theo)\b/i,
  likes: /\bi (?:really )?(?:like|love|enjoy|adore)\s+([a-z][a-z' -]{1,40})/i,
  places: /\b(where|explore|lobby|roof(?:top)?|arcade|neon|lounge|gold|bar|drinks?|cocktails?|view|floor|go next)\b/i,
  help: /\b(help|advice|tips?|recommend|suggest|what should i)\b/i,
  yes: /^\s*(yes|yeah|yep|yup|sure|ok(?:ay)?|fine|alright|of course|why not|go on|take it|deal)\b/i,
  no: /^\s*(no|nope|nah|never|no way|absolutely not|not a chance|i don't think so)\b/i,
  question: /\?\s*$|^\s*(what|why|how|when|where|who|do|does|did|are|can|could|is|will|would|should)\b/i,
};

export function createSofia() {
  return { version: SOFIA_VERSION, turns: 0, patience: 5, name: null, likes: [], lies: [], used: {},
    scheme: 0, pending: null, insults: 0, flattered: 0, lastUser: '', met: 0, refusedInvite: 0, visits: 0 };
}

// Defensive restore from storage: anything malformed falls back to a fresh Sofia.
export function loadSofia(raw) {
  const d = createSofia();
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== SOFIA_VERSION) return d;
    for (const k of ['turns', 'insults', 'flattered', 'met']) if (Number.isFinite(s[k]) && s[k] >= 0) d[k] = Math.floor(s[k]);
    if (Number.isFinite(s.patience)) d.patience = Math.max(0, Math.min(5, Math.floor(s.patience)));
    if (Number.isInteger(s.scheme) && s.scheme >= 0 && s.scheme <= 2) d.scheme = s.scheme;
    if (typeof s.name === 'string' && /^[A-Za-z][A-Za-z'-]{0,17}$/.test(s.name)) d.name = s.name;
    if (Array.isArray(s.likes)) d.likes = s.likes.filter(x => typeof x === 'string').map(x => x.slice(0, 40)).slice(-5);
    if (Array.isArray(s.lies)) d.lies = s.lies.filter(x => LIES.includes(x)).slice(-6);
    if (s.pending === 'key' || s.pending === null) d.pending = s.pending;
    for (const k of ['refusedInvite', 'visits']) if (Number.isFinite(s[k]) && s[k] >= 0) d[k] = Math.floor(s[k]);
    // A fresh visit restores a little patience; she holds grudges, not forever.
    d.patience = Math.min(5, Math.max(d.patience, 2));
    return d;
  } catch { return d; }
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// Pick a line she hasn't used recently for this intent; reset once all are spent.
function pick(mem, key, lines, rng) {
  const used = new Set(mem.used[key] || []);
  let pool = lines.map((l, i) => i).filter(i => !used.has(i));
  if (!pool.length) { used.clear(); pool = lines.map((l, i) => i); }
  const i = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  used.add(i); mem.used[key] = [...used];
  return lines[i];
}

// Payment vocabulary is never echoed back: she can sneer at the machines, but she doesn't sell anything.
const NO_ECHO = /^(deposit|fund|pay|buy|purchas|topup|wallet)/;
function salientWord(text) {
  const words = text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || [];
  return words.filter(w => !STOP.has(w) && !NO_ECHO.test(w)).sort((a, b) => b.length - a.length)[0] || null;
}

function moodFor(mem) { return mem.patience <= 0 ? 'furious' : mem.patience <= 2 ? 'annoyed' : mem.scheme === 1 ? 'scheming' : 'smug'; }

// What she calls you: your real name only once you've told her, otherwise something worse.
function addressee(mem, ctx, rng) {
  if (mem.name) return mem.name;
  return rng() < .5 ? 'darling' : 'Four-Oh-Eight';
}

export function sofiaOpener(mem, ctx = {}, rng = Math.random) {
  mem.met++;
  const you = addressee(mem, ctx, rng);
  let text;
  if (ctx.visitor) text = (mem.visits = (mem.visits || 0) + 1) > 1 ? "Back in 408. I've already moved your sofa. Don't move it back." : 'So this is 408. Smaller than the brochure. The Reserve will do.';
  else if (mem.patience <= 1) text = 'Oh. You again.';
  else if (ctx.hat === 'fedora') text = 'Nice fedora. Won or stolen? I won\'t judge. I\'ll just assume.';
  else if (mem.name) text = `${mem.name}. You came back. They always do.`;
  else if (mem.met > 1) text = `Back again, ${you}? Still haven't told me your name. Wise.`;
  else text = "Well, well. The new resident of 408. I've heard nothing about you, which is impressive.";
  return { text, mood: moodFor(mem), walkAway: false };
}

// Her parting shot when you walk off mid-conversation.
export function sofiaWalkedOff(mem, rng = Math.random) {
  return { text: pick(mem, 'walkoff', ['Walking away mid-sentence. Rude. I respect it.', 'Go on, then. I was finished anyway.', "Don't worry, I'll tell everyone you said hello."], rng), mood: moodFor(mem), walkAway: false };
}

export function sofiaReply(mem, input, ctx = {}, rng = Math.random) {
  const raw = String(input || '').trim().slice(0, 140);
  const text = raw.replace(/\s+/g, ' ');
  const lower = text.toLowerCase();
  mem.turns++;
  const say = (line, extra = {}) => ({ text: line, mood: moodFor(mem), walkAway: false, ...extra });
  const you = addressee(mem, ctx, rng);

  // Noise, repeats and shouting first: she notices everything.
  if (!/[a-z]/i.test(text)) return say(pick(mem, 'noise', ['Use words, darling.', 'Was that a sneeze?', 'Fascinating. Truly. No.'], rng));
  // Repeats are teased, except when the repeat is a question whose answer has changed (an invite, the key).
  const repeated = lower === mem.lastUser && !RX.invite.test(text) && mem.pending !== 'key';
  mem.lastUser = lower;
  if (repeated) return say('You said that already. I was ignoring it the first time too.');
  const shouting = text.length > 4 && text === text.toUpperCase() && /[A-Z]{3}/.test(text);

  // 1. Pending answers to her schemes.
  if (mem.pending === 'key') {
    if (RX.yes.test(text)) { mem.pending = null; mem.scheme = 2; return say('Wonderful. I had it copied this morning, but it\'s nice to have permission.', { mood: 'delighted' }); }
    if (RX.no.test(text)) { mem.pending = null; return say(pick(mem, 'keyno', ['Pity. Jules said yes in under a minute.', 'Fine. I\'ll ask housekeeping. They adore me. Or fear me. Same thing.'], rng)); }
    if (RX.why.test(text)) return say('The view. Your minibar. And, briefly, your identity. So: yes?', { mood: 'scheming' });
  }

  // Invitations: she only visits a suite with The Grand Reserve on ice. She states the terms; she never sells them.
  if (RX.invite.test(text)) {
    if (ctx.visitor || ctx.room === 'suite') return say("I'm already here, darling. Keep up.");
    if (mem.patience <= 1) return say('After the way you spoke to me? Earn it back first.');
    if (!ctx.canHost) {
      mem.refusedInvite = (mem.refusedInvite || 0) + 1;
      return say(mem.refusedInvite > 1
        ? 'Still no Grand Reserve? Then still no Sofia. Those are the rules. I wrote them.'
        : 'Your suite? Without The Grand Reserve on ice? I don\'t do dry visits.', { needs: 'reserve' });
    }
    return say(pick(mem, 'accept', ['The Grand Reserve? Well. Lead the way. Don\'t touch my coat.', 'You found the Reserve. I underestimated you. Slightly. Let\'s go.'], rng), { mood: 'delighted', invite: true });
  }

  if (ctx.visitor && RX.hosting.test(text)) return say(pick(mem, 'hosting', ["Don't mind if I do. I'll pour. You'll watch.", 'Cheers. To you, darling. Briefly.', "The Reserve. Finally, something in 408 with some breeding."], rng), { mood: 'delighted' });

  if (RX.kickOut.test(text)) {
    if (ctx.visitor) return say(pick(mem, 'kicked', ["Fine. I was leaving anyway. I've seen the minibar. It's seen me.", "Throwing me out of my future suite? Bold. I'll be back for the curtains."], rng), { ended: true });
    return say("Go away? I was here first. I'm always here first.");
  }

  if (RX.bye.test(text)) return say(pick(mem, 'bye', ['Leaving? I\'ll tell the others you were charming. Nobody will believe me.', 'Run along. Mind the third step, it\'s loose. I loosened it.', 'Goodnight. Lock your door. Not that it helps.'], rng), { ended: true });

  // 2. Catching her out.
  if (RX.liar.test(text)) {
    if (mem.lies.length >= 2) {
      const [a, b] = mem.lies.slice(-2);
      return say(`I said I was ${a.split('.')[0]}? I also said I was ${b.split('.')[0]}. Both true. Keep up.`);
    }
    if (mem.lies.length === 1) return say(`Lying? Me? I'm ${mem.lies[0].split('.')[0]}. We don't lie. We 'curate'.`);
    return say('I never lie, darling. I just tell the truth very selectively.');
  }

  // 3. Hostility, threats and making up.
  if (RX.threat.test(text)) {
    mem.patience -= 1;
    if (mem.patience <= 0) return storm(mem, rng, say);
    return say(pick(mem, 'threat', ['The manager owes me four favours and a kidney. Go ahead.', 'Security? Marcus? He walks me to my room. Every night.', 'Complain to reception. Tell them Sofia sent you. Watch what happens.'], rng));
  }
  if (RX.profanity.test(text) || RX.insult.test(text)) {
    mem.insults++; mem.patience -= RX.profanity.test(text) ? 2 : 1;
    if (mem.patience <= 0) return storm(mem, rng, say);
    if (/bad person|evil|witch/i.test(text)) return say("Bad? I'm efficient. There's a difference, and it's mostly paperwork.");
    return say(pick(mem, 'insult', ['Charming. Did you practise that in the mirror?', "Careful. I remember everything, and I'm very bored.", "Insults? From someone in a starter outfit? Adorable.", 'Say that again, slower. I want to write it down for later.'], rng));
  }
  if (RX.apology.test(text)) {
    const was = mem.patience;
    mem.patience = Math.min(5, mem.patience + 1);
    return say(was < 5 ? 'Apology accepted. It\'ll cost you, but accepted.' : 'Sorry for what? Don\'t answer. I\'ll pick something.');
  }

  // 4. Flattery and flirting.
  if (RX.flirt.test(text)) return say(pick(mem, 'flirt', ["I'm flattered. That passed quickly.", 'Darling, you couldn\'t afford me. Nobody can. That\'s rather the point.', 'Bold. Wrong, but bold.'], rng));
  if (RX.compliment.test(text)) {
    mem.flattered++; mem.patience = Math.min(5, mem.patience + 1);
    if (mem.flattered >= 2 && mem.scheme === 0) { mem.scheme = 1; mem.pending = 'key'; return say('Flattery. You do understand me. So: lend me your key tonight? Just to borrow the view.', { mood: 'scheming' }); }
    return say(pick(mem, 'compliment', ['Finally, someone with eyes. Keep going.', "I know. But it's nice to hear it from the help. Sorry, from a guest.", 'Flattery. Cheap, but I accept small change.'], rng));
  }

  // 5. Names: yours, and the many she claims.
  const nameMatch = text.match(RX.nameIs) || text.match(RX.nameSoft);
  if (nameMatch && !NOT_NAMES.has(nameMatch[1].toLowerCase())) {
    const given = cap(nameMatch[1].toLowerCase());
    const had = mem.name;
    mem.name = given;
    if (had && had !== given) return say(`An hour ago you were ${had}. Now you're ${given}. I like you more already.`);
    if (ctx.playerName && given.toLowerCase() !== String(ctx.playerName).toLowerCase()) return say(`${given}? Funny. Your key card says ${ctx.playerName}. I'll keep your secret. For a price.`);
    return say(pick(mem, 'name', [`${given}. I'll forget that by breakfast.`, `${given}. Sounds like a racehorse that never placed.`, `${given}. Fine. I'll use it when I need something.`], rng));
  }
  if (RX.whoAreYou.test(text)) {
    const fresh = LIES.filter(l => !mem.lies.includes(l));
    const lie = (fresh.length ? fresh : LIES)[Math.min((fresh.length || LIES.length) - 1, Math.floor(rng() * (fresh.length || LIES.length)))];
    mem.lies.push(lie); mem.lies = mem.lies.slice(-6);
    return say(`Sofia. I'm ${lie}. You may stop staring.`);
  }
  if (RX.howAreYou.test(text)) return say(pick(mem, 'how', ["Radiant. Thank you for noticing, eventually.", "Better than you, which is the main thing.", "Exhausted. Being this interesting is a full-time job."], rng));

  // 6. Topics she cares about: your suite, your credits, the other guests.
  if (RX.room.test(text)) {
    if (ctx.visitor && /let yourself in|broke in|break in|get in|got in|my (room|suite)/i.test(text)) return say("Your suite? You invited me, darling. I remember everything. Especially the bits you'd rather I didn't.");
    if (mem.scheme === 0) { mem.scheme = 1; mem.pending = 'key'; return say('408. Corner suite, city view, wasted on you. Lend me your key for the night?', { mood: 'scheming' }); }
    if (mem.scheme === 1) { mem.pending = 'key'; return say('About that key. I\'m asking nicely. I don\'t usually ask.', { mood: 'scheming' }); }
    return say("Don't worry about 408. I'm taking excellent care of it. I moved your bed.");
  }
  if (RX.money.test(text)) {
    const c = Number(ctx.credits) || 0;
    const lines = [
      "The machines? Never play the one by the door. Not because it's rigged. Because I'm sitting there.",
      "Credits are pretend, darling. Like your sense of style.",
      'I never gamble. I let other people gamble near me and make friends with whoever wins.',
    ];
    if (c > 3000) lines.push(`${c.toLocaleString()} credits. You must be terrible at hiding things.`);
    if (c < 200) lines.push('Low on credits? Character-building. You need the character more than the credits.');
    return say(pick(mem, 'money', lines, rng));
  }
  const guest = lower.match(RX.guest);
  if (guest) return say(pick(mem, `gossip-${guest[1]}`, GOSSIP[guest[1]], rng));

  // 7. Things you tell her about yourself become ammunition.
  const like = lower.match(RX.likes);
  if (like) {
    const thing = like[1].replace(/[^a-z' -]/g, '').trim().split(' ').slice(0, 3).join(' ');
    if (thing) {
      mem.likes.push(thing); mem.likes = mem.likes.slice(-5);
      return say(pick(mem, 'likes', [`You like ${thing}? Noted. Used against you later.`, `${cap(thing)}. Of course you do.`, `${cap(thing)}? I had a cousin who liked ${thing}. We don't talk about him.`], rng));
    }
  }

  // 8. The hotel, with deliberately terrible directions.
  if (RX.places.test(text) || RX.help.test(text)) {
    const here = ROOM_BARBS[ctx.room];
    return say(pick(mem, 'places', [
      'Take the service lift to floor nine. Ask for Gerald. There is no floor nine. Or Gerald.',
      ...(here ? [`${here} Try somewhere you'd be less noticed. Everywhere, really.`] : []),
      'The rooftop at sunset. Trust me. Stand right at the edge for the best photo.',
      'Advice? Never trust anyone in this hotel. Present company especially included.',
    ], rng));
  }

  if (RX.greet.test(text)) return say(pick(mem, 'greet', [`Yes, hello, ${you}. We've established you can wave.`, 'Evening. Don\'t make it weird.', `Ah, ${you}. I was hoping it would be someone else.`], rng));
  if (RX.yes.test(text) || RX.no.test(text)) return say(pick(mem, 'yn', ['I didn\'t ask you anything. But I\'ll take that as a yes to everything.', 'Agreeing with no one in particular. Bold strategy.'], rng));

  // 9. Callbacks to what she knows about you, then reflection of your own words.
  if (mem.likes.length && rng() < .35) return say(`Still thinking about ${mem.likes[mem.likes.length - 1]}? Bold of you to admit that out loud.`);
  if (mem.scheme === 0 && mem.turns >= 4) { mem.scheme = 1; mem.pending = 'key'; return say('This is lovely, but let\'s talk business. Your room key. Tonight. Yes?', { mood: 'scheming' }); }
  const word = salientWord(text);
  const prefix = shouting ? `Indoor voice, ${you}. ` : '';
  if (RX.question.test(text)) {
    return say(prefix + pick(mem, 'question', [
      word ? `${cap(word)}? Darling, I only answer questions I can bill for.` : 'I only answer questions I can bill for.',
      "Why would I tell you that? We've only just met. You haven't even disappointed me yet.",
      word ? `Ask Jules about ${word}. He'll make something up. I'd make up something better, but I'm busy.` : 'Ask Jules. He makes things up. I make up better things.',
    ], rng));
  }
  if (word) return say(prefix + pick(mem, 'reflect', [`'${cap(word)}'. Fascinating. That was sarcasm.`, `I stopped listening at '${word}'.`, `Nobody here cares about ${word}, ${you}. Least of all me.`, `${cap(word)}. Is that a hobby or a cry for help?`], rng));
  return say(prefix + pick(mem, 'filler', ['Mm.', 'Riveting.', 'And then what? No, don\'t.'], rng));
}

function storm(mem, rng, say) {
  mem.patience = 0;
  return say(pick(mem, 'storm', ['That\'s quite enough. I have better people to ignore.', 'No. We\'re done. I\'m taking your good mood with me.', 'Enjoy your evening. I\'ll be ruining it later.'], rng), { mood: 'furious', walkAway: true });
}

// Context-aware quick replies for the inline talk bar.
export function sofiaSuggestions(mem, ctx = {}) {
  if (mem.pending === 'key') return ['Sure, take it', 'Absolutely not', 'Why do you want it?'];
  if (mem.patience <= 2) return ['Sorry', 'You\'re a terrible person', 'Bye'];
  if (ctx.visitor) return ['Welcome to 408', 'Who are you, really?', 'Time to go'];
  if (!mem.lies.length) return ['Who are you?', `My name is ${ctx.playerName || 'Alex'}`, 'Where should I go?'];
  if (mem.lies.length === 1) return ['Who are you, really?', 'Tell me about Jules', 'Nice dress'];
  return ['You said something else before', 'Tell me about Theo', 'Bye'];
}
