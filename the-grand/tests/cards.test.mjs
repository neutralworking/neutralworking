import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCards,CARD_TYPES,money,when} from '../dist/cards.js';
import {react} from '../dist/npc-brain.js';

const terms={section:'bonus',clauseId:'b-1',url:'https://example.test/terms#b-1'};
export const SNAPSHOT={
 bonuses:[{id:'reload',title:'Weekend reload',kind:'reload',summary:'50% extra on a weekend top-up.',value:{percent:50,cap:{amount:200,currency:'credits'}},wagering:{multiplier:30,appliesTo:'bonus'},minDeposit:{amount:20,currency:'credits'},maxWin:{amount:1000,currency:'credits'},eligibleGames:['Grand Sevens'],startsAt:'2026-10-16T00:00:00Z',expiresAt:'2026-10-18T22:00:00Z',termsRef:terms,claimable:true}],
 freeSpins:[{id:'nova20',title:'20 spins on Nova Nights',spins:20,spinValue:{amount:10,currency:'credits'},eligibleGames:['Nova Nights'],expiresAt:'2026-10-20T22:00:00Z',wagering:{multiplier:10},maxWin:{amount:500,currency:'credits'},termsRef:{section:'free_spins',clauseId:'fs-1',url:'https://example.test/terms#fs-1'},claimable:true}],
 competitions:{live:[{id:'c1',title:'Friday Sevens Race',kind:'race',status:'live',startsAt:'2026-10-16T18:00:00Z',endsAt:'2026-10-16T22:00:00Z',scoring:'Most points from wins on Grand Sevens',prizes:[{rank:'1st',prize:'5,000 credits'},{rank:'2nd',prize:'2,000 credits'}],termsRef:{section:'competition',clauseId:'c-1',url:'https://example.test/terms#c-1'},optInRequired:true,optedIn:true,playerStanding:{rank:4,score:310},standings:[{rank:1,displayName:'Velvet***',score:920},{rank:4,displayName:'You',score:310}]}],upcoming:[{id:'c2',title:'Neon Nights Cup',kind:'tournament',status:'upcoming',startsAt:'2026-10-23T18:00:00Z',endsAt:'2026-10-23T22:00:00Z',scoring:'Highest single win',prizes:[{rank:'1st',prize:'3,000 credits'}],termsRef:{section:'competition',clauseId:'c-2',url:'https://example.test/terms#c-2'},optInRequired:false}]},
 records:[{competitionId:'c0',title:'Last week: Gold Lounge Classic',endedAt:'2026-10-09T22:00:00Z',winners:[{rank:1,displayName:'Rooftop***',score:1200,prize:'5,000 credits'}],records:[{label:'Highest single score',value:'480',holder:'Neon***',setAt:'2026-09-02T21:00:00Z'}]}],
 terms:{bonus:[{section:'bonus',clauseId:'b-1',heading:'Bonus wagering',text:'Bonus funds must be wagered 30 times before withdrawal.',url:'https://example.test/terms#b-1',version:'1.2',updatedAt:'2026-10-01T00:00:00Z'}]},
 banking:{depositMethods:[{id:'card',label:'Card',min:{amount:10,currency:'credits'},max:{amount:5000,currency:'credits'},processing:'Instant'}],withdrawalMethods:[{id:'card',label:'Card',min:{amount:20,currency:'credits'},max:{amount:5000,currency:'credits'},processing:'1–3 days'}],verification:{required:true,when:'Before your first withdrawal',documents:['ID','Proof of address']},limits:{daily:{amount:1000,currency:'credits'},playerSetLimits:true},pendingPeriod:'24 hours',reversalAllowed:false,termsRef:{section:'banking',clauseId:'k-1',url:'https://example.test/terms#k-1'}},
};

test('every card type renders without data as a clear "not available" card',()=>{
 for(const type of CARD_TYPES){const cards=renderCards({type,kind:'bonus',section:'bonus',clauseId:'x',competitionId:'x',view:'withdraw'},null);assert.ok(cards.length>=1,type);assert.match(cards[0].html,/npc-card/);assert.ok(cards[0].text.length>0);}
 assert.deepEqual(renderCards({type:'nope'},SNAPSHOT),[]);assert.deepEqual(renderCards(null,SNAPSHOT),[]);
});

