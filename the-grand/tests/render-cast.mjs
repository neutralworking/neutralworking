import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {RESIDENTS} from '../dist/characters.js';
import {freshState,SKIN_TONES,PRESENTATIONS,STORE_ITEMS} from '../dist/engine.js';
import {avatarArt,esc} from '../dist/art.js';
const require=createRequire(import.meta.url),sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
await fs.mkdir('qa',{recursive:true});
let art='';for(const p of RESIDENTS){const x=(p.id%5)*200,y=Math.floor(p.id/5)*210;art+=`<rect x="${x+8}" y="${y+8}" width="184" height="194" rx="12" fill="#294842" stroke="#65816840"/><g transform="translate(${x+100} ${y+145}) scale(1.1)">${avatarArt({...p,mode:p.hobby==='sax'?'music':'walking'},true)}</g><text x="${x+100}" y="${y+170}" text-anchor="middle" fill="#e9ddba" font-family="Georgia" font-size="16">${esc(p.fullName)}</text><text x="${x+100}" y="${y+188}" text-anchor="middle" fill="#9fb8a2" font-size="9">${esc(p.title)}</text>`;}
const cast=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="840"><rect width="1000" height="840" fill="#18333c"/>${art}</svg>`;await sharp(Buffer.from(cast)).png().toFile('qa/residents.png');
art='';for(let row=0;row<3;row++)for(let col=0;col<8;col++){const x=col*140+70,y=row*180+125;const state={...freshState(),presentation:PRESENTATIONS[row].id,skin:SKIN_TONES[col],hairStyle:row===0?'bob':row===1?'crop':'afro'};art+=`<g transform="translate(${x} ${y}) scale(1.12)">${avatarArt(state)}</g><text x="${x}" y="${y+28}" text-anchor="middle" fill="#c5cdb4" font-size="11">${PRESENTATIONS[row].name} · ${col+1}</text>`;}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="540"><rect width="1120" height="540" fill="#294842"/>${art}</svg>`)).png().toFile('qa/player-options.png');
art='';for(let i=0;i<STORE_ITEMS.length;i++){const item=STORE_ITEMS[i],x=i%5*190+95,y=Math.floor(i/5)*190+135;art+=`<g transform="translate(${x} ${y}) scale(1.15)">${avatarArt({...freshState(),presentation:'woman',skin:SKIN_TONES[6],hairStyle:'curls',[item.category]:item.id})}</g><text x="${x}" y="${y+25}" text-anchor="middle" fill="#e2d4ad" font-size="12">${item.name}</text><text x="${x}" y="${y+42}" text-anchor="middle" fill="#a8baa1" font-size="10">${item.price} credits</text>`;}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="950" height="570"><rect width="950" height="570" fill="#294842"/>${art}</svg>`)).png().toFile('qa/boutique.png');
console.log('Rendered 20 residents, 24 player appearances and all 13 boutique items.');
