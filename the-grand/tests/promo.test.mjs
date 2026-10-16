import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FixtureData,assembleFixtures,loadFixtures,resolveTime,offersAllowed,playerFromState,SECTIONS,TERMS_PAGE} from '../dist/data/promo.js';
import {renderCards,CARD_TYPES} from '../dist/cards.js';

const DIR=new URL('../dist/data/fixtures/',import.meta.url);
const read=f=>JSON.parse(fs.readFileSync(new URL(f,DIR),'utf8'));
const FILES={terms:'terms.json',bonuses:'bonuses.json',freeSpins:'free-spins.json',competitions:'competitions.json',records:'records.json',banking:'banking.json'};
const raw=Object.fromEntries(Object.entries(FILES).map(([k,f])=>[k,read(f)]));
const fixtures=assembleFixtures(raw);
const NOW=Date.parse('2026-10-16T18:00:00Z');
const data=new FixtureData(fixtures,{now:()=>NOW});
const player={id:'t',ageVerified:true,selfExcluded:false,coolingOff:false,limitsReached:false,isNew:true,competitions:{'friday-sevens':{optedIn:true,standing:{rank:4,score:310}}}};

test('relative fixture dates resolve against the clock',()=>{
 assert.equal(resolveTime('now',NOW),'2026-10-16T18:00:00.000Z');
 assert.equal(resolveTime('now+2h',NOW),'2026-10-16T20:00:00.000Z');
 assert.equal(resolveTime('now-1d',NOW),'2026-10-15T18:00:00.000Z');
 assert.equal(resolveTime('now+5d+4h',NOW),'2026-10-21T22:00:00.000Z');
 assert.equal(resolveTime('2026-01-01T00:00:00Z',NOW),'2026-01-01T00:00:00.000Z');
 for(const bad of ['now+2x','tomorrow','',null])assert.equal(resolveTime(bad,NOW),null,String(bad));
});

test('every fixture file is labelled SIMULATED and uses fictional credits only',()=>{
 for(const [k,f] of Object.entries(FILES))assert.match(raw[k]._note,/SIMULATED/,f);
 const currencies=new Set();JSON.stringify(fixtures,(key,v)=>{if(key==='currency')currencies.add(v);return v;});
 assert.deepEqual([...currencies],['credits']);
});

test('fixtures have every required field, every date parses, every termsRef resolves',()=>{
 const clauses=new Set(fixtures.terms.map(c=>`${c.section}:${c.clauseId}`));
 const need=(o,fields,label)=>{for(const f of fields)assert.ok(o[f]!==undefined&&o[f]!=='',`${label} missing ${f}`);};
 const date=(v,label)=>assert.ok(resolveTime(v,NOW),`${label}: unparseable date ${v}`);
 for(const c of fixtures.terms){need(c,['section','clauseId','heading','text','version','updatedAt'],c.clauseId);assert.ok(SECTIONS.includes(c.section),c.section);date(c.updatedAt,c.clauseId);}
 for(const s of SECTIONS)assert.ok(fixtures.terms.some(c=>c.section===s),`terms cover ${s}`);
 const ref=(r,label)=>{assert.ok(r,`${label} has a termsRef`);assert.ok(clauses.has(`${r.section}:${r.clauseId}`),`${label} termsRef ${r.section}:${r.clauseId} resolves`);};
 for(const b of fixtures.bonuses){need(b,['id','title','kind','summary','value','startsAt','expiresAt','termsRef','claimable'],b.id);date(b.startsAt,b.id);date(b.expiresAt,b.id);ref(b.termsRef,b.id);}
 for(const f of fixtures.freeSpins){need(f,['id','title','spins','spinValue','eligibleGames','expiresAt','termsRef','claimable'],f.id);date(f.expiresAt,f.id);ref(f.termsRef,f.id);}
 for(const c of fixtures.competitions){need(c,['id','title','kind','startsAt','endsAt','scoring','prizes','termsRef','optInRequired'],c.id);date(c.startsAt,c.id);date(c.endsAt,c.id);ref(c.termsRef,c.id);assert.ok(Date.parse(resolveTime(c.startsAt,NOW))<Date.parse(resolveTime(c.endsAt,NOW)),`${c.id} starts before it ends`);}
 for(const r of fixtures.records){need(r,['competitionId','title','endedAt','winners'],r.competitionId);date(r.endedAt,r.competitionId);for(const w of r.winners)assert.match(w.displayName,/\*\*\*$/,'winner names are anonymised');}
 need(fixtures.banking,['depositMethods','withdrawalMethods','verification','limits','termsRef'],'banking');ref(fixtures.banking.termsRef,'banking');
});

