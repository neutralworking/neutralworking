import {RESIDENTS} from './characters.js';

// Social rewards are finite, saved milestones. Tokens can only buy cosmetics.
export const SOCIAL_ROOMS=['lobby','gold','neon','roof'];
export const STORY_DEFS={
 kit:{id:'kit',resident:10,title:'A line of his own',reward:'City cruiser + 8 style tokens',steps:['Ask Kit about the route signs','Get Ada’s advice in person','Make a route poster in the gallery','Bring the finished poster to Kit'],room:'neon'},
 noor:{id:'noor',resident:15,title:'Her name in the lights',reward:'Jazz club pin + 12 style tokens',steps:['Ask Noor about her tribute set','Ask Farah about the hotel archive','Choose a tribute at the gallery archive','Hear Noor’s finished tribute'],room:'roof'}
};
const TRUST_LINES=[
 'I keep a spare key that opens absolutely nothing. It’s comforting to have one honest key.',
 'My rarest record is a recording of my father laughing. I never put it on the shop list.',
 'I became a planner because my grandmother couldn’t reach half the places she loved.',
 'The first thing I built was a crooked shelf for my daughter. She still refuses to replace it.',
 'I write detective stories on night shifts. In mine, the concierge always solves it.',
 'I lost my first case. Remembering it kept me careful for forty years.',
 'I cook my mother’s soup when I miss home. I still use her chipped blue bowl.',
 'I teach the children next door chess. They think I let them win. Only sometimes.',
 'Before every opening night I call my sister. She makes me laugh until the nerves pass.',
 'I still dance in the kitchen. There’s less applause, but much better coffee.',
 'I act as if everything is a joke. Finishing something people can use scares me more than a ramp.',
 'I keep a notebook of things the sky makes me feel. The equations go in a different one.',
 'My best trick was making a hospital evening feel shorter for my dad.',
 'I like rules because you can change them together. Being fair matters more than winning.',
 'I started making crosswords for my partner’s long train journeys. I still hide little messages.',
 'I used to hide behind other people’s melodies. This hotel is where I’m finding my own.',
 'I save the last song of every set for someone who looks like they need it.',
 'The first cutting I ever grew came from my grandfather’s balcony. Its descendants are everywhere.',
 'My first suit was made from a curtain. My mother wore it to every important appointment.',
 'I keep the corrections people send me. Listening is the part of the job I’m proudest of.'
];
export function freshSocial(){return{tokens:0,earned:0,spent:0,claims:[],relationships:{},stories:{kit:{stage:0,choice:''},noor:{stage:0,choice:''}}};}
const int=(n,max=9999)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
const validClaim=k=>/^(meet:(?:[0-9]|1[0-9])|topic:(?:[0-9]|1[0-9]):[0-2]|trust:(?:[0-9]|1[0-9])|visit:(?:lobby|gold|neon|roof)|host:(?:[0-9]|1[0-9])|story:(?:kit|noor))$/.test(k);
export function loadSocial(value){const d=freshSocial();if(!value||typeof value!=='object')return d;d.tokens=int(value.tokens);d.earned=int(value.earned);d.spent=int(value.spent);d.claims=Array.isArray(value.claims)?[...new Set(value.claims.filter(k=>typeof k==='string'&&validClaim(k)))]:[];
 for(const r of RESIDENTS){const old=value.relationships?.[r.id];if(!old||typeof old!=='object')continue;d.relationships[r.id]={points:int(old.points,30),topics:Array.isArray(old.topics)?[...new Set(old.topics.filter(n=>Number.isInteger(n)&&n>=0&&n<3))]:[],trust:old.trust===true};}
 for(const id of Object.keys(STORY_DEFS)){const old=value.stories?.[id];d.stories[id]={stage:int(old?.stage,4),choice:(id==='kit'?['direct','scenic']:['chisholm','hopper']).includes(old?.choice)?old.choice:''};if(d.stories[id].stage>2&&!d.stories[id].choice)d.stories[id].stage=2;}
 return d;}
function ensure(s){return s.socialProgress??=freshSocial();}
function bond(s,id){const p=ensure(s);return p.relationships[id]??={points:0,topics:[],trust:false};}
export function awardStyle(s,key,amount){const p=ensure(s);if(!validClaim(key)||p.claims.includes(key))return 0;p.claims.push(key);p.tokens+=amount;p.earned+=amount;return amount;}
export function recordConversation(s,id,text='',topic=null){const resident=RESIDENTS.find(r=>r.id===id);if(!resident)return 0;const b=bond(s,id);let earned=awardStyle(s,`meet:${id}`,2);if(earned)b.points+=2;
 const n=Number.isInteger(topic)?topic:resident.topics.findIndex(t=>t.keywords.some(k=>String(text).toLowerCase().includes(k)));
 if(n>=0&&n<3&&!b.topics.includes(n)){b.topics.push(n);b.points=Math.min(30,b.points+3);earned+=awardStyle(s,`topic:${id}:${n}`,1);}return earned;}
