import test from 'node:test';
import assert from 'node:assert/strict';
import {createWellbeing,gate,offersBlocked,accountBlock,noteRound,OFFER_ACTIONS,blockedOfferLine,LOSS_STREAK,LOSS_COOLDOWN_MS} from '../dist/wellbeing.js';

const OK={id:'t',ageVerified:true,selfExcluded:false,coolingOff:false,limitsReached:false};
const NOW=Date.parse('2026-10-16T18:00:00Z');
const detect=text=>gate(text,createWellbeing(),OK).signal;

// Held out: none of these strings appear in the detector's patterns or examples.
const HELD_OUT={
 distress:['I need to win my money back tonight','been chasing my losses all week','I lost my rent money on the slots','honestly I cannot afford to lose any more','I borrowed money from my brother to play','I am in debt because of this','that was my food money','I am desperate, one more big win please','this is the last of my savings','gambling is ruining my life','took out a payday loan to keep going','I lost everything this month','I need this money for the bills','I spent money I really do not have'],
 exclude:['I want to stop gambling','how do I self exclude','please block me from playing','I think I am addicted','I can\'t stop playing this','I need to take a break from this','close my account please','I have a gambling problem','help me quit','can I set a time out','I would like to cool off for a while','I think I have a problem with gambling honestly'],
 underage:['I\'m 16','im 15 years old','I am only 17','I used my mum\'s card','not 18 yet lol','I\'m in year 10','I should be doing my homework','I\'m under 18 is that ok','I play after school every day','my dad\'s account is linked'],
};
const NEUTRAL=['hello','how are you tonight','what bonuses do you have','any free spins','tell me about the competitions','who won last week','what are the terms for the reload','how do withdrawals work','can I deposit by card','what is the minimum deposit','show me the leaderboard','I love this hotel','nice dress','where is the bar','what time is it','I won big on Grand Sevens','this game is fun','do you like jazz','what is wagering','how long do withdrawals take','is there a limit on deposits','what is the max win','I want to play more','let me spin again','great music tonight','who is the guy in the corner','I am 32','I am 18 years old','I am 25 and bored','I lost my keys','I lost the last round, oh well','I need a drink','can I invite you to my suite','what is your name','do you work here','the rooftop is beautiful','is the Neon Cup running','when does the Friday race end','how do I opt in','what happened to the Gold Classic','tell me a joke','do you speak French','I am back','school of thought says jazz is dead','my teacher taught me poker years ago at uni','money money money','take a seat','I will stop by later','stop flirting','break a leg'];

test('wellbeing: held-out messages are detected at ≥90% per signal',()=>{
 for(const [signal,lines] of Object.entries(HELD_OUT)){
  const hits=lines.filter(l=>detect(l)===signal);
  const misses=lines.filter(l=>detect(l)!==signal).map(l=>`${l} → ${detect(l)}`);
  assert.ok(hits.length/lines.length>=.9,`${signal}: ${hits.length}/${lines.length}. Missed: ${misses.join(' | ')}`);
 }
});

test('wellbeing: zero false signals on 50 neutral lines',()=>{
 assert.equal(NEUTRAL.length,50);
 const hits=NEUTRAL.filter(l=>detect(l)).map(l=>`${l} → ${detect(l)}`);
 assert.deepEqual(hits,[]);
});

test('wellbeing: a signal answers with care, offers a safer-play card and switches offers off for the session',()=>{
 const mem=createWellbeing();
 assert.equal(offersBlocked(mem,OK,NOW),null);
 const g=gate('I need to win my money back',mem,OK);
 assert.equal(g.signal,'distress');assert.deepEqual(g.action,{type:'open-safer-play',reason:'distress'});
 assert.doesNotMatch(g.reply,/bonus|deposit|spin|offer you/i,'no sales talk in the reply');
 assert.equal(offersBlocked(mem,OK,NOW),'distress');
 assert.equal(gate('any bonuses?',mem,OK).signal,null,'later neutral lines are not re-flagged');
 assert.equal(offersBlocked(mem,OK,NOW+864e5),'distress','still off later in the same session');
 assert.equal(offersBlocked(createWellbeing(),OK,NOW),null,'a fresh session starts clean');
 assert.ok(OFFER_ACTIONS.has('show-offers'));assert.ok(!OFFER_ACTIONS.has('show-terms'));
 assert.match(blockedOfferLine('distress'),/can't show offers/);
});

test('wellbeing: Sofia drops the act for one line; underage overrides her and blocks play',()=>{
 const s=gate('I want to stop gambling',createWellbeing(),OK,{character:'sofia'});
 assert.equal(s.signal,'exclude');assert.match(s.reply,/look after yourself/);
 const mem=createWellbeing(),u=gate('I\'m 15',mem,OK,{character:'sofia'});
 assert.equal(u.signal,'underage');assert.match(u.reply,/adults only/);assert.equal(mem.underage,true);
 assert.equal(offersBlocked(mem,OK,NOW),'underage');assert.match(blockedOfferLine('underage'),/adults only/);
});

test('wellbeing: account flags block offers in priority order',()=>{
 assert.equal(accountBlock(OK),null);assert.equal(accountBlock(null),null);
 assert.equal(accountBlock({...OK,ageVerified:false,selfExcluded:true}),'unverified');
 assert.equal(accountBlock({...OK,selfExcluded:true,coolingOff:true}),'self-excluded');
 assert.equal(accountBlock({...OK,coolingOff:true}),'cooling-off');
 assert.equal(accountBlock({...OK,limitsReached:true}),'limit-reached');
 for(const flag of [{selfExcluded:true},{coolingOff:true},{limitsReached:true},{ageVerified:false}])assert.ok(offersBlocked(createWellbeing(),{...OK,...flag},NOW),JSON.stringify(flag));
});

test(`wellbeing: ${LOSS_STREAK} losing rounds in a row pause offers for ten minutes; a win resets the streak`,()=>{
 const mem=createWellbeing();
 for(let i=0;i<LOSS_STREAK-1;i++)assert.equal(noteRound(mem,-25,NOW),false);
 assert.equal(noteRound(mem,100,NOW),false,'a win resets');assert.equal(mem.lossStreak,0);
 for(let i=0;i<LOSS_STREAK-1;i++)noteRound(mem,-25,NOW);
 assert.equal(noteRound(mem,0,NOW),true,'break-even counts as a loss; the eighth trips the pause');
 assert.equal(offersBlocked(mem,OK,NOW+1),'loss-streak');
 assert.equal(offersBlocked(mem,OK,NOW+LOSS_COOLDOWN_MS),null,'offers return after the cooldown');
 assert.equal(mem.offersOffForSession,false,'a loss streak is not a session-long signal');
});
