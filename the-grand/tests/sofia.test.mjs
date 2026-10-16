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
 const [rep]=chat(m,['the thing is marmalade']);assert.match(rep.text,/said that already/);
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
