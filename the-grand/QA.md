# Verification record

## Automated result

`npm run check` passes. `npm test` passes **111 checks**, including the pre-existing economy, Sofia, invitation and onboarding coverage, ten new social/travel checks, and complete DOM journeys through both new stories and token redemption.

Verified behaviour:

- NPC brain (`dist/npc-brain.js`): intents are classified by rules (ranked) and fuzzy example matching (stemming + synonyms, two-word overlap), returned as a ranked probabilistic decision. An external classifier can supply `{intent, p}` instead; the persona still writes every word. Responses carry conditions, effects, moods, flags and optional `action`s; lines are not repeated until a pool is exhausted.
- Sofia runs on it: 45 intents, 231 player-facing lines and 54 reactions to other residents. A held-out set of 32 unseen phrasings classifies at ≥90%. She is French: furious lines are in French with an English gloss, annoyed lines open with a French tic, delighted lines close with one, pet names include gendered chéri/chérie. She butts into nearby residents' conversations (cooldown, never mid-chat with you). The no-spending fuzz test now covers her reactions too.

- Returning players (an existing save at load) get a welcome-back card instead of the first-run concierge: continue, or check out and start over. Starting over takes a second tap (in the card, or Settings → Start over), wipes only `the-grand*` storage keys, blocks any re-save during the reload, then reloads (`tests/reset.test.mjs`).
- Sofia is now the hotel's most dangerous flirt: campy innuendo throughout, flirts back hard, plunging neckline, thigh slit, fishnets, pink boa and a wink. The no-deposit fuzz test still passes.

- First visit shows a one-time concierge card pointing at Sofia (go and meet her, or look around first) and nudges the chat button. Dismissing persists `intro`; older saves that already said hello skip it.
- Every resident talks inline: tapping one walks you beside them (same screen row), opens an in-scene talk bar, and their reply types out in a speech bubble above their head; your line appears above your avatar. Topic chips use each resident's own topics. Lines are also kept in the room's chat log. Walking away mid-conversation gets a parting line.
- Sofia is the resident con artist with her own dialogue engine (`dist/sofia.js`): she learns and needles your name, lies about who she is and can be caught out, gossips about the cast, runs a room-key con, remembers what you like and storms off when her patience runs out. Her memory persists under `the-grand-sofia-v1`. A fuzz test (2,400 replies) confirms she never mentions depositing, funding, paying or buying, and never echoes those words back.
- First evening onboarding: meet Sofia → win 2 rounds → simulated funding → claim The Grand Reserve → invite Sofia to 408. Steps derive from saved state; items are re-validated on load, so a tampered save cannot skip requirements.
- Sofia refuses to visit without The Grand Reserve; with it she accepts, you both head to 408, she walks in from the door and resumes the conversation, then leaves through it. Other residents you have met accept invitations freely. Visitors return to their own room if you leave the suite.

- Projection and inverse projection agree for every floor tile.
- All six rooms contain non-overlapping, in-bounds furniture. Every open floor tile and exit is reachable from spawn. Every interactive object can be approached.
- Tap movement changes the actual rendered avatar; approaching a machine opens its interface.
- Continuous and diagonal movement respect boundaries and furniture, including delayed-frame collision substeps.
- Both joystick modes move the rendered avatar and stop on release. A short touch in the floating zone remains tap-to-move.
- Five settled spins update credits, wins, rounds and unlocks. Every paytable tier and a loss debit once and return their documented payout. Insufficient balance cannot spin.
- Slot economy: one `PAYTABLE` drives outcomes, reel faces and paytable copy. Declared RTP 95% (hit rate 18.5%); a seeded 200k-spin session lands within 93–97% for both games. Reel faces always match what they pay, losing lines vary (20+ distinct), and a constant rng cannot hang the loss generator. Free top-ups only open below 100 credits.
- The second cabinet changes appearance and opens/plays Nova Nights. Its paytable matches its symbol set.
- The hotel directory changes into four actual navigable rooms with demo NPCs. Walking to an exit enters the gallery. Its five focusable doorways route the avatar to the selected destination.
- Scripted chat updates the social achievement and conversation.
- Placement preview rejects occupied/player/out-of-bounds/exit tiles and prevents sealing the exit. Existing furniture rotates, moves and removes correctly.
- Wall/floor choices and favourite cabinet update the actual scene and persist.
- Locked cosmetics remain unavailable. Earned cosmetics update both wardrobe and world avatar.
- Simulated funding grants one cosmetic once. Free virtual-credit refill is available without funding.
- Full saved state survives JSON restore, including an empty suite and a suite where the original spawn has been furnished.

