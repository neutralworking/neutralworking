// Boots the app with an existing save (node --test runs each file in its own process),
// to cover the returning-player welcome card and the two-step "start over" reset.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {SAVE_KEY,freshState} from '../dist/engine.js';

test('returning players can continue, or check out and start over', async t => {
 const {document,window}=parseHTML(await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8'));
 globalThis.document=document;globalThis.window=window;
 let time=0,raf,tid=0;const tasks=new Map(),storage=new Map();
 const saved=freshState();saved.name='Luke';saved.credits=3100;saved.intro=1;saved.social=4;saved.metResidents=[0,15];
 storage.set(SAVE_KEY,JSON.stringify(saved));storage.set('the-grand-sofia-v1',JSON.stringify({version:1,name:'Luke'}));storage.set('unrelated-key','keep me');
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 Object.defineProperty(globalThis.localStorage,'keys',{value:()=>[...storage.keys()]});
 globalThis.requestAnimationFrame=cb=>{raf=cb;};
 globalThis.setTimeout=(cb,delay=0)=>{const id=++tid;tasks.set(id,{cb,when:time+delay,delay:0});return id;};
 globalThis.setInterval=(cb,delay)=>{const id=++tid;tasks.set(id,{cb,when:time+delay,delay});return id;};
 globalThis.clearTimeout=globalThis.clearInterval=id=>tasks.delete(id);
 const panel=document.querySelector('#panel'),world=document.querySelector('#world');
 window.Element.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:430,height:795,right:430,bottom:795};};
 Object.defineProperty(panel,'open',{get(){return this.hasAttribute('open');}});
 panel.showModal=function(){this.setAttribute('open','');};panel.close=function(){this.removeAttribute('open');};
 world.createSVGPoint=()=>({x:0,y:0,matrixTransform(){return{x:0,y:0};}});world.getScreenCTM=()=>({inverse:()=>({})});
 let reloaded=0;globalThis.location={reload:()=>{reloaded++;}};
 const $=s=>document.querySelector(s);
 const frames=n=>{for(let i=0;i<n;i++){time+=16;for(const[id,task]of [...tasks])if(task.when<=time){if(task.delay)task.when+=task.delay;else tasks.delete(id);task.cb();}const f=raf;raf=null;f?.(time);}};
 const click=sel=>{const el=$(sel);assert.ok(el,`missing ${sel}`);el.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));};
 // Object.keys(localStorage) is how browsers enumerate keys; mirror that for the stub.
 const realKeys=Object.keys;Object.keys=o=>o===globalThis.localStorage?[...storage.keys()]:realKeys(o);
 await import('../dist/app.js');frames(120);

 await t.test('a returning player is welcomed back with their progress, not the first-run concierge',()=>{
  const card=$('#concierge-card');assert.ok(card);assert.match(card.textContent,/WELCOME BACK/);assert.match(card.textContent,/Back again, Luke/);assert.match(card.textContent,/2 residents met/);
  assert.ok($('[data-action="welcome-continue"]'));assert.ok($('[data-action="reset-start"]'));
 });
 await t.test('continue keeps everything',()=>{click('[data-action="welcome-continue"]');assert.equal($('#concierge-card'),null);assert.match(storage.get(SAVE_KEY),/Luke/);});
 await t.test('starting over needs a second tap, then wipes only The Grand and reloads',()=>{
  click('[data-action="settings"]');assert.match($('#panel-content').textContent,/Start over/);click('[data-action="reset-ask"]');assert.match($('#panel-content').textContent,/There is no undo/);
  assert.ok(storage.has(SAVE_KEY),'asking does not wipe anything');
  click('[data-action="reset-confirm"]');assert.equal(storage.has(SAVE_KEY),false);assert.equal(storage.has('the-grand-sofia-v1'),false);assert.equal(storage.get('unrelated-key'),'keep me');assert.equal(reloaded,1);
  frames(60);assert.equal(storage.has(SAVE_KEY),false,'nothing re-saves while the page reloads');
 });
 Object.keys=realKeys;
});
