// Framework-independent simulation, persistence schema and collision rules.
export const SIZE=8, SAVE_KEY='the-grand-v1';
export const CATALOG={
 sofa:{name:'Velvet sofa',w:2,d:1,desc:'A little room to unwind.'},
 chair:{name:'Lounge chair',w:1,d:1,desc:'Your favourite corner.'},
 table:{name:'Marble table',w:1,d:1,desc:'Coffee, conversations, repeat.'},
 plant:{name:'Kentia palm',w:1,d:1,desc:'A touch of the tropics.'},
 lamp:{name:'Brass floor lamp',w:1,d:1,desc:'Set the evening mood.'},
 shelf:{name:'Record cabinet',w:2,d:1,desc:'For a well-curated life.'},
 bed:{name:'Cloud bed',w:2,d:2,desc:'Your suite. Your sanctuary.'},
 machine:{name:'Favourite machine',w:1,d:1,desc:'Your game, always nearby.'},
 sculpture:{name:'Golden sculpture',w:1,d:1,desc:'An original for your suite.'}
};
const o=(id,type,x,y,rot=0,game)=>({id,type,x,y,rot,...(game?{game}:{})});
export const DEFAULT_FURNITURE=[o('bed','bed',0,1),o('sofa','sofa',1,5),o('table','table',3,5),o('plant','plant',0,6),o('lamp','lamp',1,3),o('shelf','shelf',4,0),o('machine','machine',6,1),o('chair','chair',5,5),o('plant2','plant',7,5)];
export const ROOMS={
 suite:{name:'Your private suite',short:'My Suite',floor:'FLOOR 04 · SUITE 408',tag:'A place of your own.',accent:'#c7ad75',wall:'#37736a',floorA:'#ba9a70',floorB:'#b2946e',rug:'#326e68',spawn:[4,4],exit:[7,7],guestCount:0},
 lobby:{name:'The Grand Lobby',short:'Lobby',floor:'GROUND FLOOR',tag:'Every good evening starts here.',accent:'#cfb575',wall:'#456d65',floorA:'#d3c6a7',floorB:'#a8af9d',rug:'#8f4c48',spawn:[4,6],exit:[7,7],guestCount:4,
 objects:[o('desk','bar',0,1),o('bell','plant',0,5),o('seat1','sofa',3,1),o('palm','plant',7,0),o('seat2','chair',6,5),o('table','table',6,4),o('lamp','lamp',1,6),o('directory','sign',6,1)]},
 gold:{name:'The Gold Lounge',short:'Gold Lounge',floor:'FLOOR 01 · WEST WING',tag:'Velvet, brass & a little good fortune.',accent:'#e5b765',wall:'#67513c',floorA:'#9b7354',floorB:'#90694e',rug:'#75413f',spawn:[4,6],exit:[7,7],guestCount:3,
 objects:[o('gold1','machine',0,1,0,'gold'),o('gold2','machine',0,3,0,'gold'),o('gold3','machine',3,0,0,'gold'),o('sofa','sofa',5,1),o('table','table',5,3),o('palm','plant',0,6),o('lamp','lamp',7,1),o('chair','chair',6,5)]},
 neon:{name:'Neon Arcade',short:'Neon Arcade',floor:'FLOOR 02 · EAST WING',tag:'After dark, in full colour.',accent:'#9a94ff',wall:'#403d68',floorA:'#615b83',floorB:'#565174',rug:'#373d73',spawn:[4,6],exit:[7,7],guestCount:3,
 objects:[o('neon1','machine',0,1,0,'neon'),o('neon2','machine',0,3,0,'neon'),o('neon3','machine',3,0,0,'neon'),o('neon4','machine',5,0,0,'neon'),o('sofa','sofa',5,4),o('lamp','lamp',7,2),o('palm','plant',0,6)]},
 roof:{name:'The Rooftop Club',short:'Rooftop Club',floor:'FLOOR 08 · OPEN SKY',tag:'Above the city. Out of the ordinary.',accent:'#e2a49e',wall:'#526b7e',floorA:'#89959a',floorB:'#7e898e',rug:'#796a76',spawn:[4,6],exit:[7,7],guestCount:4,
 objects:[o('bar','bar',0,1),o('sofa','sofa',4,0),o('chair','chair',6,3),o('table','table',5,3),o('palm','plant',0,5),o('palm2','plant',7,0),o('music','speaker',1,6),o('game','machine',6,5,0,'neon')]}
};
export const GUESTS=[{name:'Sofia',body:'#bd715e',hair:'#382d2b',skin:'#d99a78',line:'The rooftop at sunset. Trust me.'},{name:'Jules',body:'#7b8ba6',hair:'#4f392b',skin:'#e9b393',line:'That record cabinet in your suite? Good choice.'},{name:'Mika',body:'#8c9271',hair:'#202329',skin:'#b88060',line:'I came for a quick look. Still here.'},{name:'Theo',body:'#c2a367',hair:'#6c4633',skin:'#e1aa8c',line:'See you in the Gold Lounge?'}];
export const COSMETICS={
 shirt:[{id:'teal',name:'Evergreen',color:'#417c71'},{id:'cream',name:'Ivory',color:'#e5d8bf'},{id:'wine',name:'Bordeaux',color:'#a35f69'},{id:'midnight',name:'Midnight',color:'#526e9a',achievement:'rounds'},{id:'gold',name:'Champagne',color:'#d0aa60',achievement:'fund'}],
 hair:[{id:'dark',name:'Espresso',color:'#3b302d'},{id:'chestnut',name:'Chestnut',color:'#94664b'},{id:'silver',name:'Silver',color:'#c3c3bd'}],
 hat:[{id:'none',name:'No headwear'},{id:'beanie',name:'Explorer beanie',achievement:'explore'},{id:'fedora',name:'Velvet fedora',achievement:'wins'}],
 accessory:[{id:'none',name:'No accessory'},{id:'glasses',name:'Round frames',achievement:'social'},{id:'pin',name:'Art deco pin',achievement:'decorate'}]
};
export const ACHIEVEMENTS=[
 {id:'rounds',name:'Getting into the swing',desc:'Play 5 rounds',target:5,metric:'spins',reward:'Midnight jacket'},
 {id:'explore',name:'Room to roam',desc:'Visit 3 public spaces',target:3,metric:'visited',reward:'Explorer beanie'},
 {id:'wins',name:'A little good fortune',desc:'Win 2 rounds',target:2,metric:'wins',reward:'Velvet fedora'},
 {id:'social',name:'A familiar face',desc:'Say hello to a demo guest',target:1,metric:'social',reward:'Round frames'},
 {id:'decorate',name:'Make yourself at home',desc:'Make your first suite edit',target:1,metric:'decorated',reward:'Art deco pin'},
 {id:'fund',name:'The welcome collection',desc:'Try simulated account funding',target:1,metric:'funded',reward:'Champagne jacket',demo:true}
];
export function freshState(){return {version:1,credits:2500,name:'Alex',shirt:'teal',hair:'dark',hat:'none',accessory:'none',skin:'#d6a080',theme:'evergreen',floor:'oak',favourite:'gold',furniture:structuredClone(DEFAULT_FURNITURE),spins:0,wins:0,social:0,decorated:0,funded:0,visited:[],unlocked:[],joystick:'floating',sound:false};}
export function dimensions(obj){const c=CATALOG[obj.type]||{w:obj.type==='bar'?3:1,d:1};return obj.rot%2?[c.d,c.w]:[c.w,c.d];}
export function cells(obj){const [w,d]=dimensions(obj),out=[];for(let x=0;x<w;x++)for(let y=0;y<d;y++)out.push([obj.x+x,obj.y+y]);return out;}
export function blocked(x,y,objects,ignore){if(x<0||y<0||x>=SIZE||y>=SIZE)return true;return objects.some(o=>o.id!==ignore&&cells(o).some(([a,b])=>a===x&&b===y));}
export function canPlace(obj,objects,player,exit=[7,7]){return cells(obj).every(([x,y])=>!blocked(x,y,objects,obj.id)&&!(x===Math.floor(player.x)&&y===Math.floor(player.y))&&!(x===exit[0]&&y===exit[1])) && reachableFloor([...objects.filter(o=>o.id!==obj.id),obj],player,exit);}
export function reachableFloor(objects,player,exit){return pathfind([Math.floor(player.x),Math.floor(player.y)],exit,objects)!==null;}
export function pathfind(start,end,objects){if(blocked(...end,objects))return null;const key=p=>p.join(','),q=[start],prev=new Map([[key(start),null]]);for(let i=0;i<q.length;i++){const a=q[i];if(key(a)===key(end)){let path=[],p=a;while(p){path.unshift(p);p=prev.get(key(p));}return path.slice(1);}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[a[0]+dx,a[1]+dy];if(!blocked(...p,objects)&&!prev.has(key(p))){prev.set(key(p),a);q.push(p);}}}return null;}
export function approach(player,obj,objects){const candidates=[];for(const [x,y] of cells(obj))for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[x+dx,y+dy];const path=pathfind([Math.floor(player.x),Math.floor(player.y)],p,objects);if(path!==null)candidates.push({path,target:p});}return candidates.sort((a,b)=>a.path.length-b.path.length)[0]||null;}
export function moveContinuous(player,dx,dy,dt,objects){const mag=Math.hypot(dx,dy);if(!mag)return {...player};const speed=2.8*dt/Math.max(1,mag);let {x,y}=player; // substeps prevent tunnelling after a delayed frame
 const steps=Math.max(1,Math.ceil(speed*mag/.08));for(let i=0;i<steps;i++){const nx=x+dx*speed/steps,ny=y+dy*speed/steps;const free=(a,b)=>[[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]].every(([ox,oy])=>!blocked(Math.floor(a+ox),Math.floor(b+oy),objects));if(free(nx,y))x=nx;if(free(x,ny))y=ny;}return {...player,x,y};}
