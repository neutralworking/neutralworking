import test from 'node:test';
import assert from 'node:assert/strict';
import {createSofia,loadSofia,sofiaReply,sofiaOpener,sofiaSuggestions,sofiaWalkedOff} from '../dist/sofia.js';

const seeded=seed=>()=>((seed=(seed*16807)%2147483647)/2147483647);
const ctx={playerName:'Alex',credits:2500,room:'lobby',canHost:false};
const chat=(m,lines,c=ctx,rng=seeded(5))=>lines.map(t=>sofiaReply(m,t,c,rng));

test('she learns your name, needles you about it and uses it later',()=>{
 const m=createSofia();
 const [r]=chat(m,['My name is Luke']);
 assert.equal(m.name,'Luke');assert.match(r.text,/Luke/);assert.match(r.text,/Alex/,'notices it is not the name on the key card');
 const later=sofiaOpener(m,ctx,seeded(2));assert.match(later.text,/Luke/);
 assert.equal(createSofia().name,null);chat(createSofia(),["I'm fine"]);
 const m2=createSofia();chat(m2,["I'm fine, thanks"]);assert.equal(m2.name,null,'"fine" is not a name');
});

test('every "who are you" is a new lie, and she can be caught out with both',()=>{
 const m=createSofia();
 const [a,b]=chat(m,['Who are you?','who are you, really?']);
 assert.notEqual(a.text,b.text);assert.equal(m.lies.length,2);
 const [caught]=chat(m,['You said something else before']);
 assert.match(caught.text,/I said I was/);assert.ok(m.lies.every(l=>caught.text.includes(l.split('.')[0])));
});

test('rudeness drains her patience until she storms off',()=>{
 const m=createSofia();const replies=chat(m,['you idiot','shut up','you are so boring','stupid','you are awful']);
 const storm=replies.find(r=>r.walkAway);assert.ok(storm,'she walks away eventually');assert.equal(storm.mood,'furious');assert.equal(m.patience,0);
 assert.deepEqual(sofiaSuggestions(m,ctx).includes('Sorry'),true);
 chat(m,['sorry']);assert.equal(m.patience,1,'an apology buys a little back');
});

test('she reacts to what you tell her and throws it back at you',()=>{
 const m=createSofia();const [like]=chat(m,['I like jazz']);assert.match(like.text,/jazz/i);assert.deepEqual(m.likes,['jazz']);
 const [gossip]=chat(m,['tell me about Otto']);assert.match(gossip.text,/Otto/);
 const [reflect]=chat(m,['the thing is marmalade'],ctx,()=>.9);assert.match(reflect.text,/marmalade/i);
 const [rep]=chat(m,['the thing is marmalade']);assert.equal(rep.intent,'repeat');assert.match(rep.text,/said that already|Again\?|Twice\?/);
});

test('the room-key con: she asks, and remembers your answer',()=>{
 const m=createSofia();const [ask]=chat(m,['nice suite I have']);assert.equal(m.pending,'key');assert.equal(ask.mood,'scheming');
 const [why]=chat(m,['why do you want it?']);assert.match(why.text,/minibar/);assert.equal(m.pending,'key');
 const [yes]=chat(m,['sure, take it']);assert.equal(m.scheme,2);assert.equal(yes.mood,'delighted');
});

test('invitation is gated on The Grand Reserve, and she never mentions paying or depositing',()=>{
 const m=createSofia();
 const [no1,no2]=chat(m,['Come up to my suite?','come up to my suite later']);
 assert.equal(no1.needs,'reserve');assert.match(no1.text,/Grand Reserve/);assert.match(no2.text,/Grand Reserve/);assert.ok(!no1.invite&&!no2.invite);
 const [yes]=chat(m,['Come up to my suite?'],{...ctx,canHost:true});assert.equal(yes.invite,true);
 const [here]=chat(m,['come up to my suite'],{...ctx,visitor:true,room:'suite',canHost:true});assert.ok(!here.invite);
 const rude=createSofia();chat(rude,['idiot','stupid','shut up','you are awful']);const [cold]=chat(rude,['Come up to my suite?'],{...ctx,canHost:true});assert.ok(!cold.invite,'has to earn it back');
});

