// Sofia — The Grand's most dangerous flirt and resident con artist.
// A persona for the NPC brain (npc-brain.js): intents, response pools, memory and reactions.
// House rules: bawdy innuendo, never graphic; she never nudges the player to spend, deposit or fund.

import {respond, react, classify, lineCount} from '../npc-brain.js';

export const SOFIA_VERSION = 1;

// Every "who are you" gets a fresh lie, and she remembers each one so you can catch her out.
const LIES = [
  'a duchess. Technically',
  'the architect of this hotel. The good parts',
  'a retired jewel appraiser',
  "here on the owner's personal invitation",
  "a concert pianist. I stopped playing. It upset people how good I was with my hands",
  "the hotel's mystery inspector. Smile, you're being graded",
  'an heiress. Three times. Different families',
  'a former Bond girl. The one they cut for being too distracting',
];

const GUESTS = {
  // The hotel staff (NW-176 to NW-180). Personality only: Sofia never sends anyone towards an offer.
  penrose: ["Mr Penrose read me clause four once. Slowly. I've never felt so legally bound.", "Penrose keeps the small print and I keep the big secrets. We nod at each other in the Gallery like rival librarians."],
  celeste: ["Celeste has the best posture in the building. I've spent a year trying to unsettle it.", "Celeste won't recommend anything to anyone. Not a cocktail, not a sofa, not me. Especially not me."],
  pip: ["Pip has pink curls and the patience of a saint. I've tested both.", "Pip knows every cabinet in the Arcade by its hum. I know every guest by their aftershave."],
  rex: ["Rex reads the standings like scripture and never tells anyone to try harder. Refreshing, in a man.", "Rex once asked me to opt in. To his quiz night. I declined in four languages."],
  hollis: ["Hollis won't take a penny and won't take a hint. Admirable on both counts.", "Hollis told me card details don't belong in a chat. Darling, nothing of mine belongs in a chat."],
  jules: ["Jules? He wears borrowed cufflinks. Mine. He left them on my nightstand.", "Jules kisses like he files his records. Thoroughly, alphabetically, and far too slowly."],
  ada: ["Ada designs benches built for two. I've tested every one of them.", "Ada thinks a lobby should comfort the least confident visitor. That's who I look for first."],
  otto: ["Otto fixes wobbly tables. I keep giving him reasons to come up to my room with his toolbox.", "Otto has three screws in his pocket. Had. I have four now."],
  farah: ["Farah knows every shortcut in the building. Which is why I stay on her good side. For now.", "Farah reads detective novels. I've started taking that personally."],
  inez: ["Inez was a lawyer. She asks follow-up questions. I avoid her the way cats avoid baths.", "Inez and I have an understanding. She doesn't ask, and I don't tell her about her crossword."],
  mabel: ["Mabel looks like she came for the biscuits. Never play her for anything you love.", "Mabel noticed my weak flank in 2019. We haven't spoken since."],
  kit: ["Kit ignores 'staff only' signs. Amateur. I had the signs printed.", "Kit's pranks are elaborate. Mine end with someone's room key in my garter."],
  wren: ["Wren makes coins vanish. I make whole evenings vanish, but I don't do it for applause.", "Wren keeps losing their room key. Not by ordinary means. You're welcome, Wren."],
  noor: ["Noor plays the rooftop at sunset. The things that saxophone does to me should be illegal.", "Noor loves a winding melody. I love a winding staircase with a locked door at the top."],
  luca: ["Luca measured me for a dress once. Took him three hours. He wasn't complaining.", "Luca tailored this dress. He made the slit higher when I asked nicely."],
  tessa: ["Tessa is 'off the record' this weekend. Nobody is ever off the record around me.", "Tessa asks excellent questions. I give excellent answers. None of them true."],
  rafi: ["Rafi feeds everyone. I let him think dessert was his idea.", "Rafi's soufflé rises for anyone. Takes after me."],
  kofi: ["Kofi does all the voices. I've heard him do mine. It's flattering, and accurate.", "Kofi's between grand entrances. I'm between grand exits."],
  esme: ["Esme says I move like a dancer. I move like someone leaving with your wallet. Figuratively.", "Esme taught me a turn. I use it to get out of conversations with men named Graham."],
  bea: ["Bea knows every star. I know which ones are married.", "Bea looks at the sky all night. Some of us look at the doors."],
  niko: ["Niko loves rules. I love him explaining them, it's so easy to break them while he talks.", "Niko once beat me at cards. Once."],
  dev: ["Dev writes crosswords. I'm seven letters: 'trouble'. Close enough.", "Dev hears wordplay everywhere. I give him plenty."],
  zuri: ["Zuri can make a shy room dance. I can make a shy man blush. Teamwork.", "Zuri plays my song every night. I've never told her which one it is."],
  arun: ["Arun talks to his plants. They tell him nothing. Unlike his room service bill.", "Arun brought cuttings. I brought trouble. We both like things that grow."],
};
const GUEST_RX = new RegExp(`\\b(${Object.keys(GUESTS).join('|')})\\b`, 'i');

const ROOM_BARBS = {
  suite: 'Your suite. Our suite, if you play your cards right.',
  lobby: 'The lobby. Where people wait to be noticed. I notice everyone. Especially you.',
  gold: 'The Gold Lounge. All that velvet. I do love velvet against the skin.',
  neon: 'The Neon Arcade. Terrible taste, flattering lighting. For me.',
  roof: 'The rooftop. Dark corners and a warm breeze. A dangerous combination.',
};

const NOT_NAMES = new Set(['fine','good','great','ok','okay','sorry','here','not','just','so','very','really','bored','tired','lost','new','back','alright','well','sure','leaving','going','done','happy','sad','hungry','busy','lonely','confused','the','a','single','married','free','drunk','hot','cold','in','on','at','from']);
// Payment vocabulary is never echoed back: she can sneer at the machines, but she doesn't sell anything.
const NO_ECHO = /^(deposit|fund|pay|buy|purchas|topup|wallet)/;
const STOPISH = new Set(('a an the i me my you your is are was were be am do does did to of in on at for with and or but so if it this that what why how who when where can could would should will have has had not no yes ok okay oh well just really very about from out up there here then than they we our like want know think going get got make made say said tell told sofia thing things').split(' '));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const salientWord = text => ((text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []).filter(w => !STOPISH.has(w) && !NO_ECHO.test(w)).sort((a, b) => b.length - a.length)[0]) || null;
const isQuestion = text => /\?\s*$|^\s*(what|why|how|when|where|who|do|does|did|are|can|could|is|will|would|should)\b/i.test(text);
const notVisitor = (m, c) => !c.visitor && c.room !== 'suite';

