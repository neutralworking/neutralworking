# The Grand

A standalone, mobile-first isometric social hotel prototype. The suite opens immediately; there is no sign-up or backend dependency. Original SVG artwork is rendered as a real game world, with continuous avatar movement, collision and depth ordering.

## Play

- Tap an open floor tile to walk. Tap a cabinet to approach and open its game.
- Drag the lower-left joystick on touch screens. Settings switches floating/fixed modes. Short taps in the floating area still move to the tapped tile.
- Desktop movement also supports WASD and arrow keys. Interactive room objects can be focused and activated with Enter/Space.
- Walk to the hotel exit, or open Explore Hotel, to visit the Lobby, Gold Lounge, Neon Arcade and Rooftop Club.
- In your suite, choose Decorate. Select a piece, tap a tile for a placement preview, rotate if desired, then choose Place here. Select an existing piece to move, rotate or remove it. The exit cannot be sealed off.
- Style & games changes walls, flooring and your physical favourite cabinet.
- Play Grand Sevens or Nova Nights with fictional credits. There are no payments, withdrawals or cash prizes.
- Meet 20 original adult residents. Kit is a charming skateboard troublemaker; Noor plays saxophone and admires remarkable women in history. Each resident has a biography, three authored conversation topics, a home room and its own live routine. Residents wander, chat with each other, play virtual-credit cabinets, browse the boutique, rest and pursue their hobbies.
- Open Avatar to choose Woman, Man or Neutral presentation, eight skin tones and eight hairstyles. These choices are free, save immediately and appear in the world, HUD, chat and store previews.
- Open Store, or tap the physical clothing rail in the lobby, for 13 jackets, hats and accessories. Try an item on your own avatar, buy with virtual credits and equip it. Owned items remain in your wardrobe and never charge twice.
- Say hello to clearly labelled simulated residents. Earn cosmetics through gameplay, exploration, social interaction and decoration. The one-time funding reward is explicitly simulated.
- Your room, avatar, preferences, credits and achievements save to this browser's local storage.

## Source

GitHub location: `neutralworking/neutralworking`, folder `the-grand/`.

Live prototype: https://the-grand-weld.vercel.app

- `dist/engine.js`: pure simulation, room definitions, collision, BFS pathfinding, achievement rules, outcome logic and persistence validation.
- `dist/characters.js`: 20 original character profiles, visual identities and 60 authored conversation topics.
- `dist/residents.js`: autonomous finite-state routines, machine reservations, independent bot balances, paired conversations and player interruption.
- `dist/art.js`: original isometric vector furniture, room scenery, cabinets, modular avatars and UI icons.
- `dist/app.js`: input, game loop, camera, scene ordering, decorating, menus and interaction controllers.
- `dist/style.css`: phone/tablet/desktop layouts, landscape handling, safe areas and motion preferences.
- `tests/engine.test.mjs`: simulation, room connectivity, placement, payout and persistence coverage.
- `tests/app.test.mjs`: a complete interactive user journey in LinkeDOM, with an injected animation clock and pointer coordinates.
- `tests/residents-store.test.mjs`: ten simulated minutes of autonomous behaviour, NPC conversations, purchase guards, identity options and save migration.
- `tests/render-cast.mjs`: optional visual contact sheets of all residents, player appearances and store items.
- `tests/render-scenes.mjs`: optional standalone SVG scene rendering via the Codex runtime's Sharp library.
- `QA.md`: exact verification scope and remaining acceptance checks.

The production app is buildless HTML/CSS/ES modules with no external fonts, images, libraries, APIs or runtime package downloads. Serve `dist/` over HTTP; opening `index.html` via `file://` will not load ES modules in most browsers.

```sh
npm ci
npm run check
npm test
python3 -m http.server 8080 --directory dist
```

No Chief Scout source, database or infrastructure is used or changed. The Vercel project serves `dist/`. In a monorepo, set its Root Directory to `the-grand`; the included `vercel.json` configures static deployment without a build step.

## Prototype limits

This is a single-player experience. Residents and conversations are scripted, with autonomous local routines rather than a generative chat service. Progress is local to one browser and is not synced across devices. The game logic is a demo, not a certified casino engine. The funding flow only grants fictional credits and a cosmetic. There is no real-money commerce or authentication.

Next iteration: validate movement and editing on a physical phone, tune the camera around actual thumb use, then add one deeper room interaction (hosting a guest or a shared table) before expanding the catalogue or backend.