test('fuzz: never throws, never empty, never pushes deposits or funding',()=>{
 const words=['hi','who','are','you','suite','key','credits','money','deposit','fund','win','jules','mika','theo','idiot','sorry','nice','dress','come','up','my','room','yes','no','why','bye','?','!','I','like','jazz','where','go','reserve','drink','get','out','LOUD','💎','408'];
 const rng=seeded(42);
 for(let run=0;run<60;run++){const m=createSofia();const c={...ctx,canHost:rng()<.5,visitor:rng()<.3,credits:Math.floor(rng()*6000)};
  sofiaOpener(m,c,rng);
  for(let i=0;i<40;i++){const n=1+Math.floor(rng()*8),t=Array.from({length:n},()=>words[Math.floor(rng()*words.length)]).join(' ');const r=sofiaReply(m,t,c,rng);
   assert.ok(r.text&&r.text.length<240,t);assert.doesNotMatch(r.text,/\b(deposit|top[ -]?up|fund(ing|s)?|buy|purchase|pay(ment)?)\b/i,`${t} -> ${r.text}`);}}
});

test('memory restores defensively from storage',()=>{
 const m=createSofia();chat(m,['My name is Luke','who are you','I like jazz']);
 const back=loadSofia(JSON.stringify(m));assert.equal(back.name,'Luke');assert.deepEqual(back.likes,['jazz']);assert.equal(back.lies.length,1);
 assert.deepEqual(loadSofia('nope'),createSofia());
 const bad=loadSofia(JSON.stringify({...m,name:'<script>',lies:['made up'],scheme:9,patience:-4}));
 assert.equal(bad.name,null);assert.deepEqual(bad.lies,[]);assert.equal(bad.scheme,0);assert.ok(bad.patience>=2,'a new visit restores some patience');
 assert.match(sofiaWalkedOff(createSofia(),seeded(1)).text,/\w/);
});

// ---- NPC brain coverage ------------------------------------------------------------------------------------------
import {sofiaHears,sofiaIntents,sofiaClassify,sofiaLineCount} from '../dist/sofia.js';
import {tokens} from '../dist/npc-brain.js';

test('Sofia has well over 100 authored responses, plus reactions to other residents',()=>{
 const n=sofiaLineCount();assert.ok(n.intents>=150,`${n.intents} player-facing lines`);assert.ok(n.reactions>=40,`${n.reactions} reaction lines`);
 assert.ok(sofiaIntents().length>=40,'intent catalogue is broad');
 for(const i of sofiaIntents())assert.match(i.id,/^[a-zA-Z]+$/);
});

test('classifier understands phrasings it was never given (held-out set)',()=>{
 const cases=[['hello there gorgeous',['greet','compliment']],['whats your story then',['whoAreYou']],['can i have a light for my cigarette',['cigarette']],['you smell incredible',['outfit']],['i feel so lonely tonight',['unhappy']],['do you want to dance',['dance']],['are you an AI',['aiQuestion']],['fancy a martini',['drinkOffer']],['will you marry me',['love']],['give us a kiss',['kiss']],['you are an idiot',['insult']],['im calling security',['threat']],['how old are you',['age']],['tell me a secret',['secret']],['who should i talk to here',['whoIsHere']],['i work as a nurse',['aboutMe']],['im starving',['food']],['play me a song',['music']],['come back to mine tonight',['invite']],['what do you think of jules',['gossip']],['where should i go next',['places']],['thanks sofia',['thanks']],['im so bored',['boring']],['tell me a joke',['funny']],['you look stunning',['compliment']],['she is prettier than you',['jealousy']],['what are you up to tonight',['night']],['are you seeing anyone',['dateAsk']],['nobody likes you',['insult']],['i have to go now',['bye']],['what are you?',['whoAreYou']],['your dress is unreal',['outfit']]];
 let ok=0;const misses=[];for(const [t,want] of cases){const r=sofiaReply(createSofia(),t,ctx,()=>.3);if(want.includes(r.intent))ok++;else misses.push(`${t} -> ${r.intent}`);}
 assert.ok(ok/cases.length>=.9,`accuracy ${ok}/${cases.length}: ${misses.join('; ')}`);
});

