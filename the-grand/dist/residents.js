import {RESIDENTS,STAFF} from './characters.js';
import {ROOMS,GALLERY_DOORS,blocked,pathfind,approach,spin,SPIN_COST} from './engine.js';

const tile=a=>[Math.floor(a.x),Math.floor(a.y)];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const STATE_LABELS={idle:'Taking a moment',walking:'On a wander',betting:'Playing virtual credits',talking:'In conversation',skating:'Cruising on a skateboard',music:'Playing a little jazz',browsing:'Browsing the boutique',resting:'Taking a break',visiting:'Visiting a suite',leaving:'Heading out'};

export class HotelResidents{
 constructor(rng=Math.random){this.rng=rng;this.placeStaff();this.time=0;this.transitions=0;this.suiteObjects=[];this.events=[];this.pending=[];this.claims=new Map();this.visitedStates=new Set();this.agents=[];
  for(const p of RESIDENTS){const occupied=this.agents.filter(a=>a.room===p.room);const options=[[2,4],[5,2],[3,6],[6,6],[1,3],[4,3],[3,2],[2,6],[7,3]];const pos=options.find(([x,y])=>!blocked(x,y,ROOMS[p.room].objects)&&!occupied.some(a=>Math.floor(a.x)===x&&Math.floor(a.y)===y));this.agents.push({...p,baseRoom:p.room,nextTrip:180+p.id*11,x:pos[0]+.5,y:pos[1]+.5,path:[],mode:'idle',goal:null,partner:null,until:1+(p.id%5)*.8,decisions:0,credits:500,rounds:0,wins:0,sessionRounds:0,lastBet:-50,speech:'',speechUntil:0});}
 }
 // Staff stand at their post and are never ticked: no travel, betting or chatting with residents.
 placeStaff(){this.staff=STAFF.map(p=>({...p,baseRoom:p.room,x:p.desk[0]+.5,y:p.desk[1]+.5,path:[],mode:'idle',goal:null,partner:null,until:0,decisions:0,credits:0,rounds:0,wins:0,sessionRounds:0,lastBet:-50,speech:'',speechUntil:0}));}
 inRoom(room){return [...this.agents,...this.staff].filter(a=>a.room===room);}
 get(id){if(id===null||id===undefined||id==='player')return undefined;const n=Number(id);return this.agents.find(a=>a.id===n)||this.staff.find(a=>a.id===n);}
 objects(a){return a.room==='suite'?this.suiteObjects:ROOMS[a.room].objects;}// the suite's furniture lives in player state; the app keeps suiteObjects in sync
 say(a,text,target=null){a.speech=text;a.speechUntil=this.time+5.5;this.events.push({room:a.room,index:a.id,who:a.name,text,targetId:target?.id??null,time:this.time});if(this.events.length>100)this.events.shift();}
 drain(){return this.events.splice(0);}
 unclaim(a){for(const [key,id]of this.claims)if(id===a.id)this.claims.delete(key);}
 release(a){this.unclaim(a);a.path=[];a.goal=null;a.partner=null;a.mode='idle';a.until=this.time+2+this.rng()*3;}
 engage(id){const a=this.get(id);if(!a)return;const old=this.get(a.partner);if(old?.partner===a.id)this.release(old);this.release(a);a.mode='talking';a.partner='player';a.until=this.time+15;return a;}
 hold(id){const a=this.get(id);if(a?.partner==='player')a.until=this.time+2;}
 describe(a){if(a.staff&&a.mode!=='talking')return a.post;if(a.mode==='talking')return a.partner==='player'?'Talking with you':`Talking with ${this.get(a.partner)?.name||'a neighbour'}`;if(a.mode==='walking'&&a.goal?.action==='travel')return `Walking to ${ROOMS[a.goal.destination].short}`;if(a.mode==='walking'&&a.goal?.action==='betting')return 'Heading to a cabinet';return STATE_LABELS[a.mode]||STATE_LABELS.idle;}
 busyAt(a,x,y){return this.inRoom(a.room).some(b=>b.id!==a.id&&(Math.floor(b.x)===x&&Math.floor(b.y)===y||b.goal?.x===x&&b.goal?.y===y));}
 route(a,x,y,action='idle',extra={}){if(!extra.shared&&this.busyAt(a,x,y))return false;const path=pathfind(tile(a),[x,y],this.objects(a));if(path===null)return false;a.path=[{x:Math.floor(a.x)+.5,y:Math.floor(a.y)+.5},...path.map(([x,y])=>({x:x+.5,y:y+.5}))];a.goal={x,y,action,...extra};a.mode='walking';return true;}
 wander(a,action='idle'){for(let attempt=0;attempt<20;attempt++){const x=1+Math.floor(this.rng()*6),y=1+Math.floor(this.rng()*6);if(Math.hypot(x+.5-a.x,y+.5-a.y)>.6&&this.route(a,x,y,action))return true;}return false;}
 bet(a){if(a.credits<SPIN_COST||this.time-a.lastBet<22)return false;const machines=this.objects(a).filter(o=>o.type==='machine');for(const obj of machines){const key=`${a.room}:${obj.id}`;if(this.claims.has(key))continue;const near=approach(a,obj,this.objects(a));if(near&&this.route(a,...near.target,'betting',{machine:obj.id,game:obj.game||'gold'})){this.claims.set(key,a.id);return true;}}return false;}
 converse(a){const peers=this.inRoom(a.room).filter(b=>b.id!==a.id&&b.mode==='idle'&&distance(a,b)<4.5).sort((x,y)=>distance(a,x)-distance(a,y));for(const b of peers){if(distance(a,b)<1.65){this.startConversation(a,b);return true;}for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const [x,y]=tile(b);if(this.route(a,x+dx,y+dy,'talking',{partner:b.id})){b.until=this.time+12;return true;}}}return false;}
 startConversation(a,b){if(!b||b.room!==a.room||b.partner==='player'||b.mode!=='idle'&&b.partner!==a.id){this.release(a);return;}this.unclaim(a);this.unclaim(b);for(const [who,other]of [[a,b],[b,a]]){who.mode='talking';who.path=[];who.goal=null;who.partner=other.id;who.until=this.time+8;}const topic=b.topics[(b.decisions+a.decisions)%b.topics.length],subject=topic.label.replace(/^Your /,'your ').replace(/\?$/,'').toLowerCase();const lead=a.hobby==='skate'?'Quick question':a.hobby==='sax'?'Before the next tune':a.hobby==='debate'?'One question':'I was wondering';this.say(a,`${lead}, ${b.name}: tell me about ${subject}.`,b);this.pending.push({at:this.time+2.5,from:b.id,to:a.id,text:topic.reply});}
 activity(a){const goal=a.goal;a.goal=null;if(!goal){this.release(a);return;}a.mode=goal.action;a.until=this.time+4+this.rng()*3;
  if(goal.action==='travel'){this.transfer(a,goal.destination);return;}
  if(goal.action==='talking'){this.startConversation(a,this.get(goal.partner));return;}
  if(goal.action==='betting'){a.machine=goal.machine;a.game=goal.game;a.sessionRounds=0;a.until=this.time+2;return;}
  if(goal.action==='music')this.say(a,'A short melody, and a little room to breathe.');
  if(goal.action==='skating')this.say(a,'Just a gentle roll. The lamps are safe.');
  if(goal.action==='browsing')this.say(a,'Trying it on is half the fun.');
 }
 travel(a,destination){if(a.visitor||destination==='suite'||!GALLERY_DOORS[destination])return false;this.unclaim(a);const target=a.room==='hall'?GALLERY_DOORS[destination]:ROOMS[a.room].exit;return this.route(a,...target,'travel',{destination,shared:true});}
 transfer(a,destination){if(a.room!=='hall'){const entry=GALLERY_DOORS[a.room];a.room='hall';a.x=entry[0]+.5;a.y=entry[1]+.5;this.transitions++;if(this.travel(a,destination))return;}else{a.room=destination;const [x,y]=ROOMS[destination].exit;a.x=x+.5;a.y=y+.5;this.transitions++;}this.release(a);a.nextTrip=this.time+95+(a.id%4)*17;}
 decide(a){if(a.room==='hall'){this.travel(a,a.baseRoom);return;}if(!a.visitor&&a.id!==0&&this.time>=a.nextTrip){const destinations=['lobby','gold','neon','roof'],destination=a.room!==a.baseRoom?a.baseRoom:destinations[(destinations.indexOf(a.baseRoom)+1+a.id%3)%4];if(this.travel(a,destination))return;}a.decisions++;const choice=(a.decisions+a.id)%5;
  if(choice===0&&this.converse(a))return;
  if(choice===1&&this.bet(a))return;
  if(choice===2&&a.hobby==='skate'&&this.wander(a,'skating'))return;
  if(choice===2&&a.hobby==='sax'&&this.wander(a,'music'))return;
  if(choice===3&&a.room==='lobby'){const shop=this.objects(a).find(o=>o.type==='boutique'),near=shop&&approach(a,shop,this.objects(a));if(near&&this.route(a,...near.target,'browsing'))return;}
  if(choice===4&&this.converse(a))return;
  if(this.wander(a,a.hobby==='sax'&&choice===2?'music':'idle'))return;
  a.mode='resting';a.until=this.time+4;
 }
 tick(dt){dt=Math.min(.2,Math.max(0,dt));this.time+=dt;for(const p of [...this.pending])if(p.at<=this.time){const a=this.get(p.from),b=this.get(p.to);if(a?.mode==='talking'&&a.partner===b?.id&&a.room===b.room)this.say(a,p.text,b);this.pending.splice(this.pending.indexOf(p),1);}
  for(const a of this.agents){this.visitedStates.add(a.mode);if(a.path.length){const p=a.path[0],dx=p.x-a.x,dy=p.y-a.y,len=Math.hypot(dx,dy),step=dt*(a.hobby==='skate'?1.6:1.05);if(len<=step){a.x=p.x;a.y=p.y;a.path.shift();if(!a.path.length)this.activity(a);}else{a.x+=dx/len*step;a.y+=dy/len*step;}continue;}
   if(this.time<a.until)continue;
   if(a.mode==='betting'){const bot={credits:a.credits,spins:a.rounds,wins:a.wins},outcome=spin(bot,a.game,this.rng);a.credits=bot.credits;a.rounds=bot.spins;a.wins=bot.wins;a.sessionRounds++;a.lastBet=this.time;
    if(a.sessionRounds===1)this.say(a,outcome?.net>0?'A small virtual win. Then I’m finding a coffee.':'One fictional round. The conversation is better.');
    if(a.sessionRounds<2&&a.credits>=SPIN_COST){a.until=this.time+3;continue;}this.release(a);a.mode='resting';a.until=this.time+7;continue;}
   if(a.mode==='talking'){const b=this.get(a.partner);if(b?.partner===a.id)this.release(b);}
   this.unclaim(a);a.partner=null;this.decide(a);
  }
 }
}