export function progress(a,s){return a.metric==='visited'?new Set(s.visited.filter(v=>v!=='suite')).size:Number(s[a.metric]||0);}
export function checkUnlocks(s){const newly=ACHIEVEMENTS.filter(a=>progress(a,s)>=a.target&&!s.unlocked.includes(a.id));s.unlocked.push(...newly.map(a=>a.id));return newly;}
export function equippedColor(s){return COSMETICS.shirt.find(c=>c.id===s.shirt)?.color||'#417c71';}
export function isUnlocked(c,s){return !c.achievement||s.unlocked.includes(c.achievement);}
export function spin(s,game,rng=Math.random,bet=25){if(s.credits<bet)return null;const r=rng();const symbols=game==='neon'?['orb','bolt','star','diamond']:['seven','diamond','crown','cherry'];let result,payout;if(r<.08){result=[symbols[0],symbols[0],symbols[0]];payout=bet*8;}else if(r<.24){result=[symbols[1],symbols[1],symbols[1]];payout=bet*4;}else if(r<.48){result=[symbols[2],symbols[2],symbols[3]];payout=bet*2;}else{result=[symbols[0],symbols[3],symbols[1]];payout=0;}s.credits=s.credits-bet+payout;s.spins++;if(payout>bet)s.wins++;return {symbols:result,payout,bet,net:payout-bet};}
export function loadState(raw){const d=freshState();try{const s=JSON.parse(raw);if(s?.version!==1)return d;for(const k of ['spins','wins','social','decorated','funded'])if(Number.isFinite(s[k])&&s[k]>=0)d[k]=Math.floor(s[k]);if(Number.isFinite(s.credits)&&s.credits>=0)d.credits=Math.floor(s.credits);for(const k of ['name','theme','floor','favourite','joystick'])if(typeof s[k]==='string')d[k]=s[k].slice(0,30);for(const k of Object.keys(COSMETICS))if(COSMETICS[k].some(c=>c.id===s[k]))d[k]=s[k];d.visited=Array.isArray(s.visited)?[...new Set(s.visited.filter(v=>ROOMS[v]))]:[];d.unlocked=Array.isArray(s.unlocked)?s.unlocked.filter(a=>ACHIEVEMENTS.some(b=>b.id===a)):[];d.sound=!!s.sound;
 if(Array.isArray(s.furniture)&&s.furniture.length<=24){const valid=[];for(const o of s.furniture){if(!CATALOG[o.type]||typeof o.id!=='string'||!Number.isInteger(o.x)||!Number.isInteger(o.y))continue;const item={id:o.id.slice(0,60),type:o.type,x:o.x,y:o.y,rot:o.rot===1?1:0};if(cells(item).every(([x,y])=>!blocked(x,y,valid)))valid.push(item);}const spawn=[];for(let x=0;x<8;x++)for(let y=0;y<8;y++)if(!blocked(x,y,valid))spawn.push({x:x+.5,y:y+.5});if(spawn.some(p=>reachableFloor(valid,p,[7,7])))d.furniture=valid;}
 checkUnlocks(d);for(const k of Object.keys(COSMETICS)){const c=COSMETICS[k].find(c=>c.id===d[k]);if(!isUnlocked(c,d))d[k]=COSMETICS[k][0].id;}return d;}catch{return d;}}
