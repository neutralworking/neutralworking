# Verification record

## Automated result

`npm run check` passes. `npm test` passes **54 checks**, including the parent integration case (36 simulation/art checks and 17 DOM journey subchecks).

Verified behaviour:

- First visit shows a one-time concierge card (say hello to a guest, or look around first) and nudges the chat button. Dismissing persists `intro`; older saves that already said hello skip it.
- Projection and inverse projection agree for every floor tile.
- All five rooms contain non-overlapping, in-bounds furniture. Every open floor tile and exit is reachable from spawn. Every interactive object can be approached.
- Tap movement changes the actual rendered avatar; approaching a machine opens its interface.
- Continuous and diagonal movement respect boundaries and furniture, including delayed-frame collision substeps.
- Both joystick modes move the rendered avatar and stop on release. A short touch in the floating zone remains tap-to-move.
- Five settled spins update credits, wins, rounds and unlocks. Every paytable tier and a loss debit once and return their documented payout. Insufficient balance cannot spin.
- Slot economy: one `PAYTABLE` drives outcomes, reel faces and paytable copy. Declared RTP 95% (hit rate 18.5%); a seeded 200k-spin session lands within 93–97% for both games. Reel faces always match what they pay, losing lines vary (20+ distinct), and a constant rng cannot hang the loss generator. Free top-ups only open below 100 credits.
- The second cabinet changes appearance and opens/plays Nova Nights. Its paytable matches its symbol set.
- The hotel directory changes into four actual navigable rooms with demo NPCs. Walking to the exit opens the directory.
- Scripted chat updates the social achievement and conversation.
- Placement preview rejects occupied/player/out-of-bounds/exit tiles and prevents sealing the exit. Existing furniture rotates, moves and removes correctly.
- Wall/floor choices and favourite cabinet update the actual scene and persist.
- Locked cosmetics remain unavailable. Earned cosmetics update both wardrobe and world avatar.
- Simulated funding grants one cosmetic once. Free virtual-credit refill is available without funding.
- Full saved state survives JSON restore, including an empty suite and a suite where the original spawn has been furnished.

## Visual verification

The original SVG room renderer was rasterized and visually inspected for the suite, lobby, gold lounge, neon arcade and rooftop. Representative scene crops were produced for the gameplay areas associated with:

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
