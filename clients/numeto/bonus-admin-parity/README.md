# BA Parity Extractor

Black-box field parity, Alpha (reference) vs Bravo. Replaces manual payload comparison.

## Run
```
npm install && npx playwright install chromium
npm run login        # headed; log into each system once -> out/auth/*.json
npm run extract      # visits each create page, dumps normalised fields -> out/extract/
npm run diff         # alpha vs bravo -> out/diff/parity.md (add / deprecate / drift / aligned)
```

## Verify before trusting it (do this first)
The worklist ships with `promotions` only-ish on purpose. Run extract+diff on it and
check the output against `field-parity-log.md` (hand-verified baseline). Fix the snapshot
parsing / selectors until the tool agrees with the baseline, THEN add modules. Don't scale
an unverified extractor.

## Extend
Add components to `worklist` in `config.js`. Dedupe by the route-map **Action** column —
shared components (Alpha's promotions/signup/new_depositor all use `CreateMethod`) extract
once. Set `referenceCasino` per system to hold `{casino?}` constant.

## What this covers vs doesn't
Covers the **declared FE schema**: field set, types, static-enum options/order, defaults,
client constraints, dynamic-vs-static select tagging, conditional hints.

Does NOT cover:
- **Validation rules** (server-side) — needs a fuzz pass (submit boundary values via the
  Livewire endpoint, capture validation effects).
- **Conditional/branch-only fields** — only fields in the initial DOM are caught. Exercise
  toggles (bonus type etc.) and re-extract to surface them.
- **API response-contract shape drift** (e.g. `deposit_count` array-vs-object, `schedule`
  `time_zone`/`monthly`) — a SEPARATE sweep: GET `api/{casino}/<module>` on both systems,
  3+ records chosen to populate nullable fields, infer schema (genson) and deepdiff.
  Forms give declared fields; payloads give realised shape — you need both. The promotions
  baseline was built from payloads, so wire this up next.

## Harden against the live DOM
- `unwrap()` in `lib/extract.js` handles v3 dehydrated tuples heuristically — verify against a
  real `wire:snapshot` and adjust.
- `searchable` heuristic for dynamic selects is a guess; confirm on the Campaign field.