function moodFor(mem) { return mem.patience <= 0 ? 'furious' : mem.patience <= 2 ? 'annoyed' : mem.scheme === 1 ? 'scheming' : 'smug'; }

// She's French. Calm, she flirts in English; the moment she's emotional, the French comes out.
const ANNOYED = ['Pff.', 'Oh là là.', 'Bof.', 'Tsk.', 'Mon Dieu.'];
const DELIGHTED = ['Ooh là là.', 'Magnifique.', "C'est parfait.", 'Oh, mon chou.', 'Délicieux.'];
function voice(out, r, mem, ctx, rng) {
  const pick = list => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  if (out.mood === 'annoyed' && !/^(Pff|Oh là|Bof|Tsk|Mon Dieu)/.test(out.text)) out.text = `${pick(ANNOYED)} ${out.text}`;
  else if (out.mood === 'delighted' && !/(là là|Magnifique|parfait|mon chou|Délicieux)\.?$/.test(out.text)) out.text = `${out.text} ${pick(DELIGHTED)}`;
  else if (out.mood === 'furious' && !out.walkAway) out.text = `Merde. ${out.text}`;
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
export const PERSONA = {
  id: 'sofia',
  moodFor,
  voice,
  stormIntent: 'storm',
  slots(mem, ctx, rng) {
    return {
      you: mem.name || ['darling', 'sugar', 'mon chou', ctx.presentation === 'woman' ? 'chérie' : 'chéri', 'Four-Oh-Eight'][Math.min(4, Math.floor(rng() * 5))],
      name: mem.name || '', playerName: ctx.playerName || 'Alex', roomBarb: ROOM_BARBS[ctx.room] || '',
      credits: (Number(ctx.credits) || 0).toLocaleString(), like: mem.likes[mem.likes.length - 1] || '',
    };
  },
  pre(mem, text) {
    if (!/[a-z]/i.test(text)) return { intent: 'noise' };
    const lower = text.toLowerCase();
    // Repeats are teased, except when the repeat is a question whose answer can have changed.
    const repeated = lower === mem.lastUser && !PERSONA.intents.find(i => i.id === 'invite').patterns.some(re => re.test(text)) && mem.pending !== 'key';
    mem.lastUser = lower;
    return repeated ? { intent: 'repeat' } : null;
  },
  intents: [
    // ---- Pre-filters (never classified directly) ----
    { id: 'noise', responses: ['Use words, darling. Or just keep looking at me like that.', 'Was that a sneeze, or am I making you nervous?', 'Speechless. I get that a lot.', 'Breathe, sugar. In through the nose. Eyes up here.'] },
    { id: 'repeat', responses: ['You said that already. I was undressing you with my eyes the first time.', 'Again? I heard you. I was busy picturing you without that outfit.', 'Twice? Persistence. I find that very attractive in a man. And in a woman. And in a locksmith.'] },
    { id: 'storm', effect: m => { m.patience = 0; }, responses: [
      { text: "Ça suffit! Je m'en vais. Tu ne mérites pas mes jambes. (Enough. I'm leaving. You don't deserve my legs.)", walkAway: true, mood: 'furious' },
      { text: "Non, non et non. Adieu, petit con. (No. Goodbye, you little idiot.)", walkAway: true, mood: 'furious' },
      { text: "Quel désastre. Bonne soirée, tout seul. (What a disaster. Enjoy your evening, alone.)", walkAway: true, mood: 'furious' },
      { text: "Merde alors! Je retourne au bar. (Oh, for— I'm going back to the bar.)", walkAway: true, mood: 'furious' },
    ] },

    // ---- The room-key con: answers to her pending question ----
    { id: 'keyYes', rank: 96, when: m => m.pending === 'key', patterns: [/^\s*(yes|yeah|yep|yup|sure|ok(?:ay)?|fine|alright|of course|why not|go on|take it|deal)\b/i],
      effect: m => { m.pending = null; m.scheme = 2; },
      responses: [{ text: 'Wonderful. I had it copied this morning, but I do love it when you say yes.', mood: 'delighted' }, { text: "Good. I'll be gentle with it. With everything in there, actually.", mood: 'delighted' }] },
    { id: 'keyNo', rank: 95, when: m => m.pending === 'key', patterns: [/^\s*(no|nope|nah|never|no way|absolutely not|not a chance|i don't think so)\b/i],
      effect: m => { m.pending = null; },
      responses: ['Pity. Jules said yes in under a minute. Jules says yes to everything.', 'Playing hard to get? Adorable. I play harder.', "No? I'll ask again when you've had a drink. Everyone says yes after two."] },
    { id: 'keyWhy', rank: 94, when: m => m.pending === 'key', patterns: [/\b(why|what for|what do you want it for)\b/i],
      responses: [{ text: 'The view. Your minibar. Your bathrobe. Possibly you. So: yes?', mood: 'scheming' }, { text: 'Your bed looks lonely and your minibar looks full. I am a very charitable woman. So: yes?', mood: 'scheming' }] },

    // ---- Invitations: no Grand Reserve, no Sofia ----
    { id: 'invite', rank: 90, patterns: [/\b(come (?:up|over|with me|to my)|visit me|invite|join me|nightcap|drinks? (?:in|at) my|my (?:suite|room|place) (?:later|tonight|now)|up to (?:408|my)|come upstairs|back to mine)\b/i],
      examples: ['come up to my room', 'want to come upstairs', 'come back to my suite tonight', 'join me upstairs for a nightcap'],
      responses: [
        { when: (m, c) => c.visitor || c.room === 'suite', text: "I'm already here, darling. In your suite. On your sofa. Keep up." },
        { when: (m, c) => notVisitor(m, c) && m.patience <= 1, text: 'After the way you spoke to me? Grovel first. I do enjoy a grovel.' },
        { when: (m, c) => notVisitor(m, c) && m.patience > 1 && !c.canHost && !m.refusedInvite, needs: 'reserve', effect: m => { m.refusedInvite = (m.refusedInvite || 0) + 1; },
          text: "Your suite? Without The Grand Reserve on ice? Darling, I don't take my coat off for anything less than vintage." },
        { when: (m, c) => notVisitor(m, c) && m.patience > 1 && !c.canHost && m.refusedInvite > 0, needs: 'reserve', effect: m => { m.refusedInvite++; },
          text: 'Still no Grand Reserve? Then the coat stays on. Rules are rules. I wrote them in lipstick.' },
        { when: (m, c) => notVisitor(m, c) && m.patience > 1 && !c.canHost && m.refusedInvite > 1, needs: 'reserve', effect: m => { m.refusedInvite++; },
          text: 'Third time? Begging suits you. But no Grand Reserve, no Sofia.' },
        { when: (m, c) => notVisitor(m, c) && m.patience > 1 && c.canHost, invite: true, mood: 'delighted', text: "Lead the way, sugar. The Grand Reserve? You do know the way to a woman's heart. Walk slowly." },
        { when: (m, c) => notVisitor(m, c) && m.patience > 1 && c.canHost, invite: true, mood: 'delighted', text: "I underestimated you. The Reserve, no less. I won't make that mistake twice. Let's go." },
      ] },

    // ---- As a guest in your suite ----
    { id: 'hosting', rank: 88, when: (m, c) => !!c.visitor, patterns: [/\b(welcome|make yourself at home|drink|glass|reserve|champagne|pour|cheers|sit down|get comfortable)\b/i],
      responses: [{ text: "Don't mind if I do. I'll pour. You watch. Closely.", mood: 'delighted' }, { text: 'Cheers, sugar. To bad decisions in good suites.', mood: 'delighted' }, { text: 'The Reserve. Finally, something in 408 as well aged as my intentions.', mood: 'delighted' }, { text: "Comfortable? I'm always comfortable. It's everyone else who gets flustered.", mood: 'delighted' }] },
    { id: 'kickOut', rank: 86, patterns: [/\b(get out|go away|leave me alone|leave my|out of my|piss off|please leave|time to go|you should go)\b/i],
      responses: [
        { when: (m, c) => c.visitor, ended: true, text: 'Fine. I was leaving anyway. Keep the lipstick on the glass as a souvenir.' },
        { when: (m, c) => c.visitor, ended: true, text: "Throwing me out? Bold. I like bold. I'll be back for the curtains. And you." },
        { when: (m, c) => !c.visitor, text: "Go away? I was here first, sugar. I'm always here first. And last." },
        { when: (m, c) => !c.visitor, text: "Leave you alone? You'd hate that. You've been staring at my legs for a full minute." },
      ] },
    { id: 'bye', rank: 84, patterns: [/\b(bye|goodbye|good ?night|see (you|ya)|later then|i(?:'m| am) (?:leaving|off|going now)|gotta go|i have to go)\b/i],
      examples: ['i have to go now', 'see you around', 'i am heading off'],
      responses: [{ text: "Leaving? I'll tell the others you were irresistible. Nobody will believe me.", ended: true }, { text: "Run along. I'll be thinking about you. Briefly. Vividly.", ended: true }, { text: "Goodnight. Lock your door. Or don't. Live a little.", ended: true }, { text: "Go on. I'll keep your seat warm. I keep everything warm.", ended: true }] },

    // ---- Catching her out ----
    { id: 'liar', rank: 82, patterns: [/\b(liar|lying|you lie|lies|you said|that's not true|thats not true|not true|you told me|thought you were|i thought you)\b/i],
      examples: ['you said something different before', 'that is a lie', 'you changed your story'],
      extract: (t, c, m) => ({ lie1: (m.lies[m.lies.length - 2] || '').split('.')[0], lie2: (m.lies[m.lies.length - 1] || '').split('.')[0] }),
      responses: [
        { when: m => m.lies.length >= 2, text: 'I said I was {lie1}? I also said I was {lie2}. Both true. Keep up.' },
        { when: m => m.lies.length >= 2, text: "On Tuesdays I said I was {lie1}, at weekends {lie2}. A woman needs range, sugar. Both true." },
        { when: m => m.lies.length === 1, text: "Lying? Me? I'm {lie2}. We don't lie. We 'curate'." },
        { when: m => !m.lies.length, text: 'I never lie, darling. I just tell the truth very selectively. And very slowly.' },
      ] },

    // ---- Hostility and making up ----
    { id: 'threat', rank: 80, patterns: [/\b(report|manager|security|police|reception|complain|ban(?:ned)?|kick you out|throw you out|call the)\b/i],
      effect: m => { m.patience -= 1; },
      responses: ['The manager owes me four favours and a kidney. Go ahead.', "Security? Marcus? He walks me to my room every night. He doesn't always leave.", 'Complain to reception. Tell them Sofia sent you. Watch them blush.', 'Report me? Darling, half the staff have my number. The other half have my garter.'] },
    { id: 'profanity', rank: 79, patterns: [/\b(f+u+c+k\w*|shit\w*|bitch\w*|bastard|wanker|twat|dick|ass(?:hole)?|crap|slag|slut|whore|tart)\b/i],
      effect: m => { m.insults = (m.insults || 0) + 1; m.patience -= 2; },
      responses: ["Language. I only like that word when I'm the one saying it.", 'Filthy mouth. Wash it out with champagne and try again.', "Oh, you've got a temper. Save it for the bedroom, sugar."] },
    { id: 'insult', rank: 78, patterns: [/\b(stupid|idiot|dumb|ugly|hate you|rude|awful|horrible|nasty|shut up|annoying|loser|witch|evil|bad person|terrible|creep|fool|you(?:'re| are) (?:so )?(?:mean|boring|old|the worst|a mess))\b/i],
      examples: ['you are horrible', 'nobody likes you', 'you are so annoying'],
      effect: (m, c, s) => { m.insults = (m.insults || 0) + 1; m.patience -= 1; },
      extract: t => ({ bad: /bad person|evil|witch/i.test(t) }),
      responses: [
        { when: (m, c, s) => s.bad, text: "Bad? Darling, I'm deliciously bad. There's a difference, and it's mostly lingerie." },
        { when: (m, c, s) => !s.bad, text: 'Ooh, feisty. Say it again, slower.' },
        { when: (m, c, s) => !s.bad, text: 'Careful. Rough talk only makes me curious.' },
        { when: (m, c, s) => !s.bad, text: 'Insults? From someone in a starter outfit? Adorable. Come closer and try again.' },
        { when: (m, c, s) => !s.bad, text: 'Mean. I like mean. It saves time.' },
      ] },
    { id: 'apology', rank: 76, patterns: [/\b(sorry|apolog\w*|my bad|forgive me)\b/i],
      extract: (t, c, m) => ({ wasFull: m.patience >= 5 }),
      effect: m => { m.patience = Math.min(5, m.patience + 1); },
      responses: [
        { when: (m, c, s) => !s.wasFull, text: 'Apology accepted. You can make it up to me later. In detail.' },
        { when: (m, c, s) => !s.wasFull, text: "Sorry? Say it on your knees next time. Kidding. Mostly. Fine, you're forgiven." },
        { when: (m, c, s) => s.wasFull, text: "Sorry for what? Don't answer. I'll pick something fun." },
      ] },

    // ---- Honesty about what she is ----
    { id: 'aiQuestion', rank: 75, patterns: [/\b(are you (?:real|human|a bot|an ai|a robot|alive)|is this (?:ai|a bot|chatgpt)|chat ?gpt|language model)\b/i],
      examples: ['are you a real person', 'am i talking to a bot', 'are you artificial intelligence'],
      responses: ["I'm a scripted character, sugar. Every line was written for me. Most women can't say that about their best ones.", "Real? I'm a scripted resident in a prototype. But the way you're looking at me is very real.", "Not a bot, not a person. A character. Hand-written, top to toe. Especially the toes."] },

    // ---- Flirting, escalating ----
    { id: 'kiss', rank: 74, patterns: [/\b(kiss|snog|smooch|make out)\b/i], examples: ['give me a kiss', 'can i kiss you'],
      responses: [{ text: 'Kiss you? Here? In front of Jules? Oh, go on then. Mwah. Now you owe me.', mood: 'delighted' }, { text: 'Un bisou? One on each cheek, the French way. The other cheeks cost extra.', mood: 'delighted' }, { text: "A kiss? Darling, I'd ruin you for everyone else. It wouldn't be fair on the lobby.", mood: 'delighted' }, { text: 'Lean in. Closer. Closer. Now you know what my perfume smells like. That\'s all you get tonight.', mood: 'delighted' }, { text: 'I kiss on the third date. This is the third time you\'ve looked at my mouth. Counts.', mood: 'delighted' }] },
    { id: 'love', rank: 73, patterns: [/\b(love you|marry me|be mine|girlfriend|boyfriend|wife|husband|fall(?:ing)? for you)\b/i],
      responses: ["Love? Steady. Most people get me a drink first. Then they lose their key. Then they fall in love.", 'Marry you? I\'ve been married four times. Twice on purpose.', "Careful. Men have fallen for me and never got up. Comfortable rug, though.", "Love is a strong word. Try 'want'. I answer to 'want'."] },
    { id: 'flirt', rank: 72, patterns: [/\b(flirt\w*|seduce|sexy|hot stuff|you(?:'re| are) (?:so )?(?:hot|cute|sexy|fit)|bedroom|naughty|tease|handsome|wink)\b/i],
      examples: ['you are so hot', 'stop flirting with me', 'are you trying to seduce me', 'you are a tease'],
      responses: [{ text: "Finally. I was starting to think you'd never ask.", mood: 'delighted' }, 'Bold. I like bold. Bold gets a second drink.', 'Careful, sugar. I bite. Only when asked nicely.', "Tu es mignon. Dangerously mignon. That's French for 'in trouble'.", "Naughty? Darling, I invented naughty. Then I sold the patent.", "Tease? I never tease. I promise, and then I deliver. Eventually.", "You're cute when you're flustered. Do it again."] },
    { id: 'dateAsk', rank: 71, patterns: [/\b(go out|date with|on a date|dinner with me|take you out|take you to dinner|are you single|single\?)\b/i],
      examples: ['would you go on a date with me', 'can i take you to dinner', 'are you seeing anyone'],
      responses: ["A date? Pick somewhere dark with good champagne. I'll pick the rest.", "Single? I'm available. That's different. Single means lonely. Available means hurry up.", "Dinner? Lovely. I'll order for both of us. You'll be dessert."] },
    { id: 'drinkOffer', rank: 70, patterns: [/\b(drink|cocktail|martini|champagne|wine|gin|whisky|vodka|bar)\b/i],
      examples: ['can i get you a drink', 'what are you drinking', 'fancy a cocktail'],
      responses: ["A martini. Dirty. Like my intentions.", "Champagne, sugar. Anything with bubbles makes me forget my manners.", "Whatever you're having. Then whatever you're hiding.", "Gin. Two ice cubes. One for the glass, one for later."] },
    { id: 'dance', rank: 69, patterns: [/\b(dance|dancing|tango|waltz|twirl)\b/i], examples: ['will you dance with me', 'lets dance'],
      responses: ["Dance? I lead. Hands where I can see them. Lower. Lower. Stop.", "I only dance on tables, darling. The furniture in here is very forgiving.", "Esme taught me the tango. I taught her the part where you forget your own name."] },
    { id: 'outfit', rank: 68, patterns: [/\b(dress|fishnets?|stockings|boa|feathers?|lipstick|heels|slit|neckline|cleavage|legs|perfume|earrings|smell\w*|scent)\b/i],
      examples: ['i like your outfit', 'where did you get that dress', 'nice heels'],
      responses: ["The slit goes all the way up. So does my price for telling you where it ends.", "Fishnets. Because a girl should always look a little bit caught.", "The boa? Pink, fluffy, and absolutely lethal. Like me.", "This old dress? Luca took it in. Twice. He kept the measurements.", "My legs go all the way to the floor. I checked this morning.", "The perfume's called 'Regret'. You'll smell it on your pillow."] },
    { id: 'cigarette', rank: 67, patterns: [/\b(cigarette|smok\w*|holder|light|lighter|ashtray)\b/i], examples: ['can i have a cigarette', 'do you smoke', 'got a light'],
      responses: ["A cigarette holder means you never have to get too close. Unless you want to.", "Smoking? Only after. Or during, if the conversation's dull.", "Got a light? No. Got a flame? Look closer.", "It's prop smoke, sugar. Everything about me is a little bit for show."] },
    { id: 'compliment', rank: 66, patterns: [/\b(beautiful|gorgeous|pretty|lovely|elegant|stunning|smart|clever|amazing|nice (?:dress|hair|outfit|shoes|style|coat)|love your|like your|cool|charming|you look (?:great|good|nice|amazing|lovely|gorgeous|beautiful|incredible))\b/i],
      examples: ['you look amazing tonight', 'you are very attractive', 'you are the best looking person here'],
      effect: m => { m.flattered = (m.flattered || 0) + 1; m.patience = Math.min(5, m.patience + 1); },
      responses: [
        { when: m => m.flattered >= 2 && m.scheme === 0, mood: 'scheming', effect: m => { m.scheme = 1; m.pending = 'key'; }, text: "Keep talking like that and I'll follow you anywhere. Starting with your room. Lend me your key tonight?" },
        { when: m => !(m.flattered >= 2 && m.scheme === 0), text: 'Finally, someone with eyes. Use them. Keep going.' },
        { when: m => !(m.flattered >= 2 && m.scheme === 0), text: 'I know. But say it again, with feeling.' },
        { when: m => !(m.flattered >= 2 && m.scheme === 0), text: "Flattery. Cheap, but I'm feeling generous tonight." },
        { when: m => !(m.flattered >= 2 && m.scheme === 0), text: 'Keep that up and I might let you walk me to the lift. Slowly.' },
      ] },
    { id: 'jealousy', rank: 65, patterns: [/\b(prettier|hotter|sexier|better looking|more beautiful)\b/i], examples: ['ada is prettier than you', 'someone else is hotter'],
      responses: ["Prettier than me? Take your time. Look again. I'll wait.", "Hotter? Sugar, I'm wearing a boa and a cigarette holder. Nobody beats this level of commitment.", "Fine. Go and flirt with them. I'll be here, being better."] },

    // ---- Names: yours, and the many she claims ----
    { id: 'nameIntro', rank: 64, patterns: [/\b(?:my name(?:'s| is)|call me|the name's)\s+[A-Za-z]/i, /\b(?:i am|i'm|im|it's|its)\s+[A-Z][a-z'-]{1,17}\b/],
      extract: (t, c, m) => {
        const hit = t.match(/\b(?:my name(?:'s| is)|call me|the name's)\s+([A-Za-z][A-Za-z'-]{1,17})/i) || t.match(/\b(?:i am|i'm|im|it's|its)\s+([A-Z][a-z'-]{1,17})\b/);
        if (!hit || NOT_NAMES.has(hit[1].toLowerCase()) || NO_ECHO.test(hit[1].toLowerCase())) return null;
        const given = cap(hit[1].toLowerCase());
        return { given, had: m.name, differs: !!(c.playerName && given.toLowerCase() !== String(c.playerName).toLowerCase()) };
      },
      effect: (m, c, s) => { m.name = s.given; },
      responses: [
        { when: (m, c, s) => s.had && s.had !== s.given, text: "An hour ago you were {had}. Now you're {given}. Mysterious. I like you more already." },
        { when: (m, c, s) => !(s.had && s.had !== s.given) && s.differs, text: '{given}? Funny. Your key card says {playerName}. I\'ll keep your secret. For a kiss.' },
        { when: (m, c, s) => !(s.had && s.had !== s.given) && !s.differs, text: "{given}. I'll be whispering that later." },
        { when: (m, c, s) => !(s.had && s.had !== s.given) && !s.differs, text: '{given}. Rolls off the tongue. So would a lot of things.' },
        { when: (m, c, s) => !(s.had && s.had !== s.given) && !s.differs, text: '{given}. I\'ll use it when I want something. I want a lot of things.' },
      ] },
    { id: 'whoAreYou', rank: 63, patterns: [/\b(who are you|what(?:'s| is) your name|your name|tell me about (?:yourself|you)|what do you do|where are you from|who r u)\b/i, /\bwhat are you\??\s*$/i],
      examples: ['tell me who you are', 'what is your story', 'introduce yourself'],
      effect: (m, c, s, rng) => { const fresh = LIES.filter(l => !m.lies.includes(l)), pool = fresh.length ? fresh : LIES; s.lie = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]; m.lies.push(s.lie); m.lies = m.lies.slice(-6); },
      responses: ["Sofia. I'm {lie}. You may stop staring. Or don't. I like it.", "Sofia Delacroix. Allegedly. I'm {lie}. Don't check.", "They call me Sofia. I'm {lie}. And tonight I'm your problem."] },
    { id: 'age', rank: 62, patterns: [/\b(how old|your age|what age|born when)\b/i],
      responses: ["Old enough to know better. Young enough to do it anyway.", "A lady never tells. I'm not a lady, but I still won't tell.", "Thirty-eight. Same as last year. And the year before."] },
    { id: 'howAreYou', rank: 61, patterns: [/\b(how are you|how're you|how(?:'s| is) it going|how you doing|you ok|you alright|how have you been)\b/i],
      examples: ['how is your evening going', 'how are things'],
      responses: ['Hot. Thank you for noticing.', "Better now you're here. Don't let it go to your head.", 'Bored. Entertain me, sugar.', 'Dangerous. The usual.'] },

    // ---- Your mood ----
    { id: 'unhappy', rank: 60, patterns: [/\b(i(?:'m| am| feel)? (?:so |really )?(?:sad|lonely|depressed|miserable|down|upset|tired)|bad day|rough day|heartbroken|dumped)\b/i],
      examples: ['i feel sad tonight', 'i am lonely', 'i had an awful day'],
      responses: ["Come here. Not too close, the boa sheds. There. Better?", "Lonely? In a hotel full of strangers and me? That's a choice, darling. Make a better one.", "Heartbroken? Good. Broken things let more light in. And more champagne.", "Sit. Drink. Tell me who did it. I'll handle them. Discreetly."] },
    { id: 'happy', rank: 59, patterns: [/\b(i(?:'m| am| feel)? (?:so |really )?(?:happy|great|excited|good|fantastic)|good day|great night|i won)\b/i],
      examples: ['i feel great tonight', 'what a good day'],
      responses: ["Happy? It suits you. Most things would.", "Good mood? Careful. That's when people make delicious mistakes.", "Excited already? I haven't even started."] },
    { id: 'boring', rank: 58, patterns: [/\b(i(?:'m| am) bored|so bored|nothing to do|this is boring)\b/i], examples: ['nothing to do here'],
      responses: ["Bored? Then you haven't been paying attention to me.", "Boredom is a symptom. The cure is bad behaviour. I prescribe two.", "Let's go and ruin Jules's evening. That's always a laugh."] },
    { id: 'funny', rank: 57, patterns: [/\b(tell me a joke|say something funny|make me laugh|joke)\b/i], examples: ['tell me something funny'],
      responses: ["A man walks into a bar. He leaves with no wallet and a smile. I was the bar.", "What's the difference between me and a key card? A key card only opens one door.", "Knock knock. Who's there? Sofia. Sofia who? Exactly. Nobody ever knows. That's the trick."] },
    { id: 'secret', rank: 56, patterns: [/\b(secret|gossip|rumou?r|tell me something|scandal)\b/i], examples: ['tell me something nobody knows', 'what is the gossip'],
      responses: ["Secret? The night manager sleepwalks to the rooftop. In nothing but a bow tie.", "Half the guests in this hotel have been in my room. The other half are lying about it.", "The Grand Reserve isn't that rare. I've just been drinking the rest.", "I once lost a bet and had to kiss a duke. I won the bet, actually. I just wanted to."] },
    { id: 'thanks', rank: 55, patterns: [/\b(thanks|thank you|cheers|ta)\b/i],
      responses: ["Thank me later. Properly.", "Don't thank me. Owe me. It's more fun.", 'You\'re welcome, sugar. Add it to your tab.'] },

    // ---- What she wants: your suite, and to sneer at the machines ----
    { id: 'room', rank: 54, patterns: [/\b(suite|room|key|keys|408|keycard|door|bed|let yourself in|broke in|break in|get in|got in)\b/i],
      examples: ['where do you sleep', 'what about my room'],
      extract: t => ({ invited: /let yourself in|broke in|break in|get in|got in|my (?:room|suite)/i.test(t) }),
      responses: [
        { when: (m, c, s) => c.visitor && s.invited, text: "Your suite? You invited me, darling. I remember everything. Especially the bits you'd rather I didn't." },
        { when: (m, c, s) => !(c.visitor && s.invited) && m.scheme === 0, mood: 'scheming', effect: m => { m.scheme = 1; m.pending = 'key'; }, text: '408. Corner suite, city view, very big bed. Wasted on one person. Lend me your key tonight?' },
        { when: (m, c, s) => !(c.visitor && s.invited) && m.scheme === 1, mood: 'scheming', effect: m => { m.pending = 'key'; }, text: "About that key. I'm asking nicely. I can also ask not-so-nicely." },
        { when: (m, c, s) => !(c.visitor && s.invited) && m.scheme === 2, text: "Don't worry about 408. I'm taking excellent care of it. I've already tested the bed." },
        { when: (m, c, s) => !(c.visitor && s.invited) && m.scheme === 2, text: "Your sheets are lovely, by the way. I'd know." },
      ] },
    { id: 'money', rank: 53, patterns: [/\b(credits?|money|rich|broke|cash|win|won|jackpot|slots?|machines?|spin|bet|gamble|lucky|luck|casino|deposit\w*|fund\w*|pay\w*|buy\w*|purchas\w*|top ?up|wallet)\b/i],
      examples: ['should i play the machines', 'how do i win'],
      responses: [
        "The machines? Never play the one by the door. Not because it's rigged. Because I'm sitting there.",
        'Credits are pretend, darling. Like my maidenhood.',
        'I never gamble. I let other people gamble near me and make friends with whoever wins.',
        "Lucky? Sugar, luck is just a man who doesn't check his pockets.",
        { when: (m, c) => Number(c.credits) > 3000, text: '{credits} credits. You must be terrible at hiding things. Hide them better.' },
        { when: (m, c) => Number(c.credits) < 200, text: 'Low on credits? Character-building. You need the character more than the credits.' },
      ] },
    { id: 'gossip', rank: 52, patterns: [GUEST_RX], extract: t => { const g = t.match(GUEST_RX); return g ? { guest: g[1].toLowerCase() } : null; },
      responses: [...Object.entries(GUESTS).flatMap(([g, lines]) => lines.map(text => ({ when: (m, c, s) => s.guest === g, text })))] },
    { id: 'whoIsHere', rank: 51, patterns: [/\b(who(?:'s| is) here|who should i (?:meet|talk to)|anyone interesting|who else)\b/i], examples: ['who is worth talking to', 'who are the other guests'],
      responses: ["Everyone interesting is already talking to me. You're welcome.", "Talk to Noor if you want music. Talk to Rafi if you're hungry. Talk to me if you want trouble.", "Avoid Inez if you've got secrets. Find me if you want new ones."] },
    { id: 'likes', rank: 50, patterns: [/\bi (?:really )?(?:like|love|enjoy|adore)\s+[a-z]/i],
      extract: t => { const hit = t.toLowerCase().match(/\bi (?:really )?(?:like|love|enjoy|adore)\s+([a-z][a-z' -]{1,40})/); if (!hit) return null; const thing = hit[1].replace(/[^a-z' -]/g, '').trim().split(' ').slice(0, 3).join(' '); return thing && !thing.split(' ').some(w => NO_ECHO.test(w)) ? { thing, Thing: cap(thing) } : null; },
      effect: (m, c, s) => { m.likes.push(s.thing); m.likes = m.likes.slice(-5); },
      responses: ["You like {thing}? Noted. I'll wear something about it.", '{Thing}. Of course you do. Tell me more. Slowly.', '{Thing}? I had a lover who liked {thing}. Lovely hands. Terrible memory.', "{Thing}. How wholesome. I'll corrupt it later."] },
    { id: 'aboutMe', rank: 49, patterns: [/\bi(?:'m| am) an? [a-z]+|\bi work (?:as|in|at)\b|\bmy job\b/i],
      extract: t => { const hit = t.match(/\bi(?:'m| am) an? ([a-z]+)|\bi work (?:as an?|in|at) ([a-z]+)/i); const job = hit ? (hit[1] || hit[2]).toLowerCase() : null; return job && !NO_ECHO.test(job) ? { job } : (/\bmy job\b/i.test(t) ? { job: 'that' } : null); },
      responses: ["A {job}? I've always wanted one of those. For about an evening.", "{^job}. Sounds exhausting. Let me take your mind off it.", "A {job}. I dated one of those. Well. I borrowed one."] },
    { id: 'food', rank: 48, patterns: [/\b(hungry|food|eat|dinner|breakfast|snack|starving|dessert)\b/i],
      responses: ["Hungry? Rafi's in the Gold Lounge. I'm dessert.", "Breakfast in bed is my favourite meal. Whose bed is negotiable.", "I don't eat in public. It distracts the men."] },
    { id: 'music', rank: 47, patterns: [/\b(music|song|jazz|sax(?:ophone)?|dj|playlist|tune|sing)\b/i],
      responses: ["Noor's sax on the rooftop. Close your eyes. Now imagine I'm next to you. Now open them. Disappointed?", "My song? Something slow, something low, something you'd regret dancing to.", "Zuri plays my song every night. I've never told her which one it is."] },
    { id: 'night', rank: 46, patterns: [/\b(tonight|nice night|lovely evening|what time|late|midnight|the moon|stars)\b/i],
      responses: ["The night is young. I'm not, but I'm better at it.", "Midnight's when the interesting people come out. And the rest of us stop pretending.", "Nice night? It's about to get nicer."] },
    { id: 'places', rank: 45, patterns: [/\b(where|explore|lobby|roof(?:top)?|arcade|neon|lounge|gold|view|floor|go next|advice|tips?|recommend|suggest|what should i)\b/i],
      examples: ['where should i go', 'any recommendations'],
      responses: [
        'Take the service lift to floor nine. Ask for Gerald. There is no floor nine. Or Gerald.',
        { when: (m, c) => !!ROOM_BARBS[c.room], text: '{roomBarb} Try somewhere you\'d be less noticed. Everywhere, really.' },
        'The rooftop at sunset. Lovely view. Very dark corners. Bring me.',
        'Advice? Never trust anyone in this hotel. Especially the gorgeous ones. Hello.',
      ] },
    { id: 'greet', rank: 44, patterns: [/^\s*(hi|hey|hello|evening|good evening|hiya|yo|howdy|greetings|morning|afternoon)\b/i],
      responses: ['Well hello, {you}. You clean up nicely.', "Evening, sugar. Don't make me do all the work.", 'Ah, {you}. I was hoping it would be you. I lie a lot, but not about that.', "Hello yourself. Turn around. Slowly. Thank you."] },
    { id: 'yesNo', rank: 40, patterns: [/^\s*(yes|yeah|yep|yup|sure|ok(?:ay)?|fine|alright|no|nope|nah|never)\b/i],
      responses: ["I didn't ask you anything. But I'll take that as a yes to everything.", 'Agreeing already? Easy. I like easy.', "No? Funny. Your eyes said yes."] },

    // ---- Fallbacks, in order ----
    { id: 'callback', fallback: true, extract: (t, c, m, rng) => (m.likes.length && rng() < .35 ? { like: m.likes[m.likes.length - 1] } : null),
      responses: ['Still thinking about {like}? You should be thinking about me.', "{^like} again? Darling, I'm right here."] },
    { id: 'business', fallback: true, when: m => m.scheme === 0 && m.turns >= 4, effect: m => { m.scheme = 1; m.pending = 'key'; },
      responses: [{ mood: 'scheming', text: "This is lovely, but let's talk about tonight. Your room key. Yes?" }] },
    { id: 'question', fallback: true, extract: t => (isQuestion(t) ? { word: salientWord(t) } : null),
      responses: [
        { when: (m, c, s) => !!s.word, text: '{^word}? Darling, I only answer questions over a second drink.' },
        { when: (m, c, s) => !s.word, text: 'I only answer questions over a second drink.' },
        'Why would I tell you that? Take me to dinner first.',
        { when: (m, c, s) => !!s.word, text: "Ask Jules about {word}. He'll make something up. I'd make up something better, but I'm busy looking at you." },
      ] },
    { id: 'reflect', fallback: true, extract: t => { const w = salientWord(t); return w ? { word: w } : null; },
      responses: ["'{^word}'. Fascinating. Say it again, but closer.", "I stopped listening at '{word}'. You have very distracting lips.", "Nobody here cares about {word}, {you}. I care about what you're doing later.", "{^word}. Is that a hobby or a pickup line? Either way, it's working. Barely."] },
    { id: 'filler', fallback: true, responses: ['Mm.', 'Riveting. Keep going, I like the sound of your voice.', "And then what? Don't stop."] },
  ],

  // Reactions to things other residents say nearby (short: these appear in the ambient bubbles).
  reactions: [
    { match: /\bsofia\b/i, lines: ['Talking about me again? Good.', "Say it louder, I'm right here.", 'All true. Especially the bad parts.'] },
    { match: /\b(win|won|credits?|machine|round)\b/i, lines: ['Winning? Keep it. Just stand closer.', 'Luck looks good on you. So would I.', 'Careful, sugar. Winners attract me.'] },
    { match: /\b(record|music|song|melody|jazz|set)\b/i, lines: ['Play something slow. I have plans.', 'Music? Turn it down, I can\'t hear myself flirt.'] },
    { match: /\b(food|eat|dinner|cook|recipe|dessert)\b/i, lines: ["Save me dessert. I'll save you a seat.", 'Feed me later. Somewhere private.'] },
    { speaker: 'Jules', lines: ['Jules, darling, nobody wants your pressings. Except me. Later.', 'Jules is explaining vinyl again. Somebody kiss him quiet.'] },
    { speaker: 'Ada', lines: ['Ada, sweetheart, that bench needs two people. Volunteering.', 'Ada is measuring the lobby again. Measure me next.'] },
    { speaker: 'Otto', lines: ['Otto, my bed squeaks. Bring the toolbox.', 'Otto fixes everything except his love life. I could help.'] },
    { speaker: 'Farah', lines: ['Farah knows where everyone sleeps. Useful woman.', 'Farah, any new arrivals? Asking for my lipstick.'] },
    { speaker: 'Inez', lines: ['Inez, no follow-up questions. Please.', 'Objection, Inez. On the grounds that I look fabulous.'] },
    { speaker: 'Rafi', lines: ['Rafi, if that\'s chocolate, I\'m in love.', 'Feed me, Rafi. Then feed my ego.'] },
    { speaker: 'Mabel', lines: ['Mabel, I see you looking at my weak flank.', "Don't play Mabel. Play me. I cheat prettier."] },
    { speaker: 'Kofi', lines: ['Kofi, do my voice again. The breathy one.', 'Bravo, Kofi. Now take a bow. Lower.'] },
    { speaker: 'Esme', lines: ['Esme, teach me that turn. I need a quick exit.', 'Esme dances. I just make people watch.'] },
    { speaker: 'Kit', lines: ['Kit, that skateboard is going in my room. With you on it.', 'Kit thinks he\'s trouble. Adorable.'] },
    { speaker: 'Bea', lines: ['Bea, which star is mine? The brightest. Obviously.', "Bea's looking up. I'm looking at you."] },
    { speaker: 'Wren', lines: ["Wren, make my ex vanish.", 'Lost your key again, Wren? Check my garter.'] },
    { speaker: 'Niko', lines: ["Niko, explain the rules again. I'm not listening, I just like your mouth.", 'Niko loves rules. I love Niko breaking them.'] },
    { speaker: 'Dev', lines: ['Dev, seven letters for "tempting". S-O-F-I-A. Fine, five.', 'Dev, my clue: dangerous, red, available.'] },
    { speaker: 'Noor', lines: ['Noor, play the slow one. I have someone to ruin.', 'That sax should come with a warning.'] },
    { speaker: 'Zuri', lines: ['Zuri, drop the beat. I dropped my inhibitions in 2014.', 'Zuri knows my song. Don\'t tell anyone, Zuri.'] },
    { speaker: 'Arun', lines: ['Arun, talk to me like you talk to your ferns.', 'Arun prunes. I prune men.'] },
    { speaker: 'Luca', lines: ['Luca, it needs to be higher. The slit, darling.', 'Luca has my measurements. Lucky Luca.'] },
    { speaker: 'Tessa', lines: ['Off the record, Tessa: everything you heard is true.', "Tessa, quote me: 'She was devastating'."] },
    { lines: ['Oh là là, quel drame.', 'Mon Dieu, these people.', 'Mm. Fascinating. Not really.', 'Somebody in this room needs a drink. Me.', 'Darling, nobody asked. But do go on.', 'Is anyone else hot? Or is it just me? Just me.'] },
  ],
};

// ---------------------------------------------------------------------------------------------------------------------
export function createSofia() {
  return { version: SOFIA_VERSION, turns: 0, patience: 5, name: null, likes: [], lies: [], used: {},
    scheme: 0, pending: null, insults: 0, flattered: 0, lastUser: '', met: 0, refusedInvite: 0, visits: 0, lastIntent: null };
}

// Defensive restore from storage: anything malformed falls back to a fresh Sofia.
export function loadSofia(raw) {
  const d = createSofia();
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== SOFIA_VERSION) return d;
    for (const k of ['turns', 'insults', 'flattered', 'met', 'refusedInvite', 'visits']) if (Number.isFinite(s[k]) && s[k] >= 0) d[k] = Math.floor(s[k]);
    if (Number.isFinite(s.patience)) d.patience = Math.max(0, Math.min(5, Math.floor(s.patience)));
    if (Number.isInteger(s.scheme) && s.scheme >= 0 && s.scheme <= 2) d.scheme = s.scheme;
    if (typeof s.name === 'string' && /^[A-Za-z][A-Za-z'-]{0,17}$/.test(s.name)) d.name = s.name;
    if (Array.isArray(s.likes)) d.likes = s.likes.filter(x => typeof x === 'string').map(x => x.slice(0, 40)).slice(-5);
    if (Array.isArray(s.lies)) d.lies = s.lies.filter(x => LIES.includes(x)).slice(-6);
    if (s.pending === 'key' || s.pending === null) d.pending = s.pending;
    // A fresh visit restores a little patience; she holds grudges, not forever.
    d.patience = Math.min(5, Math.max(d.patience, 2));
    return d;
  } catch { return d; }
}

export function sofiaOpener(mem, ctx = {}, rng = Math.random) {
  mem.met++;
  const you = PERSONA.slots(mem, ctx, rng).you;
  let text;
  if (ctx.visitor) text = (mem.visits = (mem.visits || 0) + 1) > 1 ? "Back in 408, sugar. I've warmed up your side of the sofa." : 'So this is 408. Smaller than I imagined. Everything usually is.';
  else if (mem.patience <= 1) text = 'Oh. You again. Pity, you were starting to look interesting.';
  else if (ctx.hat === 'fedora') text = "Nice fedora. Keep it on. Leave the rest to my imagination. It's very vivid.";
  else if (mem.name) text = `${mem.name}. You came back. They always come back.`;
  else if (mem.met > 1) text = `Back again, ${you}? Couldn't stay away. They never can.`;
  else text = "Bonsoir, 408. I've been dying to get my hands on you. And your room key.";
  return { text, mood: moodFor(mem), walkAway: false };
}

// Her parting shot when you walk off mid-conversation.
export function sofiaWalkedOff(mem, rng = Math.random) {
  const lines = ["Walking away mid-sentence? Rude. Lovely view from back here, though.", "Go on, then. Walk slowly. I'm watching.", "Don't worry, I'll tell everyone you couldn't handle me."];
  const used = new Set(mem.used.walkoff || []);let pool = lines.map((l, i) => i).filter(i => !used.has(i));if (!pool.length) { used.clear(); pool = [0, 1, 2]; }
  const i = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];used.add(i);mem.used.walkoff = [...used];
  return { text: lines[i], mood: moodFor(mem), walkAway: false };
}

// The player talks to Sofia. opts.intent/opts.p let an external classifier (e.g. Jev) pick the intent.
export function sofiaReply(mem, input, ctx = {}, rng = Math.random, opts = {}) {
  return respond(PERSONA, mem, input, ctx, rng, opts);
}

// Another resident says something within earshot. Returns {text, mood, to} or null.
export function sofiaHears(mem, speaker, said, ctx = {}, rng = Math.random) {
  return react(PERSONA, mem, speaker, said, ctx, rng);
}

// The intent catalogue, for an external classifier: ids plus a few example phrases each.
export function sofiaIntents() {
  return PERSONA.intents.filter(i => !i.fallback && (i.patterns || i.examples)).map(i => ({ id: i.id, examples: (i.examples || []).slice(0, 4) }));
}
export const sofiaClassify = (mem, text, ctx = {}) => classify(PERSONA, text, mem, ctx);
export const sofiaLineCount = () => lineCount(PERSONA);

// Context-aware quick replies for the inline talk bar.
export function sofiaSuggestions(mem, ctx = {}) {
  if (mem.pending === 'key') return ['Sure, take it', 'Absolutely not', 'Why do you want it?'];
  if (mem.patience <= 2) return ['Sorry', "You're a terrible person", 'Bye'];
  if (ctx.visitor) return ['Welcome to 408', 'Pour you a glass?', 'Time to go'];
  if (!mem.lies.length) return ['Who are you?', `My name is ${ctx.playerName || 'Alex'}`, 'You look gorgeous'];
  if (mem.lies.length === 1) return ['Who are you, really?', 'Tell me a secret', 'Nice dress'];
  const pool = [['You said something else before', 'Kiss me', 'Tell me about Otto'], ['Dance with me', 'Tell me a joke', 'What are you drinking?'], ['Are you single?', 'Got a light?', 'Tell me about Luca']];
  return pool[mem.turns % pool.length];
}
