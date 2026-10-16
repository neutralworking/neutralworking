// SVG-only visual inspection. This is not a browser screenshot or layout test.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {ROOMS,freshState,dimensions,GUESTS} from '../dist/engine.js';
import {roomArt,project,objectArt,avatarArt} from '../dist/art.js';
const require=createRequire(import.meta.url),sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
await fs.mkdir('qa',{recursive:true});const s=freshState();
for(const [id,r] of Object.entries(ROOMS)){
 const obs=id==='suite'?s.furniture:r.objects;let actors=obs.map(o=>{const [w,d]=dimensions(o);return{depth:o.x+o.y+(w+d)/2,art:`<g transform="translate(${project(o.x,o.y)})">${objectArt(o,s.favourite)}</g>`};});
 actors.push({depth:9,art:`<g transform="translate(${project(4.5,4.5)})">${avatarArt(s)}<text x="0" y="-104" fill="#e6e4ca" font-size="11" text-anchor="middle">Alex · YOU</text></g>`});
 if(id!=='suite')GUESTS.filter(g=>g.room===id).forEach((g,i)=>{const p=[[2.5,4.5],[5.5,2.5],[3.5,6.5],[6.5,6.5],[1.5,3.5]][i];actors.push({depth:p[0]+p[1],art:`<g transform="translate(${project(...p)})">${avatarArt(g,true)}<text y="-104" fill="#d2d9c3" font-size="10" text-anchor="middle">${g.name} · DEMO</text></g>`});});
 const content=roomArt(r,s)+actors.sort((a,b)=>a.depth-b.depth).map(a=>a.art).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="740" viewBox="0 0 1000 740"><rect width="1000" height="740" fill="#203c45"/>${content}<text x="500" y="690" text-anchor="middle" fill="#d2c08f" font-family="Georgia" font-size="23">${r.name}</text></svg>`;
 await fs.writeFile(`qa/${id}.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`qa/${id}.png`);
 if(id==='suite')for(const [w,h]of [[375,675],[430,795],[688,948],[909,724],[747,327]]){const scale=w<600?.88:Math.min(w/950,h/720),vw=w/scale,vh=h/scale;const crop=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${500-vw/2} ${350-vh/2} ${vw} ${vh}"><rect x="-1000" y="-1000" width="3000" height="3000" fill="#203c45"/>${content}</svg>`;await sharp(Buffer.from(crop)).png().toFile(`qa/scene-crop-${w}x${h}.png`);}
}
const tiles=await Promise.all(Object.keys(ROOMS).map(async(id,i)=>({input:await sharp(`qa/${id}.png`).resize(500,370).toBuffer(),left:(i%2)*500,top:Math.floor(i/2)*370})));
await sharp({create:{width:1000,height:1110,channels:4,background:'#203c45'}}).composite(tiles).png().toFile('qa/rooms.png');
console.log('Rendered 5 rooms and 5 representative scene crops.');