export function syncExploration(s){let n=0;for(const id of SOCIAL_ROOMS)if(s.visited.includes(id))n+=awardStyle(s,`visit:${id}`,3);for(const r of RESIDENTS)if(s.hosted?.includes(r.name)){const earned=awardStyle(s,`host:${r.id}`,4);if(earned)bond(s,r.id).points=Math.min(30,bond(s,r.id).points+4);n+=earned;}return n;}
export function relationship(s,id){const b=ensure(s).relationships[id]||{points:0,topics:[],trust:false},points=b.points;return{...b,label:points>=18?'Close friend':points>=8?'Friend':points>=5?'Familiar face':points>0||s.metResidents.includes(id)?'Acquaintance':'Not met yet',next:points<8?8:18};}
export function trustReply(s,id){const b=bond(s,id);if(b.points<8)return null;if(!b.trust){b.trust=true;b.points=Math.min(30,b.points+3);awardStyle(s,`trust:${id}`,2);}return TRUST_LINES[id];}
export function socialGreeting(s,id,fallback){const r=relationship(s,id),p=ensure(s);if(id===10&&p.stories.kit.stage===4)return `Still taking the ${p.stories.kit.choice==='scenic'?'garden loop':'direct route'}, ${s.name}? The signs are still pointing the right way. Thanks for helping me put that right.`;
 if(id===15&&p.stories.noor.stage===4)return `Your ${p.stories.noor.choice==='hopper'?'Grace Hopper':'Shirley Chisholm'} tribute is in tonight’s set, ${s.name}. Shall we make some room for the next story?`;
 if(r.points>=8&&r.topics.length)return `Good to see you, ${s.name}. I remembered our chat about ${RESIDENTS[id].topics[r.topics[0]].label.toLowerCase().replace(/^your /,'my ').replace(/\?$/,'')}. Pull up a chair.`;return fallback;}
export const tokenCost=item=>Math.ceil(item.price/30);
export function buyWithStyle(s,item){const p=ensure(s);if(!item)return{ok:false,reason:'unknown'};if(s.owned.includes(item.id))return{ok:false,reason:'owned'};const cost=tokenCost(item);if(p.tokens<cost)return{ok:false,reason:'tokens'};p.tokens-=cost;p.spent+=cost;s.owned.push(item.id);s.purchases++;s[item.category]=item.id;return{ok:true,item};}
export function storyOptions(s,id){const p=ensure(s),out=[];if(id===10&&p.stories.kit.stage===0)out.push({action:'kit-start',label:'What happened to the route signs?'});if(id===2&&p.stories.kit.stage===1)out.push({action:'kit-advice',label:'Help Kit repair the route signs'});if(id===10&&p.stories.kit.stage===3)out.push({action:'kit-finish',label:'Show Kit the finished route'});if(id===15&&p.stories.noor.stage===0)out.push({action:'noor-start',label:'Tell me about your tribute set'});if(id===4&&p.stories.noor.stage===1)out.push({action:'noor-archive',label:'Find a story for Noor’s set'});if(id===15&&p.stories.noor.stage===3)out.push({action:'noor-finish',label:'Play our tribute'});return out;}
export function advanceStory(s,action,id){const p=ensure(s),kit=p.stories.kit,noor=p.stories.noor;let text='',done=null;
 if(action==='kit-start'&&id===10&&kit.stage===0){kit.stage=1;text='I swapped the gallery signs for a joke. Someone missed the step-free route. That wasn’t funny. Ada knows the building. Could you help me ask her how to put it right?';}
 if(action==='kit-advice'&&id===2&&kit.stage===1){kit.stage=2;text='Give people a real choice. The direct lift route is smooth and short. The garden loop is step-free too, with places to rest. Make a clear poster at the gallery route board, then show Kit. Keep both routes marked.';}
 if(action==='kit-finish'&&id===10&&kit.stage===3){kit.stage=4;done='kit';text=`You made the ${kit.choice==='scenic'?'garden loop':'direct lift route'} the headline and kept the other clearly marked. I’ll put the signs back and apologise. You helped me finish something useful. Here, my spare cruiser. We’ll take a gentle lap sometime.`;}
 if(action==='noor-start'&&id===15&&noor.stage===0){noor.stage=1;text='I’m writing a tribute to a woman who changed the room she walked into. No imitation, just a melody of my own. Farah keeps the hotel archive. Would you ask her which stories we could put in the lights?';}
 if(action==='noor-archive'&&id===4&&noor.stage===1){noor.stage=2;text='Two portraits in the gallery archive: Shirley Chisholm, a voice for people left outside the room, and Grace Hopper, a pioneer who imagined different ways to work with computers. Pick the story you want Noor to honour. I’ll find the programme cards.';}
 if(action==='noor-finish'&&id===15&&noor.stage===3){noor.stage=4;done='noor';text=noor.choice==='hopper'?'For Grace Hopper: a curious little phrase, then a surprising turn. Not her voice, my own answer to her imagination. Thank you for helping me find its shape. This jazz pin is for you.':'For Shirley Chisholm: a clear opening, room for a second voice, then a bold finish. Thank you for choosing someone who made herself heard. This jazz pin is for you.';}
 if(!text)return{ok:false};if(done){const reward=done==='kit'?'skateboard':'sax-pin';if(!s.owned.includes(reward))s.owned.push(reward);awardStyle(s,`story:${done}`,done==='kit'?8:12);bond(s,id).points=Math.min(30,bond(s,id).points+8);}return{ok:true,text,done,perform:done==='noor'};}
export function chooseStory(s,id,choice){const story=ensure(s).stories[id],valid=id==='kit'?['direct','scenic']:id==='noor'?['chisholm','hopper']:[];if(!story||story.stage!==2||!valid.includes(choice))return false;story.choice=choice;story.stage=3;return true;}
export function storyHint(s,id){const def=STORY_DEFS[id],story=ensure(s).stories[id];return{...def,...story,complete:story.stage===4,next:story.stage===4?'Complete · your choice is remembered':def.steps[story.stage],find:story.stage===1?(id==='kit'?2:4):def.resident};}
