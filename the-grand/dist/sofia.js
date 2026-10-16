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
  jules: ["Jules? He wears borrowed cufflinks. Mine. He left them on my nightstand.", "Jules kisses like he files his records. Thoroughly, alphabetically, and far too slowly."],
  ada: ["Ada designs benches built for two. I've tested every one of them.", "Ada thinks a lobby should comfort the least confident visitor. That's who I look for first."],
  otto: ["Otto fixes wobbly tables. I keep giving him reasons to come up to my room with his toolbox.", "Otto has three screws in his pocket. Had. I have four now."],
  farah: ["Farah knows every shortcut in the building. Which is why I stay on her good side. For now.", "Farah reads detective novels. I've started taking that personally."],
  inez: ["Inez was a lawyer. She asks follow-up questions. I avoid her the way cats avoid baths.", "Inez and I have an understanding. She doesn't ask, and I don't tell her about her crossword."],
  mabel: ["Mabel looks like she came for the biscuits. Never play her for money. Or anything you love.", "Mabel noticed my weak flank in 2019. We haven't spoken since."],
  kit: ["Kit ignores 'staff only' signs. Amateur. I had the signs printed.", "Kit's pranks are elaborate. Mine are profitable."],
  wren: ["Wren makes coins vanish. I make whole wallets vanish, but I don't do it for applause.", "Wren keeps losing their room key. Not by ordinary means. You're welcome, Wren."],
  noor: ["Noor plays the rooftop at sunset. The things that saxophone does to me should be illegal.", "Noor loves a winding melody. I love a winding contract."],
  luca: ["Luca measured me for a dress once. Took him three hours. He wasn't complaining.", "Luca tailored this coat. He thinks I paid him."],
  tessa: ["Tessa is 'off the record' this weekend. Nobody is ever off the record. Especially around me.", "Tessa asks excellent questions. I give excellent answers. None of them true."],
};

const ROOM_BARBS = {
  suite: 'Your suite. Our suite, if you play your cards right.',
  lobby: 'The lobby. Where people wait to be noticed. I notice everyone. Especially you.',
  gold: 'The Gold Lounge. All that velvet. I do love velvet against the skin.',
  neon: "The Neon Arcade. Terrible taste, flattering lighting. For me.",
  roof: "The rooftop. Dark corners and a warm breeze. A dangerous combination.",
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
  guest: /\b(jules|ada|otto|farah|inez|mabel|kit|wren|noor|luca|tessa)\b/i,
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
  return ['darling', 'sugar', 'handsome', 'Four-Oh-Eight'][Math.min(3, Math.floor(rng() * 4))];
}

export function sofiaOpener(mem, ctx = {}, rng = Math.random) {
  mem.met++;
  const you = addressee(mem, ctx, rng);
  let text;
  if (ctx.visitor) text = (mem.visits = (mem.visits || 0) + 1) > 1 ? "Back in 408, sugar. I've warmed up your side of the sofa." : 'So this is 408. Smaller than I imagined. Everything usually is.';
  else if (mem.patience <= 1) text = 'Oh. You again. Pity, you were starting to look interesting.';
  else if (ctx.hat === 'fedora') text = 'Nice fedora. Keep it on. Leave the rest to my imagination. It\'s very vivid.';
  else if (mem.name) text = `${mem.name}. You came back. They always come back.`;
  else if (mem.met > 1) text = `Back again, ${you}? Couldn't stay away. They never can.`;
  else text = "Well, well. The new resident of 408. I've been dying to get my hands on you. And your room key.";
  return { text, mood: moodFor(mem), walkAway: false };
}

// Her parting shot when you walk off mid-conversation.
export function sofiaWalkedOff(mem, rng = Math.random) {
  return { text: pick(mem, 'walkoff', ["Walking away mid-sentence? Rude. Lovely view from back here, though.", "Go on, then. Walk slowly. I'm watching.", "Don't worry, I'll tell everyone you couldn't handle me."], rng), mood: moodFor(mem), walkAway: false };
}

