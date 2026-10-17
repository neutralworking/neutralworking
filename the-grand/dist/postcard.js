// Postcards from The Grand (bonus round). Pure: compose a 1500×1000 postcard SVG around a snapshot of the room.
// The app supplies the scene markup (the room as drawn) and saves the result as a PNG; nothing here touches the DOM.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// One line per room, in the hotel's voice. Never about play or offers.
// The sky's phase as a part of the day, for greetings that mention one.
const PART_OF_DAY = {night: 'tonight', dusk: 'tonight', golden: 'this evening', day: 'today', dawn: 'this morning'};

export const GREETINGS = {
  suite: 'My suite, my rules. Mostly. The furniture has opinions.',
  lobby: 'The lobby is all brass and gossip. Sofia says hello, allegedly.',
  gold: 'Velvet everywhere. Rex keeps the standings like scripture.',
  neon: 'The Arcade glows, day or night. Pip swears the cabinets hum in tune.',
  roof: 'The city went on forever {when}. Somebody played the sax.',
  hall: 'Every wall has a story. Mr Penrose has the footnotes.',
};

// Plain SVG text wrapping (no foreignObject, which would taint the canvas when the card is saved as an image).
export function wrap(text, max) {
  const out = [];
  let line = '';
  for (const w of String(text).split(/\s+/)) { if (line && (line + ' ' + w).length > max) { out.push(line); line = w; } else line = line ? `${line} ${w}` : w; }
  if (line) out.push(line);
  return out;
}

export function postcardText({roomId, roomName, sky, name, guests = [], date = new Date()}) {
  const when = sky?.label ? sky.label.toLowerCase() : 'evening';
  const company = guests.length ? ` ${guests.slice(0, 2).join(' and ')} ${guests.length === 1 ? 'was' : 'were'} here too.` : '';
  return {
    title: roomName,
    body: `${(GREETINGS[roomId] || 'Wish you were here.').replace('{when}', PART_OF_DAY[sky?.phase] || 'tonight')}${company}`,
    sign: `${name || 'A guest'}, Suite 408`,
    stamp: date.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).toUpperCase(),
    when: when.charAt(0).toUpperCase() + when.slice(1),
  };
}

// scene: inner SVG markup of the room; viewBox: the part of it to frame.
export function postcardSvg({scene, viewBox = '160 40 680 650', roomId, roomName, sky, name, guests, date = new Date()}) {
  const t = postcardText({roomId, roomName, sky, name, guests, date});
  const perforation = (x, y, w, h) => {
    let s = '';
    for (let i = 0; i <= w; i += 14) s += `<circle cx="${x + i}" cy="${y}" r="5" fill="#efe4cc"/><circle cx="${x + i}" cy="${y + h}" r="5" fill="#efe4cc"/>`;
    for (let i = 0; i <= h; i += 14) s += `<circle cx="${x}" cy="${y + i}" r="5" fill="#efe4cc"/><circle cx="${x + w}" cy="${y + i}" r="5" fill="#efe4cc"/>`;
    return s;
  };
  const top = sky?.top || '#122f41', bottom = sky?.bottom || '#547a87';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000" viewBox="0 0 1500 1000">
<style>.guest-name{fill:#f3ecd4;font:600 10px Inter,Helvetica,sans-serif;text-anchor:middle;paint-order:stroke;stroke:#10262d;stroke-width:3px}.guest-name tspan{font-size:6px}.resident-state,.bubble,.speech,.target-marker{display:none}text{font-family:Georgia,serif}</style>
<defs><linearGradient id="pcSky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
<pattern id="pcPaper" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#efe4cc"/><path d="M0 6 6 0" stroke="#e3d5b6" stroke-width=".6"/></pattern></defs>
<rect width="1500" height="1000" rx="22" fill="url(#pcPaper)"/>
<rect x="18" y="18" width="1464" height="964" rx="14" fill="none" stroke="#b79b62" stroke-width="2" stroke-dasharray="2 7"/>
<rect x="56" y="56" width="860" height="888" rx="10" fill="#fbf6ea"/>
<rect x="72" y="72" width="828" height="792" rx="6" fill="url(#pcSky)"/>
<svg x="72" y="72" width="828" height="792" viewBox="${esc(viewBox)}" preserveAspectRatio="xMidYMid slice">${scene}</svg>
<text x="486" y="912" text-anchor="middle" fill="#5d6b63" font-size="22" letter-spacing="6">${esc(t.when.toUpperCase())} · ${esc(String(t.title).toUpperCase())}</text>
<line x1="980" y1="290" x2="980" y2="910" stroke="#b79b62" stroke-width="2"/>
<text x="1012" y="318" fill="#8a6f3c" font-size="22" letter-spacing="5">GREETINGS FROM</text>
<text x="1008" y="392" fill="#2d5a4f" font-size="72" font-style="italic">The Grand</text>
<text x="1012" y="438" fill="#8a6f3c" font-size="24">${esc(t.title)}</text>
<text x="1012" y="506" fill="#33403a" font-size="28" font-style="italic">${wrap(t.body, 27).map((l, i) => `<tspan x="1012" dy="${i ? 41 : 0}">${esc(l)}</tspan>`).join('')}</text>
<text x="1012" y="704" fill="#33403a" font-size="26" font-style="italic">— ${esc(t.sign)}</text>
${[800, 850, 900].map(y => `<line x1="1012" y1="${y}" x2="1440" y2="${y}" stroke="#b79b62" stroke-width="1.5"/>`).join('')}
<text x="1012" y="792" fill="#8a6f3c" font-size="20">To whoever checks in next</text>
<g transform="translate(1290 52)"><rect width="160" height="196" fill="#2d5a4f"/>${perforation(0, 0, 160, 196)}
<rect x="14" y="14" width="132" height="140" fill="url(#pcSky)"/>${Array.from({length: 7}, (_, i) => `<rect x="${20 + i * 18}" y="${154 - (30 + (i * 37) % 70)}" width="14" height="${30 + (i * 37) % 70}" fill="#1d3442"/>`).join('')}
<circle cx="112" cy="44" r="10" fill="#f1e8c8"/><text x="80" y="180" text-anchor="middle" fill="#efe4cc" font-size="18" letter-spacing="3">THE GRAND</text><text x="132" y="34" text-anchor="end" fill="#f1e8c8" font-size="16">408</text></g>
<g transform="translate(1150 150) rotate(-14)" opacity=".75"><circle r="64" fill="none" stroke="#7a5a2a" stroke-width="3"/><circle r="50" fill="none" stroke="#7a5a2a" stroke-width="1.5"/>
<text y="-14" text-anchor="middle" fill="#7a5a2a" font-size="13" letter-spacing="2">THE GRAND</text><text y="8" text-anchor="middle" fill="#7a5a2a" font-size="15">${esc(t.stamp)}</text><text y="28" text-anchor="middle" fill="#7a5a2a" font-size="11" letter-spacing="2">SUITE 408</text>
<path d="M70 -20q20-10 40 0t40 0t40 0M70 0q20-10 40 0t40 0t40 0M70 20q20-10 40 0t40 0t40 0" fill="none" stroke="#7a5a2a" stroke-width="2.5"/></g>
<text x="1440" y="960" text-anchor="end" fill="#a08a5c" font-size="14" letter-spacing="2">SIMULATED · THE GRAND IS A NEUTRAL WORKING PROTOTYPE</text>
</svg>`;
}