## Resident, store and player-identity update

- All 20 profiles are unique adults, with five starting residents per original public room and 60 distinct authored topic responses.
- A seeded ten-minute simulation reaches all eight states: idle, walking, betting, talking, resting, browsing, skating and music. All 20 residents move without crossing furniture. Residents exchange directed conversations and independently settle virtual rounds without touching the player wallet.
- Player interruption releases an NPC's reserved cabinet and holds the conversation. NPC-to-NPC questions receive the matching peer topic response.
- The player can select Woman, Man or Neutral presentation, eight skin tones and eight hairstyles, at no cost. Their actual world avatar and wardrobe preview update together.
- All 13 store items charge once, save ownership and equip. Unknown items, insufficient funds and duplicate purchases do not debit credits. Store try-on uses the player's own appearance.
- Appearance, ownership, equipped purchases and acquaintances survive reload. Legacy saves retain prior room customizations and progress.
- The lobby contains an approachable physical boutique. Mobile Store and Residents controls open the catalogue and all 20 profiles.
- SVG contact sheets of the 20 residents, 24 player appearance combinations and all 13 store items were inspected for visual consistency. All 192 free presentation/skin/hairstyle combinations render without invalid values.

## Relationships, stories, travel and tokens

- Distinct topics grow saved connections; repeated greetings or topics cannot farm points or tokens. Friendship unlocks individual personal dialogue and remembered-topic greetings. Hosting and completing a story also build connections.
- Kit’s full four-stage DOM journey: Kit → Ada → gallery route board → Kit. Direct/scenic branches both persist, change the ending and later greeting, and grant the cruiser plus 8 tokens once.
- Noor’s full four-stage DOM journey: Noor → Farah → gallery archive → Noor. Chisholm/Hopper branches both persist and change the ending; completion triggers the music state with a visible saxophone, optional original tones, and the jazz pin plus 12 tokens once.
- Journal stage hints, current-location Find actions, saved-choice summaries, personal chats, boutique balances and token purchases work through the actual app DOM.
- Exploring and hosting milestones reconcile once, including prior saved progress. Every priced cosmetic offers a token alternative. Insufficient tokens, unknown items and duplicate purchases do not debit anything. Token purchases leave virtual game credits untouched.
- All gallery door pairs are reachable; both story objects can be approached. A separate seeded ten-minute travel simulation keeps all residents in bounds, moves at least 15 residents between public rooms, and leaves Sofia stationed in the lobby. Travel can be interrupted by a player conversation and does not run for suite visitors.
- Resident render membership and directory locations update when characters change rooms. Existing Sofia suite arrival/conversation/exit and invitation tests pass unchanged.
- Input viewport logic was exercised with a simulated visual viewport shrinking by 300px and restoring. New mobile rules provide larger touch targets, 16px text inputs, scrollable story panels, and a keyboard-aware composer. This is not an actual soft-keyboard or CSS layout test.

## Visual verification

The original SVG room renderer was rasterized and visually inspected for the suite, lobby, gold lounge, neon arcade, rooftop and the new gallery. The gallery render was inspected after moving a plant that obscured a doorway label. Representative scene crops were produced for the gameplay areas associated with:

| Device viewport | Gameplay area tested in the DOM camera harness |
| --- | --- |
| 375 × 812 portrait | 375 × 675 |
| 430 × 932 portrait | 430 × 795 |
| 768 × 1024 tablet | 688 × 948 |
| 1280 × 800 desktop | 909 × 724 |
| 812 × 375 landscape | 747 × 327 |

The camera harness verified that the avatar and head remain in its projected view. CSS supplies separate portrait, landscape and desktop layouts, compact navigation, scrollable dialogs and safe-area padding.

## Explicitly unverified

The supported browser-control skill was unavailable in this session. **No real browser interaction tests or CSS layout screenshots were performed.** LinkeDOM is a DOM implementation, not a browser layout engine. SVG renders are scene inspections, not screenshots of the webpage. Pointer capture, iOS Safari safe areas, native dialog focus, hit targets, landscape menu layout, frame rate and real touch hardware still require browser/device QA.

The application is implemented and automatically tested, but the handoff's real mobile-browser acceptance should not be treated as signed off until that pass is complete.