export function sofiaReply(mem, input, ctx = {}, rng = Math.random) {
  const raw = String(input || '').trim().slice(0, 140);
  const text = raw.replace(/\s+/g, ' ');
  const lower = text.toLowerCase();
  mem.turns++;
  const say = (line, extra = {}) => ({ text: line, mood: moodFor(mem), walkAway: false, ...extra });
  const you = addressee(mem, ctx, rng);

  // Noise, repeats and shouting first: she notices everything.
  if (!/[a-z]/i.test(text)) return say(pick(mem, 'noise', ['Use words, darling. Or just keep looking at me like that.', 'Was that a sneeze, or am I making you nervous?', 'Speechless. I get that a lot.'], rng));
  // Repeats are teased, except when the repeat is a question whose answer has changed (an invite, the key).
  const repeated = lower === mem.lastUser && !RX.invite.test(text) && mem.pending !== 'key';
  mem.lastUser = lower;
  if (repeated) return say('You said that already. I was undressing you with my eyes the first time.');
  const shouting = text.length > 4 && text === text.toUpperCase() && /[A-Z]{3}/.test(text);

  // 1. Pending answers to her schemes.
  if (mem.pending === 'key') {
    if (RX.yes.test(text)) { mem.pending = null; mem.scheme = 2; return say('Wonderful. I had it copied this morning, but I do love it when you say yes.', { mood: 'delighted' }); }
    if (RX.no.test(text)) { mem.pending = null; return say(pick(mem, 'keyno', ['Pity. Jules said yes in under a minute. Jules says yes to everything.', 'Playing hard to get? Adorable. I play harder.'], rng)); }
    if (RX.why.test(text)) return say('The view. Your minibar. Your bathrobe. Possibly you. So: yes?', { mood: 'scheming' });
  }

  // Invitations: she only visits a suite with The Grand Reserve on ice. She states the terms; she never sells them.
  if (RX.invite.test(text)) {
    if (ctx.visitor || ctx.room === 'suite') return say("I'm already here, darling. In your suite. On your sofa. Keep up.");
    if (mem.patience <= 1) return say('After the way you spoke to me? Grovel first. I do enjoy a grovel.');
    if (!ctx.canHost) {
      mem.refusedInvite = (mem.refusedInvite || 0) + 1;
      return say(mem.refusedInvite > 1
        ? 'Still no Grand Reserve? Then the coat stays on. Rules are rules. I wrote them in lipstick.'
        : 'Your suite? Without The Grand Reserve on ice? Darling, I don\'t take my coat off for anything less than vintage.', { needs: 'reserve' });
    }
    return say(pick(mem, 'accept', ['Lead the way, sugar. The Grand Reserve? You do know the way to a woman\'s heart. Walk slowly.', 'I underestimated you. The Reserve, no less. I won\'t make that mistake twice. Let\'s go.'], rng), { mood: 'delighted', invite: true });
  }

  if (ctx.visitor && RX.hosting.test(text)) return say(pick(mem, 'hosting', ["Don't mind if I do. I'll pour. You watch. Closely.", 'Cheers, sugar. To bad decisions in good suites.', "The Reserve. Finally, something in 408 as well aged as my intentions."], rng), { mood: 'delighted' });

  if (RX.kickOut.test(text)) {
    if (ctx.visitor) return say(pick(mem, 'kicked', ["Fine. I was leaving anyway. Keep the lipstick on the glass as a souvenir.", "Throwing me out? Bold. I like bold. I'll be back for the curtains. And you."], rng), { ended: true });
    return say("Go away? I was here first, sugar. I'm always here first. And last.");
  }

  if (RX.bye.test(text)) return say(pick(mem, 'bye', ['Leaving? I\'ll tell the others you were irresistible. Nobody will believe me.', 'Run along. I\'ll be thinking about you. Briefly. Vividly.', 'Goodnight. Lock your door. Or don\'t. Live a little.'], rng), { ended: true });

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
    return say(pick(mem, 'threat', ['The manager owes me four favours and a kidney. Go ahead.', 'Security? Marcus? He walks me to my room every night. He doesn\'t always leave.', 'Complain to reception. Tell them Sofia sent you. Watch what happens.'], rng));
  }
  if (RX.profanity.test(text) || RX.insult.test(text)) {
    mem.insults++; mem.patience -= RX.profanity.test(text) ? 2 : 1;
    if (mem.patience <= 0) return storm(mem, rng, say);
    if (/bad person|evil|witch/i.test(text)) return say("Bad? Darling, I'm deliciously bad. There's a difference, and it's mostly lingerie.");
    return say(pick(mem, 'insult', ['Ooh, feisty. Say it again, slower.', "Careful. Rough talk only makes me curious.", "Insults? From someone in a starter outfit? Adorable. Come closer and try again.", 'Mean. I like mean. It saves time.'], rng));
  }
  if (RX.apology.test(text)) {
    const was = mem.patience;
    mem.patience = Math.min(5, mem.patience + 1);
    return say(was < 5 ? 'Apology accepted. You can make it up to me later. In detail.' : 'Sorry for what? Don\'t answer. I\'ll pick something fun.');
  }

  // 4. Flattery and flirting.
  if (RX.flirt.test(text)) return say(pick(mem, 'flirt', ["Finally. I was starting to think you'd never ask.", 'Bold. I like bold. Bold gets a second drink.', "Careful, sugar. I bite. Only when asked nicely.", 'Kiss you? Here? In front of Jules? Oh, go on then. Mwah. Now you owe me.'], rng));
  if (RX.compliment.test(text)) {
    mem.flattered++; mem.patience = Math.min(5, mem.patience + 1);
    if (mem.flattered >= 2 && mem.scheme === 0) { mem.scheme = 1; mem.pending = 'key'; return say('Keep talking like that and I\'ll follow you anywhere. Starting with your room. Lend me your key tonight?', { mood: 'scheming' }); }
    return say(pick(mem, 'compliment', ['Finally, someone with eyes. Use them. Keep going.', "I know. But say it again, with feeling.", 'Flattery. Cheap, but I\'m feeling generous tonight.'], rng));
  }

  // 5. Names: yours, and the many she claims.
  const nameMatch = text.match(RX.nameIs) || text.match(RX.nameSoft);
  if (nameMatch && !NOT_NAMES.has(nameMatch[1].toLowerCase())) {
    const given = cap(nameMatch[1].toLowerCase());
    const had = mem.name;
    mem.name = given;
    if (had && had !== given) return say(`An hour ago you were ${had}. Now you're ${given}. Mysterious. I like you more already.`);
    if (ctx.playerName && given.toLowerCase() !== String(ctx.playerName).toLowerCase()) return say(`${given}? Funny. Your key card says ${ctx.playerName}. I'll keep your secret. For a kiss.`);
    return say(pick(mem, 'name', [`${given}. I'll be whispering that later.`, `${given}. Rolls off the tongue. So would a lot of things.`, `${given}. I'll use it when I want something. I want a lot of things.`], rng));
  }
  if (RX.whoAreYou.test(text)) {
    const fresh = LIES.filter(l => !mem.lies.includes(l));
    const lie = (fresh.length ? fresh : LIES)[Math.min((fresh.length || LIES.length) - 1, Math.floor(rng() * (fresh.length || LIES.length)))];
    mem.lies.push(lie); mem.lies = mem.lies.slice(-6);
    return say(`Sofia. I'm ${lie}. You may stop staring. Or don't. I like it.`);
  }
  if (RX.howAreYou.test(text)) return say(pick(mem, 'how', ["Hot. Thank you for noticing.", "Better now you're here. Don't let it go to your head.", "Bored. Entertain me, sugar."], rng));

  // 6. Topics she cares about: your suite, your credits, the other guests.
  if (RX.room.test(text)) {
    if (ctx.visitor && /let yourself in|broke in|break in|get in|got in|my (room|suite)/i.test(text)) return say("Your suite? You invited me, darling. I remember everything. Especially the bits you'd rather I didn't.");
    if (mem.scheme === 0) { mem.scheme = 1; mem.pending = 'key'; return say('408. Corner suite, city view, very big bed. Wasted on one person. Lend me your key tonight?', { mood: 'scheming' }); }
    if (mem.scheme === 1) { mem.pending = 'key'; return say('About that key. I\'m asking nicely. I can also ask not-so-nicely.', { mood: 'scheming' }); }
    return say("Don't worry about 408. I'm taking excellent care of it. I've already tested the bed.");
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
      return say(pick(mem, 'likes', [`You like ${thing}? Noted. I'll wear something about it.`, `${cap(thing)}. Of course you do. Tell me more. Slowly.`, `${cap(thing)}? I had a lover who liked ${thing}. Lovely hands. Terrible memory.`], rng));
    }
  }

  // 8. The hotel, with deliberately terrible directions.
  if (RX.places.test(text) || RX.help.test(text)) {
    const here = ROOM_BARBS[ctx.room];
    return say(pick(mem, 'places', [
      'Take the service lift to floor nine. Ask for Gerald. There is no floor nine. Or Gerald.',
      ...(here ? [`${here} Try somewhere you'd be less noticed. Everywhere, really.`] : []),
      'The rooftop at sunset. Lovely view. Very dark corners. Bring me.',
      'Advice? Never trust anyone in this hotel. Especially the gorgeous ones. Hello.',
    ], rng));
  }

  if (RX.greet.test(text)) return say(pick(mem, 'greet', [`Well hello, ${you}. You clean up nicely.`, 'Evening, sugar. Don\'t make me do all the work.', `Ah, ${you}. I was hoping it would be you. I lie a lot, but not about that.`], rng));
  if (RX.yes.test(text) || RX.no.test(text)) return say(pick(mem, 'yn', ['I didn\'t ask you anything. But I\'ll take that as a yes to everything.', 'Agreeing already? Easy. I like easy.'], rng));

  // 9. Callbacks to what she knows about you, then reflection of your own words.
  if (mem.likes.length && rng() < .35) return say(`Still thinking about ${mem.likes[mem.likes.length - 1]}? You should be thinking about me.`);
  if (mem.scheme === 0 && mem.turns >= 4) { mem.scheme = 1; mem.pending = 'key'; return say('This is lovely, but let\'s talk about tonight. Your room key. Yes?', { mood: 'scheming' }); }
  const word = salientWord(text);
  const prefix = shouting ? `Indoor voice, ${you}. Save the shouting for later. ` : '';
  if (RX.question.test(text)) {
    return say(prefix + pick(mem, 'question', [
      word ? `${cap(word)}? Darling, I only answer questions over a second drink.` : 'I only answer questions over a second drink.',
      "Why would I tell you that? Take me to dinner first.",
      word ? `Ask Jules about ${word}. He'll make something up. I'd make up something better, but I'm busy looking at you.` : 'Ask Jules. He makes things up. I make up better things.',
    ], rng));
  }
  if (word) return say(prefix + pick(mem, 'reflect', [`'${cap(word)}'. Fascinating. Say it again, but closer.`, `I stopped listening at '${word}'. You have very distracting lips.`, `Nobody here cares about ${word}, ${you}. I care about what you're doing later.`, `${cap(word)}. Is that a hobby or a pickup line? Either way, it's working. Barely.`], rng));
  return say(prefix + pick(mem, 'filler', ['Mm.', 'Riveting. Keep going, I like the sound of your voice.', 'And then what? Don\'t stop.'], rng));
}

function storm(mem, rng, say) {
  mem.patience = 0;
  return say(pick(mem, 'storm', ['That\'s quite enough. I have better people to flirt with.', 'No. We\'re done. And you were doing so well.', 'Enjoy your evening. Alone. Tragic.'], rng), { mood: 'furious', walkAway: true });
}

// Context-aware quick replies for the inline talk bar.
export function sofiaSuggestions(mem, ctx = {}) {
  if (mem.pending === 'key') return ['Sure, take it', 'Absolutely not', 'Why do you want it?'];
  if (mem.patience <= 2) return ['Sorry', 'You\'re a terrible person', 'Bye'];
  if (ctx.visitor) return ['Welcome to 408', 'Who are you, really?', 'Time to go'];
  if (!mem.lies.length) return ['Who are you?', `My name is ${ctx.playerName || 'Alex'}`, 'You look gorgeous'];
  if (mem.lies.length === 1) return ['Who are you, really?', 'Tell me about Jules', 'Nice dress'];
  return ['You said something else before', 'Kiss me', 'Tell me about Otto'];
}
