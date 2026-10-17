# The Grand

A standalone, mobile-first isometric social hotel prototype. The suite opens immediately; there is no sign-up or backend dependency. Original SVG artwork is rendered as a real game world, with continuous avatar movement, collision and depth ordering.

## Play

- Tap an open floor tile to walk. Tap a cabinet to approach and open its game.
- Drag the lower-left joystick on touch screens. Settings switches floating/fixed modes. Short taps in the floating area still move to the tapped tile.
- Desktop movement also supports WASD and arrow keys. Interactive room objects can be focused and activated with Enter/Space.
- Walk to a room’s exit to enter the shared Gallery & Lifts, then tap a marked lift doorway to walk to another floor. Explore Hotel also offers quick visits to the Lobby, Gold Lounge, Neon Arcade and Rooftop Club.
- In your suite, choose Decorate. Select a piece, tap a tile for a placement preview, rotate if desired, then choose Place here. Select an existing piece to move, rotate or remove it. The exit cannot be sealed off.
- Style & games changes walls, flooring and your physical favourite cabinet.
- Play Grand Sevens or Nova Nights with fictional credits. There are no payments, withdrawals or cash prizes.
- Meet 20 original adult residents. Kit is a charming skateboard troublemaker; Noor plays saxophone and admires remarkable women in history. Each resident has a biography, three authored conversation topics, a home room and its own live routine. Residents wander, chat with each other, play virtual-credit cabinets, browse the boutique, rest and pursue their hobbies.
- Open Avatar to choose Woman, Man or Neutral presentation, eight skin tones and eight hairstyles. These choices are free, save immediately and appear in the world, HUD, chat and store previews.
- Open Store, or tap the physical clothing rail in the lobby, for 13 jackets, hats and accessories. Try an item on your own avatar, buy with virtual credits or earned style tokens and equip it. Owned items remain in your wardrobe and never charge twice.
- Say hello to clearly labelled simulated residents. Earn cosmetics through gameplay, exploration, social interaction and decoration. The one-time funding reward is explicitly simulated.
- Tap any resident to talk to them in the room: type anything or use their topic chips, and their reply appears above their head.
- Sofia is the hotel's most dangerous flirt and con artist, with her own dialogue engine. Expect innuendo. She is scripted, not a connected player or an AI model.
- Your first evening: get Sofia up to your suite. She will not visit without The Grand Reserve, which unlocks after winning 2 rounds and trying the simulated funding flow. Invite her in person or from Invite in your suite.
- Open Stories to follow Kit’s route-sign repair and Noor’s tribute performance. Each has four stages, another resident to consult, a physical gallery display with a remembered choice, a character-specific ending and a cosmetic reward.
- Listening to distinct topics builds persistent friendships and unlocks personal dialogue. Profiles remember topics, visits and story choices. Repeating a line does not farm points or rewards.
- Earn style tokens from exploration, introductions, new conversation topics, personal chats, hosting and story endings. Every milestone pays once. Tokens only buy cosmetics; they never fund a game or change its credit wallet.
- Residents travel between public rooms through the same gallery on staggered local schedules. Their live location appears in the resident directory; Find takes you to their current location. Suite visitors are exempt from travel schedules.
- Your room, avatar, relationships, story choices, preferences, credits and achievements save to this browser's local storage. Returning players can continue or start over on load, or any time from Settings → Start over.

## Source

GitHub location: `neutralworking/neutralworking`, folder `the-grand/`.

Live prototype: https://the-grand-weld.vercel.app

- `dist/engine.js`: pure simulation, room definitions, collision, BFS pathfinding, achievement rules, outcome logic and persistence validation.
- `dist/characters.js`: 20 original character profiles plus hotel staff (functional NPCs), visual identities and 60 authored conversation topics.
- `dist/social.js`: saved relationships and story state, finite style-token rewards, cosmetic redemption, authored story branches and personal dialogue.
- `dist/residents.js`: autonomous finite-state routines, machine reservations, independent bot balances, paired conversations and player interruption.
- `dist/art.js`: original isometric vector furniture, room scenery, cabinets, modular avatars and UI icons.
- `dist/app.js`: input, game loop, camera, scene ordering, decorating, menus, inline conversations and speech bubbles, suite invitations, onboarding and interaction controllers.
- `dist/npc-brain.js`: reusable NPC dialogue engine (intent classification, response pools with conditions/effects/actions, memory, slot filling, reactions). Accepts an external classifier's decision.
- `dist/data/promo.js` + `dist/data/fixtures/`: PromoData interface and SIMULATED fixtures (bonuses, free spins, competitions, records, terms, banking). `dist/terms.html` renders the simulated terms.
- `dist/data/competitions.js`: competition opt-ins, scores on live competitions and the player's standing, saved with progress.
- `dist/data/limits.js`: the player's daily loss limit (lower now, raise after 24 hours), saved with progress.
- `dist/data/spins.js`: free spins played at a cabinet (no credits spent, winnings as bonus credits capped at max win, wagering tracked).
- `dist/data/claims.js`: simulated bonus claims (fictional bonus credits, wagering progress), saved with progress.
- `dist/cards.js`: data-driven cards for functional NPCs (offers, competitions, leaderboard, records, terms, banking, safer play).
- `dist/personas/`: NPC personas: Sofia (social), Mr Penrose (terms, NW-176), Celeste (bonuses, NW-177), Pip (free spins, NW-178), Rex (competitions and records, NW-179) and Hollis (banking rules, NW-180). Functional NPCs are hotel staff (`STAFF` in `dist/characters.js`), stationed at a post and kept out of the resident simulation. `window.__grand` registers personas and loads a data snapshot for tests or console play.
- `dist/sofia.js`: Sofia's pure dialogue engine (intent matching, memory, moods, schemes, invitation gate). No DOM; deterministic with an injected rng.
- `dist/style.css`: phone/tablet/desktop layouts, landscape handling, safe areas and motion preferences.
- `tests/engine.test.mjs`: simulation, room connectivity, placement, payout and persistence coverage.
- `tests/reset.test.mjs`: returning-player welcome card and the two-step reset.
- `tests/sofia.test.mjs`: dialogue behaviour, invitation gate, persistence and a no-deposit-talk fuzz test.
- `tests/app.test.mjs`: a complete interactive user journey in LinkeDOM, with an injected animation clock and pointer coordinates.
- `tests/residents-store.test.mjs`: ten simulated minutes of autonomous behaviour, NPC conversations, purchase guards, identity options and save migration.
- `tests/social.test.mjs`: relationship and reward guards, both branches of both stories, save migration, gallery reachability and a ten-minute inter-room schedule simulation.
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

Real phone/browser acceptance remains outstanding. Automated mobile-input checks cover portrait and landscape camera framing, both joysticks and visual-viewport keyboard offset logic. CSS uses larger touch targets, 16px input text, scrollable story menus and a composer that lifts above an on-screen keyboard. These checks do not replace device QA.