test('classification is a ranked, probabilistic decision (the same shape a hosted model would return)',()=>{
 const ranked=sofiaClassify(createSofia(),'you look gorgeous, kiss me');assert.ok(ranked.length>=2);assert.equal(ranked[0].id,'kiss','the stronger rule wins');
 assert.ok(ranked.every(x=>x.p>0&&x.p<=1));assert.ok(Math.abs(ranked.reduce((a,x)=>a+x.p,0)-1)<.01,'probabilities sum to 1');
 assert.deepEqual(tokens("She's dancing in fishnets"),['she','dance','in','outfit'],'synonyms and stemming normalise input');
});

test('an external classifier (e.g. a hosted typed-decision model) can choose the intent; Sofia still writes the words',()=>{
 const m=createSofia();const r=sofiaReply(m,'asdf qwerty',ctx,seeded(3),{intent:'kiss',p:.91});assert.equal(r.intent,'kiss');assert.equal(r.via,'external');assert.equal(r.p,.91);assert.match(r.text,/\w/);
 const bad=sofiaReply(createSofia(),'hello',ctx,seeded(3),{intent:'not-a-real-intent'});assert.equal(bad.intent,'greet','unknown external intents fall back to her own classifier');
});

test('she is French: emotional moods come out in French',()=>{
 const m=createSofia();const replies=chat(m,['you idiot','shut up','you are so boring','stupid','you are awful']);
 const storm=replies.find(r=>r.walkAway);assert.match(storm.text,/Ça suffit|Non, non|Quel désastre|Merde/);assert.match(storm.text,/\(.+\)/,'with an English gloss');
 const annoyed=replies.find(r=>r.mood==='annoyed');assert.match(annoyed.text,/^(Pff|Oh là là|Bof|Tsk|Mon Dieu)/);
 const glad=sofiaReply(createSofia(),'kiss me',ctx,seeded(2));assert.equal(glad.mood,'delighted');assert.match(glad.text,/(là là|Magnifique|parfait|mon chou|Délicieux)\.?$/);
 const pet=new Set();for(let i=0;i<40;i++)pet.add(sofiaReply(createSofia(),'hello',{...ctx,presentation:'woman'},seeded(((i+1)*2654435761)%2147483647)).text);assert.ok([...pet].some(t=>/chérie|mon chou/.test(t)),'French pet names');assert.ok(![...pet].some(t=>/chéri\b/.test(t)),'gendered to the player');
});

test('she reacts to other residents: by speaker, by topic, and when she is mentioned',()=>{
 const m=createSofia();
 assert.match(sofiaHears(m,'Jules','That original pressing is mint.',{},seeded(1)).text,/Jules/);
 assert.match(sofiaHears(m,'Kit','Anyone seen Sofia?',{},seeded(1)).text,/me|Say it|true/i,'being mentioned beats the speaker pool');
 assert.match(sofiaHears(m,'Stranger','Nice weather.',{},seeded(1)).text,/\w/,'generic fallback');
 for(let i=0;i<300;i++){const who=['Jules','Noor','Rafi','Kit','Nobody'][i%5];const r=sofiaHears(m,who,['I won a round','that melody','dessert?','hello','Sofia is trouble'][i%5],{},seeded(i+9));assert.ok(r&&r.text.length<120);assert.doesNotMatch(r.text,/\b(deposit|top[ -]?up|fund(ing|s)?|buy|purchase|pay(ment)?)\b/i);}
});