test('offer cards show the key terms from data and a Terms link',()=>{
 const [b]=renderCards({type:'show-offers',kind:'bonus'},SNAPSHOT,{timeZone:'Europe/Prague'});
 for(const s of ['Weekend reload','50% up to 200 credits','30× bonus','1,000 credits','Grand Sevens','Available','SIMULATED'])assert.ok(b.html.includes(s),s);
 assert.match(b.html,/data-action="show-terms" data-section="bonus" data-clause="b-1"/);
 assert.match(b.text,/Wagering: 30× bonus\./);assert.match(b.text,/Expires: .*2026/);
 const [s]=renderCards({type:'show-offers',kind:'free_spins'},SNAPSHOT);for(const v of ['20','10 credits','Nova Nights','10×','500 credits'])assert.ok(s.html.includes(v),v);
 assert.equal(renderCards({type:'show-offers',kind:'bonus',ids:['missing']},SNAPSHOT)[0].text,'BONUS: No bonuses right now.');
});

test('competitions, leaderboard, records, terms, banking and safer play render from data',()=>{
 const live=renderCards({type:'show-competitions',status:'live'},SNAPSHOT);assert.equal(live.length,1);assert.match(live[0].html,/LIVE COMPETITION/);assert.match(live[0].text,/#4 · 310 pts/);
 assert.match(renderCards({type:'show-competitions'},SNAPSHOT).map(c=>c.text).join(' '),/Friday Sevens Race.*Neon Nights Cup/,'live before upcoming');
 const lb=renderCards({type:'show-leaderboard',competitionId:'c1'},SNAPSHOT)[0];assert.match(lb.html,/class="you"/);assert.match(lb.html,/Velvet\*\*\*/);
 const rec=renderCards({type:'show-records'},SNAPSHOT)[0];assert.match(rec.html,/Rooftop\*\*\*/);assert.match(rec.text,/Highest single score: 480 \(Neon\*\*\*\)/);
 const clause=renderCards({type:'show-terms',section:'bonus',clauseId:'b-1'},SNAPSHOT)[0];assert.match(clause.html,/must be wagered 30 times/);assert.match(clause.html,/Read the full terms/);assert.match(clause.text,/Version: 1\.2/);
 const bank=renderCards({type:'open-cashier-info',view:'withdraw'},SNAPSHOT)[0];assert.match(bank.text,/1–3 days/);assert.match(bank.text,/Not allowed/);assert.doesNotMatch(bank.html,/<form|<input/,'read-only');
 const deposit=renderCards({type:'open-cashier-info',view:'deposit'},SNAPSHOT)[0];assert.doesNotMatch(deposit.text,/\b(now|hurry|today)\b/i,'facts only');
 assert.match(renderCards({type:'open-safer-play',reason:'distress'},null)[0].html,/data-tool="limits"/);
 assert.match(renderCards({type:'opt-in',competitionId:'c2'},SNAPSHOT)[0].html,/data-action="opt-in-confirm" data-competition="c2"/);
});

test('cards escape everything that comes from data',()=>{
 const evil={...SNAPSHOT,bonuses:[{...SNAPSHOT.bonuses[0],title:'<img src=x onerror=alert(1)>',summary:'"><script>x</script>'}]};
 const [c]=renderCards({type:'show-offers',kind:'bonus'},evil);assert.doesNotMatch(c.html,/<img|<script/);assert.match(c.html,/&lt;img/);
});

test('formatting helpers',()=>{assert.equal(money({amount:12500,currency:'credits'}),'12,500 credits');assert.equal(money(null),'');assert.equal(when('not a date'),'');assert.match(when('2026-10-16T18:00:00Z','Europe/Prague'),/16 Oct 2026, 20:00/);});

test('functional personas opt out of reactions',()=>{assert.equal(react({intents:[],reactions:[],moodFor:()=>'warm'},{used:{}},'Jules','hello'),null);});