test('offers are current and eligible only; blocked players get none',()=>{
 const ids=data.bonusesSync(player).map(b=>b.id);
 assert.ok(ids.includes('weekend-reload'));assert.ok(ids.includes('welcome-100'),'new players see the welcome offer');assert.ok(!ids.includes('expired-flash'),'expired offers are filtered');
 assert.ok(!data.bonusesSync({...player,isNew:false}).some(b=>b.id==='welcome-100'),'welcome offer is new-players-only');
 assert.ok(data.freeSpinsSync(player).length>=1);
 for(const flag of [{selfExcluded:true},{coolingOff:true},{limitsReached:true},{ageVerified:false}]){
  const p={...player,...flag};assert.equal(offersAllowed(p),false);assert.deepEqual(data.bonusesSync(p),[],JSON.stringify(flag));assert.deepEqual(data.freeSpinsSync(p),[],JSON.stringify(flag));
 }
 assert.equal(data.bonusesSync(player).find(b=>b.id==='weekend-reload').termsRef.url,`${TERMS_PAGE}#b-1`);
});

test('competition status comes from dates: live, upcoming, and finished excluded',()=>{
 const c=data.competitionsSync(player);
 assert.deepEqual(c.live.map(x=>x.id),['friday-sevens']);assert.deepEqual(c.upcoming.map(x=>x.id),['neon-cup','rooftop-draw'],'upcoming sorted by start');
 assert.ok(![...c.live,...c.upcoming].some(x=>x.id==='gold-classic'),'finished competitions live in records');
 assert.equal(c.live[0].optedIn,true);assert.deepEqual(c.live[0].playerStanding,{rank:4,score:310});
 let clock=NOW;const live=new FixtureData(fixtures,{now:()=>clock,anchor:NOW});clock=NOW+5*864e5+36e5;const later=live.competitionsSync(player);assert.deepEqual(later.live.map(x=>x.id),['neon-cup'],'dates anchor at load, the clock moves competitions along');assert.ok(!later.live.some(x=>x.id==='friday-sevens'),'the live race ends on time');
 assert.equal(data.recordsSync()[0].competitionId,'gold-classic','records newest first');assert.equal(data.recordsSync({competitionId:'spring-sprint'}).length,1);
});

test('the async PromoData interface matches the sync snapshot',async()=>{
 assert.deepEqual(await data.bonuses(player),data.bonusesSync(player));assert.deepEqual(await data.competitions(player),data.competitionsSync(player));
 assert.equal((await data.terms('banking')).length,3);assert.equal((await data.banking()).reversalAllowed,false);
});

test('a fixture snapshot renders real content on every card type',()=>{
 const snap=data.snapshot(player);
 const actions=[{type:'show-offers',kind:'bonus'},{type:'show-offers',kind:'free_spins'},{type:'show-competitions',status:'live'},{type:'show-competitions',status:'upcoming'},{type:'show-leaderboard',competitionId:'friday-sevens'},{type:'show-records'},{type:'show-terms',section:'free_spins',clauseId:'fs-1'},{type:'open-cashier-info',view:'withdraw'},{type:'open-safer-play'},{type:'opt-in',competitionId:'rooftop-draw'}];
 assert.deepEqual(new Set(actions.map(a=>a.type)),new Set(CARD_TYPES),'every card type is exercised');
 for(const a of actions){const cards=renderCards(a,snap,{timeZone:'Europe/Prague'});assert.ok(cards.length,a.type);for(const c of cards)assert.doesNotMatch(c.text,/not available yet/,`${a.type} has data`);}
 const loyalty=renderCards({type:'show-offers',kind:'bonus',ids:['loyalty-lounge']},snap)[0];assert.match(loyalty.text,/Why not: Unlocks after 25 rounds/);
 const blocked=data.snapshot({...player,selfExcluded:true});assert.equal(blocked.player.offersAllowed,false);assert.match(renderCards({type:'show-offers',kind:'bonus'},blocked)[0].text,/No bonuses right now/);
});

test('loader fetches all six files; player context comes from game state',async()=>{
 const seen=[];const fake=async url=>{const name=String(url).split('/').pop();seen.push(name);return {ok:true,json:async()=>read(name)};};
 const loaded=await loadFixtures('https://example.test/data/fixtures/',fake);assert.equal(seen.length,6);assert.deepEqual(loaded,fixtures);
 await assert.rejects(loadFixtures('https://example.test/',async()=>({ok:false,status:404})));
 const p=playerFromState({funded:1,selfExcluded:false,coolingOffUntil:NOW+1000,competitions:{x:{optedIn:true}}},NOW);
 assert.equal(p.isNew,false);assert.equal(p.coolingOff,true);assert.equal(p.ageVerified,true);assert.deepEqual(p.competitions,{x:{optedIn:true}});
});
