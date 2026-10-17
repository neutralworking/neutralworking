// DOM interaction tests in LinkeDOM. No browser engine, CSS layout, touch hardware
// or real browser focus/pointer capture is simulated by this test suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {project} from '../dist/art.js';
import {SAVE_KEY} from '../dist/engine.js';
import {FixtureData,assembleFixtures} from '../dist/data/promo.js';

test('complete playable prototype DOM flow',async t=>{
 const {document,window}=parseHTML(await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8'));
 globalThis.document=document;globalThis.window=window;
 let focusEl=null;const viewportHandlers={};window.visualViewport={height:675,offsetTop:0,addEventListener:(type,fn)=>viewportHandlers[type]=fn};Object.defineProperty(document,'activeElement',{get:()=>focusEl});
 let width=375,height=675,time=0,raf,tid=0;const tasks=new Map(),storage=new Map();
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 globalThis.requestAnimationFrame=cb=>{raf=cb;};
 globalThis.setTimeout=(cb,delay=0)=>{const id=++tid;tasks.set(id,{cb,when:time+delay,delay:0});return id;};
 globalThis.setInterval=(cb,delay)=>{const id=++tid;tasks.set(id,{cb,when:time+delay,delay});return id;};
 globalThis.clearTimeout=globalThis.clearInterval=id=>tasks.delete(id);
 const world=document.querySelector('#world'),game=document.querySelector('.game'),panel=document.querySelector('#panel');
 window.Element.prototype.setPointerCapture=function(){};
 window.Element.prototype.getBoundingClientRect=function(){if(this.id==='joystick'){const size=95,left=parseFloat(this.style.left)||23,top=parseFloat(this.style.top)||(height-29-size);return{left,top,width:size,height:size,right:left+size,bottom:top+size};}return {left:0,top:0,width,height,right:width,bottom:height};};
 Object.defineProperty(panel,'open',{get(){return this.hasAttribute('open');}});
 panel.showModal=function(){this.setAttribute('open','');};panel.close=function(){this.removeAttribute('open');};
 world.createSVGPoint=()=>({x:0,y:0,matrixTransform(){const [vx,vy,vw,vh]=world.getAttribute('viewBox').split(/\s/).map(Number);return{x:vx+this.x/width*vw,y:vy+this.y/height*vh};}});
 world.getScreenCTM=()=>({inverse:()=>({})});
 const $=s=>document.querySelector(s),getState=()=>JSON.parse(storage.get(SAVE_KEY));
 function frames(n=1){for(let i=0;i<n;i++){time+=16;for(const[id,task]of [...tasks])if(task.when<=time){if(task.delay)task.when+=task.delay;else tasks.delete(id);task.cb();}const f=raf;raf=null;f?.(time);}}
 function event(el,type,props={}){assert.ok(el,`Missing element for ${type}`);const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);el.dispatchEvent(e);}
 function click(selector){event($(selector),'click');}
 function screenPoint(x,y){const [vx,vy,vw,vh]=world.getAttribute('viewBox').split(/\s/).map(Number);const p=project(x,y);return{clientX:(p[0]-vx)/vw*width,clientY:(p[1]-vy)/vh*height,pointerType:'mouse',pointerId:1};}
 function tapTile(x,y){const p=screenPoint(x+.5,y+.5);event(world,'pointerdown',p);event(world,'pointerup',p);}
 function tapObject(id){const el=$(`[data-object="${id}"]`);event(el,'pointerdown',{clientX:100,clientY:100,pointerType:'mouse'});event(el,'pointerup',{clientX:100,clientY:100,pointerType:'mouse'});}
 const position=()=>$('#player').getAttribute('transform').match(/-?\d+(?:\.\d+)?/g).map(Number);
 await import('../dist/app.js');frames(180);
 await t.test('opens directly in suite with saved identity and interactive objects',()=>{assert.equal($('#room-name').textContent,'Your private suite');assert.equal($$('.never').length,0);assert.equal(document.querySelectorAll('[data-tile]').length,64);assert.ok($('#player'));assert.equal(getState().credits,2500);});
 await t.test('first visit shows the concierge beat once, pointing at Sofia',()=>{const card=$('#concierge-card');assert.ok(card,'concierge card on first load');assert.match(card.textContent,/Welcome to The Grand, Alex/);assert.match(card.textContent,/Sofia/);assert.ok($('[data-action="intro-hello"]'));assert.ok($('.chat-fab').classList.contains('nudge'));click('[data-action="intro-dismiss"]');assert.equal($('#concierge-card'),null);assert.equal(getState().intro,1);assert.equal(panel.open,false);});
 function $$(s){return[...document.querySelectorAll(s)];}
 await t.test('floor taps move the rendered avatar and machine approach opens a game',()=>{const before=position();tapTile(3,4);frames(100);assert.notDeepEqual(position(),before);tapObject('machine');frames(240);assert.equal(panel.open,true);assert.match($('#panel-content').textContent,/Grand Sevens/);});
 await t.test('a real spin settles reels, credits, counters and unlocks',()=>{const random=Math.random;Math.random=()=>.1;for(let i=0;i<5;i++){click('[data-action="spin"]');frames(80);}Math.random=random;assert.equal(getState().spins,5);assert.equal(getState().wins,5);assert.equal(getState().credits,2625);assert.ok(getState().unlocked.includes('rounds'));assert.ok(getState().unlocked.includes('wins'));assert.equal($('.reels').classList.contains('spinning'),false);click('[data-action="close"]');});
 await t.test('wardrobe locked choices are blocked and unlocked clothing updates world',()=>{click('.bottom-nav [data-action="avatar"]');const before=getState().shirt;click('[data-action="equip"][data-category="shirt"][data-id="gold"]');assert.equal(getState().shirt,before);click('[data-action="equip"][data-category="shirt"][data-id="midnight"]');assert.equal(getState().shirt,'midnight');assert.match($('#player').innerHTML,/#526e9a/);click('[data-action="close"]');});
 await t.test('all four public destinations are playable and explore cosmetic unlocks',()=>{for(const id of ['lobby','gold','neon','roof']){click('.bottom-nav [data-action="hotel"]');click(`[data-action="go-room"][data-room="${id}"]`);frames(80);assert.equal(panel.open,false);assert.ok($('[data-npc]'));assert.equal($$('[data-tile]').length,64);}assert.ok(getState().unlocked.includes('explore'));});
 await t.test('physical exits connect to the gallery and its walkable lift doors',()=>{const ex=$('[data-exit]');event(ex,'pointerdown',{clientX:100,clientY:100,pointerType:'mouse'});event(ex,'pointerup',{clientX:100,clientY:100,pointerType:'mouse'});frames(200);assert.equal(panel.open,false);assert.equal($('#room-name').textContent,'The Gallery & Lifts');assert.equal($$('[data-portal]').length,5);const door=$('[data-portal="roof"]');event(door,'keydown',{key:'Enter'});frames(400);assert.equal($('#room-name').textContent,'The Rooftop Club');});
 await t.test('scripted social interaction updates chat and earns glasses',()=>{click('.chat-fab');click('[data-action="chat-quick"]');assert.ok(getState().social>0);assert.ok(getState().unlocked.includes('social'));assert.match($('#chat-log').textContent,/Welcome to The Grand/);click('[data-action="close"]');});
 const roomLog=()=>{click('.chat-fab');const t=$('#chat-log').textContent;click('[data-action="close"]');return t;};
 const npcNode=id=>$(`[data-npc="${id}"]`);
 const bubbleText=()=>$('#speech-layer').textContent;
 const send=text=>{$('#talk-input').value=text;event($('#talk-bar'),'submit');};
 // Walking to a resident can take a while when they're across the room: wait for the talk bar, up to ~10s.
 const untilTalk=()=>{for(let i=0;i<40&&!$('#talk-bar');i++)frames(15);frames(20);};
 const tapNpc=id=>{const n=npcNode(id);assert.ok(n,`resident ${id} is in the room`);event(n,'pointerdown',{clientX:100,clientY:100,pointerType:'mouse'});event(n,'pointerup',{clientX:100,clientY:100,pointerType:'mouse'});};
 await t.test('residents talk inline: tapping one opens a talk bar in the scene and replies appear above their head',()=>{
  tapNpc(15);untilTalk();assert.ok($('#talk-bar'),'talk bar opens in the scene, not a panel');assert.equal(panel.open,false);assert.match($('#talk-bar').textContent,/Noor/);focusEl=$('#talk-input');window.visualViewport.height=375;viewportHandlers.resize();assert.equal(game.style.getPropertyValue('--keyboard-inset'),'300px');focusEl=null;window.visualViewport.height=675;viewportHandlers.resize();assert.equal(game.style.getPropertyValue('--keyboard-inset'),'0px');
  frames(120);assert.match(bubbleText(),/NOOR/);
  click('[data-action="talk-chip"][data-topic="0"]');frames(3);assert.ok($('#speech-layer .speech-dots'),'they are "typing"');frames(150);assert.match($('#talk-live').textContent,/melody/i);
  send('Lovely evening');frames(3);assert.match(bubbleText(),/Lovely/,'your line appears above your avatar');frames(150);
  assert.ok(getState().metResidents.includes(15));assert.match(roomLog(),/Lovely evening/);
  click('[data-action="talk-close"]');assert.equal($('#talk-bar'),null);
 });
 await t.test('NW-173: a registered functional persona speaks, and its cards render from data under the talk bar',()=>{
  const terms={section:'bonus',clauseId:'b-1',url:'https://example.test/terms#b-1'};
  const snap={bonuses:[{id:'reload',title:'Weekend reload',kind:'reload',summary:'50% extra on a weekend top-up.',value:{percent:50,cap:{amount:200,currency:'credits'}},wagering:{multiplier:30,appliesTo:'bonus'},expiresAt:'2026-10-18T22:00:00Z',termsRef:terms,claimable:true}],terms:{bonus:[{section:'bonus',clauseId:'b-1',heading:'Bonus wagering',text:'Bonus funds must be wagered 30 times before withdrawal.',url:terms.url,version:'1.2',updatedAt:'2026-10-01T00:00:00Z'}]}};
  let sawData=null;
  const persona={opener:()=>({text:'Evening. Ask me what is on offer.'}),suggestions:()=>['Any bonuses?'],reply:(text,ctx)=>{sawData=ctx.data;return {text:'Here is what is open to you tonight.',mood:'warm',action:{type:'show-offers',kind:'bonus'}};}};
  const id=Number($$('[data-npc]').map(n=>n.dataset.npc).find(x=>x!=='0'&&Number(x)<100));
  window.__grand.registerPersona(id,persona);window.__grand.setPromoData(snap);
  tapNpc(id);untilTalk();assert.ok($('#talk-bar'));assert.equal($('#talk-cards').hidden,true,'no cards before an action');
  click('[data-action="talk-chip"][data-message="Any bonuses?"]');frames(160);
  assert.equal(sawData,snap,'personas receive the session data as ctx.data');
  assert.equal($('#talk-cards').hidden,false);assert.match($('#talk-cards').innerHTML,/Weekend reload/);assert.match($('#talk-cards').innerHTML,/SIMULATED/);
  assert.match($('#talk-live').textContent,/BONUS: Weekend reload\./,'cards are mirrored in the aria-live region');
  click('#talk-cards .card-terms');assert.equal($$('#talk-cards .npc-card').length,2,'Terms link adds the clause card');assert.match($('#talk-cards').innerHTML,/must be wagered 30 times/);
  click('[data-action="talk-close"]');window.__grand.unregisterPersona(id);window.__grand.setPromoData(null);
 });
 await t.test('NW-177: Celeste at the concierge desk lists open bonuses, claims one (simulated credits), and backs off after "no thanks"',async()=>{
  const read=async f=>JSON.parse(await fs.readFile(new URL(`../dist/data/fixtures/${f}`,import.meta.url),'utf8'));
  window.__grand.usePromoFixtures(assembleFixtures({terms:await read('terms.json'),bonuses:await read('bonuses.json'),freeSpins:await read('free-spins.json'),competitions:await read('competitions.json'),records:await read('records.json'),banking:await read('banking.json')}));
  click('.bottom-nav [data-action="hotel"]');click('[data-action="go-room"][data-room="lobby"]');frames(40);
  tapNpc(101);untilTalk();frames(150);
  assert.equal($('#talk-bar').getAttribute('aria-label'),'Conversation with Celeste');
  assert.match(bubbleText(),/offers? open to you tonight/,'one unprompted mention');
  const open=window.__grand.promoData.bonuses.filter(b=>b.claimable);
  click('[data-action="talk-chip"][data-message="Any bonuses?"]');frames(200);
  assert.equal($$('#talk-cards .npc-card').length,open.length);
  for(const card of $$('#talk-cards .npc-card')){assert.match(card.innerHTML,/Wagering/);assert.match(card.innerHTML,/Expires/);assert.match(card.innerHTML,/Max win/);assert.ok(card.querySelector('.card-terms'));assert.doesNotMatch(card.innerHTML,/Min deposit/);}
  const credits=getState().credits;
  click('#talk-cards [data-action="claim-open"][data-id="weekend-reload"]');
  assert.match($('#talk-cards').textContent,/200 fictional bonus credits/);
  click('[data-action="claim-confirm"][data-id="weekend-reload"]');frames(5);
  assert.equal(getState().credits,credits+200,'fictional bonus credits granted');
  assert.equal(getState().bonusLedger['weekend-reload'].target,6000);
  assert.match($('#talk-cards').textContent,/Claimed/);assert.match($('#talk-cards').textContent,/0 of 6,000 credits/);
  send('no thanks');frames(200);
  click('[data-action="talk-close"]');frames(40);tapNpc(101);untilTalk();frames(150);
  assert.doesNotMatch(bubbleText(),/offer/,'no mention after "no thanks"');
  assert.ok(!$$('[data-action="talk-chip"]').some(b=>/bonus|claim/i.test(b.dataset.message)),'no offer chips either');
  click('[data-action="talk-close"]');
 });
 await t.test('NW-178: Pip in the Arcade shows free spins, opens an eligible cabinet with spins applied, and refuses the wrong game',()=>{
  click('.bottom-nav [data-action="hotel"]');click('[data-action="go-room"][data-room="neon"]');frames(40);
  tapNpc(102);untilTalk();frames(150);
  assert.equal($('#talk-bar').getAttribute('aria-label'),'Conversation with Pip');
  click('[data-action="talk-chip"][data-message="What spins have I got?"]');frames(200);
  const cards=$$('#talk-cards .npc-card');assert.equal(cards.length,2);
  for(const c of cards)for(const row of ['Spins','Spin value','Games','Expires','Wagering','Max win'])assert.match(c.innerHTML,new RegExp(`<dt>${row}</dt>`),row);
  click('#talk-cards [data-action="spins-use"][data-id="nova-20"]');
  assert.equal(panel.open,true);assert.match($('#panel-content').textContent,/Nova Nights/);
  assert.match($('.free-spin-banner').textContent,/20 spins on Nova Nights/);assert.match($('[data-action="spin"]').textContent,/FREE SPIN · 20 LEFT/);
  const credits=getState().credits,random=Math.random;Math.random=()=>.99;click('[data-action="spin"]');frames(100);Math.random=random;
  assert.equal(getState().credits,credits,'a losing free spin costs nothing');assert.equal(getState().freeSpinsUsed['nova-20'],1);
  assert.match($('.slot-message').textContent,/19 free spins left/);assert.match($('[data-action="spin"]').textContent,/FREE SPIN · 19 LEFT/);
  click('[data-action="spins-stop"]');assert.match($('[data-action="spin"]').textContent,/SPIN · 25 CREDITS/);assert.equal($('.free-spin-banner'),null);
  click('[data-action="close"]');
  send('use my nova spins on grand sevens');frames(200);
  assert.equal(panel.open,false,'no cabinet opens for the wrong game');
  assert.match($('#talk-live').textContent,/can only be used on Nova Nights/);assert.match($('#talk-cards').innerHTML,/TERMS · FREE SPINS · fs-1/);
  click('[data-action="talk-chip"][data-message="Use them"]');frames(200);
  assert.equal(panel.open,true,'"use them" opens the eligible cabinet');assert.match($('[data-action="spin"]').textContent,/FREE SPIN · 19 LEFT/);
  click('[data-action="close"]');click('[data-action="talk-close"]');
 });
 await t.test('NW-179: Rex lists live then upcoming, opts you in on a card, reports standing as data, and the Hall of Records opens the same records',()=>{
  click('.bottom-nav [data-action="hotel"]');click('[data-action="go-room"][data-room="gold"]');frames(40);
  tapNpc(103);untilTalk();frames(150);
  assert.equal($('#talk-bar').getAttribute('aria-label'),'Conversation with Rex');
  assert.match(bubbleText(),/one\s*competition live and two\s*coming up/);
  click('[data-action="talk-chip"][data-message="What’s on?"]');frames(200);
  const kinds=$$('#talk-cards .npc-card .card-kicker').map(k=>k.textContent);assert.deepEqual(kinds,['LIVE COMPETITION','UPCOMING','UPCOMING'],'live first');
  assert.match($('#talk-cards').textContent,/5,000 credits/);assert.match($('#talk-cards').textContent,/Time left/);
  send('opt me in to the race');frames(200);
  click('#talk-cards [data-action="opt-in-confirm"][data-competition="friday-sevens"]');frames(5);
  assert.equal(getState().competitions['friday-sevens'].optedIn,true,'opt-in saved');assert.match($('#talk-cards').textContent,/You’re opted in/);
  send('how am I doing?');frames(200);
  assert.match($('#talk-live').textContent,/Friday Sevens Race: you’re #6 with 0 points\./);
  assert.match($('#talk-cards').innerHTML,/<li class="you">/,'the player row is highlighted on the leaderboard');
  click('[data-action="talk-close"]');
  click('.bottom-nav [data-action="hotel"]');click('[data-action="walk-gallery"]');frames(400);
  assert.equal($('#room-name').textContent,'The Gallery & Lifts');
  tapObject('hall-of-records');frames(400);
  assert.equal(panel.open,true);assert.match($('#panel-content').textContent,/Hall of Records/);
  assert.match($('#panel-content').textContent,/Gold Lounge Classic/);assert.match($('#panel-content').textContent,/Rooftop\*\*\*/);
  click('[data-action="close"]');click('.bottom-nav [data-action="hotel"]');click('[data-action="go-room"][data-room="gold"]');frames(40);
 });
 await t.test('NW-175: a distress line gets a caring reply and safer-play tools, and offers stay off afterwards',()=>{
  const snap={bonuses:[{id:'reload',title:'Weekend reload',kind:'reload',summary:'50% extra.',value:{percent:50,cap:{amount:200,currency:'credits'}},expiresAt:'2026-10-18T22:00:00Z',termsRef:null,claimable:true}],terms:{}};
  let calls=0;const persona={opener:()=>({text:'Evening. Ask me what is on offer.'}),suggestions:()=>['Any bonuses?'],reply:()=>{calls++;return {text:'Here is what is open to you tonight.',mood:'warm',action:{type:'show-offers',kind:'bonus'}};}};
  const id=Number($$('[data-npc]').map(n=>n.dataset.npc).find(x=>x!=='0'&&Number(x)<100));
  window.__grand.registerPersona(id,persona);window.__grand.setPromoData(snap);
  tapNpc(id);untilTalk();assert.ok($('#talk-bar'));
  send('I need to win my money back');frames(160);
  assert.equal(calls,0,'the gate answers before the persona');
  assert.match($('#talk-live').textContent,/Offers are off/);assert.match($('#talk-cards').innerHTML,/SAFER PLAY/);assert.ok($('#talk-cards [data-tool="exclude"]'));
  assert.doesNotMatch($('#talk-cards').innerHTML,/Weekend reload/);
  send('Any bonuses?');frames(160);
  assert.equal(calls,1);assert.match($('#talk-live').textContent,/can't show offers/);assert.doesNotMatch($('#talk-cards').innerHTML,/Weekend reload/,'offer cards are stripped for the rest of the session');
  click('[data-action="talk-close"]');window.__grand.unregisterPersona(id);window.__grand.setPromoData(null);
 });
 await t.test('NW-176: a Terms link routes to Mr Penrose at his gallery desk, who quotes clauses verbatim',async()=>{
  const read=async f=>JSON.parse(await fs.readFile(new URL(`../dist/data/fixtures/${f}`,import.meta.url),'utf8'));
  const fx=assembleFixtures({terms:await read('terms.json'),bonuses:await read('bonuses.json'),freeSpins:await read('free-spins.json'),competitions:await read('competitions.json'),records:await read('records.json'),banking:await read('banking.json')});
  const snap=new FixtureData(fx).snapshot({id:'p',ageVerified:true}),comp=[...snap.competitions.live,...snap.competitions.upcoming][0];
  const clauseOf=ref=>snap.terms[ref.section].find(c=>c.clauseId===ref.clauseId);
  const persona={opener:()=>({text:'Evening. Competitions are my thing.'}),suggestions:()=>['What is on?'],reply:()=>({text:'Here is what is on.',mood:'warm',action:{type:'show-leaderboard',competitionId:comp.id}})};// information, not an offer: it still shows after the NW-175 test switched offers off
  const id=Number($$('[data-npc]').map(n=>n.dataset.npc).find(x=>x!=='0'&&Number(x)<100));// a resident: staff (ids ≥ 100) have their own personas
  window.__grand.registerPersona(id,persona);window.__grand.setPromoData(snap);
  tapNpc(id);untilTalk();click('[data-action="talk-chip"][data-message="What is on?"]');frames(160);
  click('#talk-cards .card-terms');
  assert.ok($('#talk-cards [data-action="ask-penrose"]'),'a clause card shown elsewhere offers Mr Penrose');
  click('#talk-cards [data-action="ask-penrose"]');untilTalk();
  assert.equal($('#room-name').textContent,'The Gallery & Lifts');
  assert.equal($('#talk-bar').getAttribute('aria-label'),'Conversation with Mr Penrose');
  assert.match($('#talk-bar .talk-note').textContent,/Hotel staff/);
  assert.match(bubbleText(),new RegExp(comp.termsRef.clauseId),'he opens on the clause he was sent');
  assert.ok($('#talk-cards').innerHTML.includes(clauseOf(comp.termsRef).text.replace(/'/g,'&#39;')),'the clause, verbatim');
  assert.equal($('#talk-cards [data-action="ask-penrose"]'),null,'his own cards do not link back to him');
  send("what's the wagering on free spins?");frames(200);
  const cards=$('#talk-cards').innerHTML;
  assert.ok(cards.includes(clauseOf({section:'free_spins',clauseId:'fs-2'}).text.replace(/'/g,'&#39;')));
  assert.match(cards,/href="terms\.html#fs-2"/);assert.match(cards,/updated 1 Oct 2026/);
  send('bonus terms');frames(200);
  assert.ok($('[data-action="talk-chip"][data-message="Bonus wagering"]'),'section headings offered as chips');
  click('[data-action="talk-chip"][data-message="Bonus expiry"]');frames(200);
  assert.match($('#talk-cards').innerHTML,/Unclaimed bonuses expire/);
  assert.doesNotMatch($('#guest-list').textContent,/Mr Penrose/,'staff are not listed as residents');
  click('[data-action="talk-close"]');window.__grand.unregisterPersona(id);window.__grand.setPromoData(null);
 });
 await t.test('Sofia, the resident con artist, has her own brain and will not visit without The Grand Reserve',()=>{
  click('#quest-pill');assert.match($('#panel-content').textContent,/YOUR FIRST EVENING/);click('[data-action="go-sofia"]');assert.equal($('#room-name').textContent,'The Grand Lobby');untilTalk();
  assert.ok($('#talk-bar'));assert.match($('#talk-bar').textContent,/dangerous flirt/i);frames(160);assert.match(bubbleText(),/SOFIA/);
  send('My name is Luke');frames(160);assert.match($('#talk-live').textContent,/Luke/);assert.match($('#talk-live').textContent,/Alex/,'she notices the key card name');
  click('[data-action="talk-chip"][data-message="Come up to my suite?"]');frames(160);assert.match($('#talk-live').textContent,/Grand Reserve/);assert.ok($('#quest-pill').classList.contains('flash'),'onboarding is nudged');
  assert.ok(getState().metResidents.includes(0));click('[data-action="talk-close"]');assert.equal($('#talk-bar'),null);
 });
 await t.test('decorating previews and commits a valid piece and rejects occupied tiles',()=>{click('.bottom-nav [data-action="suite"]');click('[data-action="edit"]');click('[data-action="edit-add"][data-type="plant"]');tapTile(4,4);assert.equal($('[data-action="edit-place"]').disabled,true);tapTile(3,3);assert.equal($('[data-action="edit-place"]').disabled,false);assert.ok($('#ghost-layer').innerHTML.length>0);click('[data-action="edit-place"]');assert.equal(getState().furniture.length,10);assert.ok(getState().unlocked.includes('decorate'));assert.ok(getState().furniture.some(o=>o.x===3&&o.y===3));click('[data-action="edit-done"]');});
 await t.test('existing furniture rotates, relocates and returns to inventory',()=>{click('[data-action="edit"]');tapObject('sofa');click('[data-action="edit-rotate"]');tapTile(1,4);assert.equal($('[data-action="edit-place"]').disabled,false);click('[data-action="edit-place"]');const sofa=getState().furniture.find(o=>o.id==='sofa');assert.deepEqual([sofa.x,sofa.y,sofa.rot],[1,4,1]);const added=getState().furniture.find(o=>o.x===3&&o.y===3);tapObject(added.id);click('[data-action="edit-remove"]');assert.equal(getState().furniture.length,9);click('[data-action="edit-done"]');});
 await t.test('styles and favourite machine save and render in suite',()=>{click('[data-action="edit"]');click('[data-action="style"]');click('[data-action="theme"][data-theme="rose"]');click('[data-action="floor"][data-floor="stone"]');click('[data-action="favourite"][data-game="neon"]');assert.equal(getState().theme,'rose');assert.equal(getState().floor,'stone');assert.equal(getState().favourite,'neon');assert.match($('[data-object="machine"]').innerHTML,/NOVA/);click('[data-action="close"]');click('[data-action="edit-done"]');});
 await t.test('the second physical cabinet opens and plays the distinct Nova game',()=>{tapObject('machine');frames(240);assert.match($('#panel-content').textContent,/Nova Nights/);assert.match($('.paytable').textContent,/Three bolts/);const spins=getState().spins;click('[data-action="spin"]');frames(80);assert.equal(getState().spins,spins+1);assert.ok($('.slot-panel.neon'));click('[data-action="close"]');});
 await t.test('funding flow is clearly simulated and grants its one-time reward',()=>{click('[data-action="wallet"]');assert.match($('#panel-content').textContent,/SIMULATED/);click('[data-action="fund"]');assert.equal(getState().funded,1);assert.ok(getState().unlocked.includes('fund'));assert.equal($('[data-action="fund"]').disabled,true);click('[data-action="close"]');});
 await t.test('onboarding: claim The Grand Reserve, invite Sofia, and she comes up to 408',()=>{
  frames(40);assert.equal($('#quest-pill').hidden,false);assert.match($('#quest-pill').textContent,/Claim The Grand Reserve/);
  click('#quest-pill');assert.match($('#panel-content').textContent,/SIMULATED/);click('[data-action="claim-reserve"]');assert.deepEqual(getState().items,['reserve']);assert.match($('.reserve-card').textContent,/In your suite/);
  click('[data-action="go-sofia"]');assert.equal($('#room-name').textContent,'The Grand Lobby');untilTalk();assert.ok($('#talk-bar'));
  click('[data-action="talk-chip"][data-message="Come up to my suite?"]');frames(160);assert.match(bubbleText(),/Lead the way|underestimated/);assert.equal($('#talk-bar'),null,'the conversation pauses while you head up');
  assert.ok(getState().hosted.includes('Sofia'));frames(100);assert.equal($('#room-name').textContent,'Your private suite');
  frames(700);assert.ok(npcNode(0),'Sofia walks in from the door');assert.ok($('#talk-bar'),'and picks the conversation back up');assert.match($('#talk-live').textContent,/408/);
  frames(40);assert.equal($('#quest-pill').hidden,true,'first evening complete');
  send('Welcome to 408');frames(160);assert.match($('#talk-live').textContent,/^Sofia: /);
  click('[data-action="talk-close"]');frames(700);assert.equal(npcNode(0),null,'she leaves through the door');
 });
 await t.test('the suite invite list explains who will come up, and why Sofia needs the Reserve',()=>{click('[data-action="invite"]');const text=$('#panel-content').textContent;assert.match(text,/Invite someone up/);assert.match(text,/Sofia/);assert.match(text,/Noor/);click('[data-action="close"]');});
 await t.test('fixed and floating touch joystick modes move and stop the avatar',()=>{tapTile(4,4);frames(180);click('[data-action="settings"]');click('[data-action="joystick"][data-mode="persistent"]');assert.equal(getState().joystick,'persistent');click('[data-action="close"]');const before=position();const r=$('#joystick').getBoundingClientRect();event($('#joystick'),'pointerdown',{pointerId:3,clientX:r.left+75,clientY:r.top+48});frames(15);assert.notDeepEqual(position(),before);event($('#joystick'),'pointerup',{pointerId:3});const stopped=position();frames(30);assert.deepEqual(position(),stopped);click('[data-action="settings"]');click('[data-action="joystick"][data-mode="floating"]');click('[data-action="close"]');event(world,'pointerdown',{pointerId:5,pointerType:'touch',clientX:75,clientY:height-100});assert.ok($('#joystick').classList.contains('active'));event($('#joystick'),'pointermove',{pointerId:5,clientX:100,clientY:height-100});const start=position();frames(12);assert.notDeepEqual(position(),start);event($('#joystick'),'pointerup',{pointerId:5});assert.equal($('#joystick').classList.contains('active'),false);});
 await t.test('a short tap in the floating joystick zone remains tap-to-move',()=>{tapTile(4,4);frames(180);const before=position(),p=screenPoint(3.5,6.5);assert.ok(p.clientX<width*.45&&p.clientY>height*.63);event(world,'pointerdown',{...p,pointerType:'touch',pointerId:9});event($('#joystick'),'pointerup',{...p,pointerType:'touch',pointerId:9});frames(180);assert.notDeepEqual(position(),before);});
 await t.test('player can be a woman, choose a skin tone and hairstyle for free',()=>{click('.bottom-nav [data-action="avatar"]');const credits=getState().credits;click('[data-action="appearance"][data-field="presentation"][data-value="woman"]');click('[data-action="appearance"][data-field="skin"][data-value="#4e3026"]');click('[data-action="appearance"][data-field="hairStyle"][data-value="afro"]');assert.equal(getState().presentation,'woman');assert.equal(getState().skin,'#4e3026');assert.equal(getState().hairStyle,'afro');assert.equal(getState().credits,credits);assert.ok($('#player [data-presentation="woman"]'));assert.ok($('#player [data-skin="#4e3026"]'));assert.ok($('.wardrobe-preview [data-hair-style="afro"]'));click('[data-action="close"]');});
 await t.test('store try-on, purchase and re-equipping save ownership without double charging',()=>{click('.store-fab');assert.equal($$('.store-item').length,13);click('[data-action="shop-item"][data-id="cobalt"]');assert.ok($('.store-tryon [data-presentation="woman"]'));const credits=getState().credits;click('[data-action="purchase"]');assert.equal(getState().credits,credits-220);assert.ok(getState().owned.includes('cobalt'));assert.equal(getState().shirt,'cobalt');assert.match($('#player').innerHTML,/#5e80b8/);click('[data-action="store-equip"]');assert.equal(getState().credits,credits-220);click('.store-back');click('[data-action="store-filter"][data-filter="owned"]');assert.equal($$('.store-item').length,1);click('[data-action="close"]');});
 await t.test('all 20 profiles have individual topics and remember meeting the player',()=>{click('.people-fab');assert.equal($$('.resident-card').length,20);click('[data-action="guest"][data-index="15"]');assert.match($('#panel-content').textContent,/saxophonist/i);click('[data-action="resident-topic"][data-topic="1"]');assert.match($('#chat-log').textContent,/Shirley Chisholm/);assert.ok(getState().metResidents.includes(15));const first=getState().friendship[15];click('[data-action="resident-topic"][data-topic="0"]');assert.match($('#chat-log').textContent,/melody/);assert.ok(getState().friendship[15]>first);click('[data-action="close"]');});
 await t.test('lobby boutique exists physically and public rooms show persistent resident states',()=>{click('.bottom-nav [data-action="hotel"]');click('[data-action="go-room"][data-room="lobby"]');assert.ok($('[data-object="boutique"]'));assert.equal($$('[data-npc]').filter(n=>Number(n.dataset.npc)<100).length,5,'five residents');assert.ok($('[data-npc="101"]'),'and Celeste at the concierge desk');assert.ok($('[data-npc] .resident-state'));tapObject('boutique');frames(200);assert.match($('#panel-content').textContent,/finishing touch/);click('[data-action="close"]');click('.bottom-nav [data-action="suite"]');});
 await t.test('Kit’s complete in-scene story guides you to Ada and the physical poster, remembers a choice and rewards once',()=>{
  click('.journal-button');assert.equal($$('.story-card').length,2);click('[data-action="story-find"][data-id="kit"]');frames(450);assert.match($('#talk-bar').textContent,/Kit/);click('[data-story-action="kit-start"]');frames(160);assert.equal(getState().socialProgress.stories.kit.stage,1);assert.match($('#talk-live').textContent,/Ada/);click('[data-action="talk-close"]');
  click('.journal-button');click('[data-action="story-find"][data-id="kit"]');frames(450);assert.match($('#talk-bar').textContent,/Ada/);click('[data-story-action="kit-advice"]');frames(160);assert.equal(getState().socialProgress.stories.kit.stage,2);click('[data-action="talk-close"]');
  click('.journal-button');click('[data-action="story-find"][data-id="kit"]');frames(450);assert.equal($('#room-name').textContent,'The Gallery & Lifts');assert.match($('#panel-content').textContent,/Which route leads/);click('[data-action="story-choice"][data-choice="scenic"]');assert.equal(getState().socialProgress.stories.kit.choice,'scenic');click('[data-action="story-find"][data-id="kit"]');frames(450);click('[data-story-action="kit-finish"]');frames(160);assert.equal(getState().socialProgress.stories.kit.stage,4);assert.ok(getState().owned.includes('skateboard'));assert.match($('#talk-live').textContent,/garden loop/);assert.ok($('[data-action="trust-talk"]'));click('[data-action="trust-talk"]');assert.match($('#talk-live').textContent,/Finishing something/);assert.equal(getState().socialProgress.relationships[10].trust,true);click('[data-action="talk-close"]');
  click('.journal-button');assert.match($('[data-story="kit"]').textContent,/They remember/);click('[data-action="find-resident"][data-index="10"]');frames(450);assert.match($('#talk-live').textContent,/garden loop/);click('[data-action="talk-close"]');
 });
 await t.test('Noor’s full tribute story reaches Farah, the archive and a visible saxophone performance',()=>{
  click('.journal-button');click('[data-action="story-find"][data-id="noor"]');frames(450);click('[data-story-action="noor-start"]');frames(160);assert.equal(getState().socialProgress.stories.noor.stage,1);click('[data-action="talk-close"]');
  click('.journal-button');click('[data-action="story-find"][data-id="noor"]');frames(450);assert.match($('#talk-bar').textContent,/Farah/);click('[data-story-action="noor-archive"]');frames(160);click('[data-action="talk-close"]');
  click('.journal-button');click('[data-action="story-find"][data-id="noor"]');frames(450);assert.match($('#panel-content').textContent,/Whose story goes/);click('[data-action="story-choice"][data-choice="hopper"]');click('[data-action="story-find"][data-id="noor"]');frames(450);click('[data-story-action="noor-finish"]');frames(160);assert.equal(getState().socialProgress.stories.noor.stage,4);assert.ok(getState().owned.includes('sax-pin'));assert.match($('#talk-live').textContent,/Grace Hopper/);assert.ok(npcNode(15).classList.contains('playing-music'));click('[data-action="talk-close"]');
 });
 await t.test('earned tokens purchase a boutique cosmetic while preserving the game-credit balance',()=>{click('.store-fab');assert.match($('.style-balance').textContent,/style tokens/);click('[data-action="store-filter"][data-filter="all"]');click('[data-action="shop-item"][data-id="beret"]');const before=getState();assert.equal($('[data-action="purchase-tokens"]').disabled,false);click('[data-action="purchase-tokens"]');const after=getState();assert.equal(after.credits,before.credits);assert.equal(after.socialProgress.tokens,before.socialProgress.tokens-4);assert.equal(after.hat,'beret');assert.ok(after.owned.includes('beret'));click('[data-action="close"]');click('.bottom-nav [data-action="suite"]');});
 await t.test('camera projection keeps the avatar in representative portrait and landscape viewports',()=>{for(const [w,h]of [[375,675],[430,795],[688,948],[909,724],[747,327]]){width=w;height=h;frames(160);const [x,y]=position(),[vx,vy,vw,vh]=world.getAttribute('viewBox').split(/\s/).map(Number);assert.ok(x>vx&&x<vx+vw,`${w} horizontal`);assert.ok(y>vy&&y<vy+vh,`${h} vertical`);assert.ok(y-105>vy,`${h} head`);}});
 await t.test('NW-175: Take a break and Self-exclusion persist and switch play off',()=>{
  click('.bottom-nav [data-action="hotel"]');click('[data-action="go-room"][data-room="lobby"]');frames(80);
  const persona={opener:()=>({text:'Here if you need me.'}),suggestions:()=>['Help'],reply:()=>({text:'Tools are below.',mood:'warm',action:{type:'open-safer-play'}})};
  const id=Number($$('[data-npc]').map(n=>n.dataset.npc).find(x=>x!=='0'&&Number(x)<100));window.__grand.registerPersona(id,persona);
  tapNpc(id);untilTalk();send('Help');frames(160);
  click('#talk-cards [data-tool="timeout"]');assert.ok(getState().coolingOffUntil>Date.now(),'a break is saved');
  click('#talk-cards [data-tool="exclude"]');assert.equal(getState().selfExcluded,true,'self-exclusion is saved');
  click('[data-action="talk-close"]');window.__grand.unregisterPersona(id);
  click('.bottom-nav [data-action="suite"]');frames(80);tapObject('machine');frames(240);
  const spins=getState().spins;click('[data-action="spin"]');frames(80);assert.equal(getState().spins,spins,'no play while self-excluded');
  click('[data-action="close"]');
 });
 await t.test('keyboard movement and refresh persistence retain complete achieved state',async()=>{tapTile(4,4);frames(180);const before=position();event(window,'keydown',{key:'ArrowRight'});frames(15);event(window,'keyup',{key:'ArrowRight'});assert.notDeepEqual(position(),before);const {loadState}=await import('../dist/engine.js');assert.deepEqual(loadState(storage.get(SAVE_KEY)),getState());});
});
