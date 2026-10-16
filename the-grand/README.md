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
- Say hello to clearly labelled demo guests. Earn cosmetics through gameplay, exploration, social interaction and decoration. The one-time funding reward is explicitly simulated.
- Tap Sofia to talk to her in the room: type anything, or use the quick replies. She is a scripted con artist, not a connected player or an AI model.
- Your first evening: get Sofia up to your suite. She will not visit without The Grand Reserve, which unlocks after winning 2 rounds and trying the simulated funding flow. Invite her in person or from Invite in your suite.
- Your room, avatar, preferences, credits and achievements save to this browser's local storage.

## Source

GitHub location: `neutralworking/neutralworking`, folder `the-grand/`.

Live prototype: https://the-grand-weld.vercel.app

- `dist/engine.js`: pure simulation, room definitions, collision, BFS pathfinding, achievement rules, outcome logic and persistence validation.
- `dist/art.js`: original isometric vector furniture, room scenery, cabinets, modular avatars and UI icons.
- `dist/app.js`: input, game loop, camera, scene ordering, decorating, menus, inline speech bubbles, invitations, onboarding and interaction controllers.
- `dist/sofia.js`: Sofia's pure dialogue engine (intent matching, memory, moods, schemes, invitation gate). No DOM; deterministic with an injected rng.
- `dist/style.css`: phone/tablet/desktop layouts, landscape handling, safe areas and motion preferences.
- `tests/engine.test.mjs`: simulation, room connectivity, placement, payout and persistence coverage.
- `tests/sofia.test.mjs`: dialogue behaviour, invitation gate, persistence and a no-deposit-talk fuzz test.
- `tests/app.test.mjs`: a complete interactive user journey in LinkeDOM, with an injected animation clock and pointer coordinates.
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

This is a single-player experience. Guests and conversations are scripted. Progress is local to one browser and is not synced across devices. The game logic is a demo, not a certified casino engine. The funding flow only grants fictional credits and a cosmetic. There is no real-money commerce or authentication.

Next iteration: validate movement and editing on a physical phone, tune the camera around actual thumb use, then add one deeper room interaction (hosting a guest or a shared table) before expanding the catalogue or backend.
