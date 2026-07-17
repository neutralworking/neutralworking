# Promotions — Alpha ↔ Bravo field parity
_Generated 2026-07-17 from manual browser-console extraction_

## Extraction notes
- **Alpha** (bonus.chatwindow.info): Livewire v3. The extractor captures 12 **always-visible** form
  controls from the initial DOM. Conditional sub-fields (schedule body, CTA sub-fields, affiliate
  values, deposit-segment arrays, etc.) are hidden by AlpineJS `x-show`/`x-if` until their parent
  toggle is clicked — they do **not** appear in the path list. Full component state (60 keys) is
  read from `wire:snapshot` and used to identify those hidden fields.
- **Bravo** (bonus.scriptfork.com): Livewire v2. All 47 field paths captured from initial DOM
  (Bravo renders conditional sections server-side and always emits them).

---

## DRIFT — same concept, diverged implementation

### D1 · `region_filter` — option sets completely replaced
| | Alpha | Bravo |
|---|---|---|
| **Path** | `data.region_filter` | `region_filter` |
| **Type** | select | select |
| **Options** | 10 named region groups: Alex X-sell, Clara Inbrand, EU Fusion, EU Fusion_mal, EU LT/KC/MO/US/SD/MAL, Fusion ALL with Punt, Lucky Treasure, Malibu, TOP 10, US - Prague Team | 6 casino brands: A Big Candy+, Digits 7+, Heaps o Wins+, Reels Grande+, Sector 777+, Spin Dinero+ |

Region filter drives secondary casino checkboxes in both systems. The option values, IDs, and
grouping logic are entirely different — no mechanical mapping is possible. A Bravo migration would
need a new region-to-casino-ID mapping table.

---

### D2 · Casino selection model — regional arrays vs per-ID checkboxes
| | Alpha | Bravo |
|---|---|---|
| **Model** | 5 `casinos_region_N` arrays (`region_6` ×23, `region_10` ×4, `region_7` ×2, `region_3` ×2, `region_11` ×1) = **32 checkbox instances** across 5 region buckets | Flat `casino.{id}` checkboxes — **16 individual casino IDs** (14, 83, 84, 85, 87, 91, 92, 93, 95, 96, 103, 104, 105, 107, 112, 113) |

Alpha stores the selection as region arrays; Bravo stores it as individual numeric IDs. A saved
promotion's casino payload would need a translation layer if records ever needed to cross systems.

---

### D3 · `title` — path namespace (`data.*` → `item.*`)
| | Alpha | Bravo |
|---|---|---|
| **Path** | `data.title` | `item.title` |
| **Type** | text | text |
| **Constraints** | maxlength: 40 | maxlength: 40 |

Path namespace change only. Constraints are identical.

---

### D4 · `image` — path rename + type label mismatch
| | Alpha | Bravo |
|---|---|---|
| **Path** | `data.image` | `item.image` |
| **Alpha type** | `url` (HTML input[type=url]) | `text` (HTML input[type=text]) |

Same field, same purpose. Alpha enforces URL format at the browser level; Bravo does not. Both
accept free-form text in practice. Path rename only.

---

### D5 · `min_deposit` — path rename + **type drift** (text → number)
| | Alpha | Bravo |
|---|---|---|
| **Path** | `data.min_deposit` | `item.min_deposit` |
| **Alpha type** | `text` | `number` |

Bravo enforces numeric input at the client level; Alpha does not. A non-numeric value passes
Alpha's form validation but would fail server-side. Risk: data quality drift if Alpha payloads are
ever promoted to Bravo.

---

### D6 · `text` — path rename; Alpha type unclear
| | Alpha | Bravo |
|---|---|---|
| **Path** | `data.text` | `item.text` |
| **Alpha type** | `text` (extractor mapped it to text; actual element may be textarea — confirm) | `textarea` |

Functionally the same field. Verify Alpha's `<textarea wire:model="data.text">` is a real
`<textarea>` rather than a text input.

---

### D7 · `custom_promo_param` — path rename
| | Alpha | Bravo |
|---|---|---|
| **Path** | `data.custom_promo_param` | `item.custom_promo` |
| **Type** | checkbox (bool, default false) | checkbox |

Same toggle. Also affects the sub-fields: Alpha uses `data.custom_promo_data[N].{html,css,js}`;
Bravo uses `item.custom_promo_data.0.{html,css,js}` (index locked to 0 — single entry only).
Alpha supports an array of multiple custom promo entries; Bravo supports one.

---

### D8 · `cta` → `cta_param` — name drift
| | Alpha | Bravo |
|---|---|---|
| **Alpha path** | `data.cta` (bool, default false) | `cta_param` (checkbox) |

Same semantic purpose (enable/disable CTA block). The Alpha key is `cta`; Bravo follows the
`*_param` naming convention used by every other toggle.

---

### D9 · `campaign` — object in Alpha vs two flat fields in Bravo
| | Alpha | Bravo |
|---|---|---|
| **Alpha** | `data.campaign` — single object (expected shape: `{name, id}`) | `campaign_name` (text) + `campaign_id` (text) — two separate inputs |

Alpha stores campaign as a nested object in the wire model. Bravo exposes two flat text fields.
API payload shape may differ even if the rendered value is the same.

---

### D10 · `deposit_segments_param` — **one → three** (Alpha splits by segment type)
| | Alpha | Bravo |
|---|---|---|
| **Bravo** | `deposit_segments_param` — single checkbox | Three separate toggles: `deposit_segments_param_v1`, `deposit_segments_param_v2`, `deposit_segments_param_zar` |
| **Arrays** | n/a | `deposit_segments_v1`, `deposit_segments_v2`, `deposit_segments_zar` |

Alpha has differentiated deposit segment types (v1, v2, ZAR). Bravo collapses these into a single
undifferentiated toggle. A Bravo promotion using `deposit_segments_param` has no way to express
which variant it targets.

---

### D11 · `display_on` — flat array in Alpha vs structured page hierarchy in Bravo
| | Alpha | Bravo |
|---|---|---|
| **Alpha** | `data.display_on` — flat array, `display_on_param` toggle | `display_on_param` toggle + per-page keys: `display_on.page-{cashier, entry_page, ucc_promotions, ucc_lobby}` + sub-group toggles + 16 individual rtg_game_sub_groups/categories/themes checkboxes |

Alpha's display targeting is a flat list; Bravo's is a page-aware hierarchy with lobby sub-slots
(game sub-groups 1–12, categories 1–4, themes 1–2). The underlying data contract likely differs.

---

### D12 · `position`, `show_for_guest_users` — path namespace only
Both move from `data.*` (Alpha) to `item.*` (Bravo). No other changes.

| Alpha | Bravo |
|---|---|
| `data.position` | `item.position` |
| `data.show_for_guest_users` | `item.show_for_guest_users` |

---

## ALPHA-ONLY — fields not yet in Bravo

These keys exist in Alpha's component state. They are confirmed absent from Bravo's 47-field
extraction. Fields marked _(conditional)_ are hidden behind a toggle in Alpha's initial DOM but
present in the state; their Bravo equivalents may simply not have been extracted if they're also
conditional — verify by expanding the Bravo toggle.

### A1 · `priority` (bool, default false)
Promotion priority flag. No Bravo equivalent found. Likely controls display ordering or
preemption in the promotions feed.

### A2 · `client_type` (select, default "all")
Platform targeting. Options: `all`, `mobile-app`, `web`.
**No Bravo equivalent.** Bravo promotions apply to all platforms unconditionally.

### A3 · `deposit_date_param` + `deposit_date` _(conditional)_
New segmentation dimension: filter players by their deposit date history.
`deposit_date` shape: `[{ match_type: "include"|"exclude", type: "first_deposit_date"|..., operator: "within"|..., days, days_from, days_to }]`
**No Bravo equivalent.** Bravo has no deposit-date targeting.

### A4 · `deposit_count_param` + `deposit_count` _(conditional)_
New segmentation: filter players by number of deposits made.
`deposit_count` shape: `[{ from, to }]`
**No Bravo equivalent.** Bravo has no deposit-count targeting.

### A5 · `world_time`
Timezone selector associated with the schedule block. Sits alongside `schedule_param`.
**No Bravo equivalent.** Bravo's schedule presumably uses a server-side timezone or the `time_zone`
field embedded in `schedule` — confirm which.

### A6 · `associated_coupon_code_param` + `associated_coupon`
Link a promotion to an associated coupon code (distinct from the player-facing `coupon_param` /
`coupon_code`). **No Bravo equivalent.**

---

### Conditional sub-fields: parity unclear without toggle expansion
The following Alpha fields exist in the component state but are hidden behind toggles. Bravo has
the corresponding `_param` toggle, but the expansion sub-fields were not visible in the Bravo
initial DOM — they may exist as hidden Bravo fields that weren't captured, or they may genuinely
be absent. **Expand each toggle in Bravo's create form and re-extract to confirm.**

| Alpha field(s) | Bravo toggle | Status |
|---|---|---|
| `featured_promo` | `featured_promo_param` ✓ | Bravo sub-field not captured |
| `affiliate` `{include_id, exclude_id}` | `affiliate_param` ✓ | Bravo sub-fields not captured |
| `snapshot` `{type, snapshot, value}` | `snapshot_param` ✓ | Bravo sub-fields not captured |
| `terms` | `terms_param` ✓ | Bravo sub-field not captured |
| `coupon_code` | `coupon_param` ✓ | Bravo sub-field not captured |
| `cta_label`, `cta_action`, `cta_x_sell`, `cta_link`, `game_id` | `cta_param` ✓ | Bravo sub-fields not captured |
| `player_class_ids` | `player_class_param` ✓ | Bravo sub-field not captured |
| `signup_date` `{match_type, operator, days, days_from, days_to}` | `signup_date_param` ✓ | Bravo sub-fields not captured |
| `schedule` `{repeat_param, start_at, end_at, start_time, end_time, recurrence, weekly_start_time, weekly_end_time, monthly, time_zone, countdown}` | `schedule_param` ✓ | Bravo sub-fields not captured |
| `initial_prize_pool`, `current_prize_pool`, `interval_min`, `interval_max` | `prize_pool_param` ✓ | Bravo sub-fields not captured |
| `deposit_segments_v1`, `_v2`, `_zar` (arrays) | three `_param` toggles | Bravo has one toggle; sub-field content unknown |

---

## BRAVO-ONLY — deprecation candidates / Bravo-specific

Fields present in Bravo's 47-entry extraction that have no Alpha equivalent. Not necessarily to be
removed — some may be Bravo-specific constraints the platform requires.

### B1 · `exclude_param`
Player exclusion toggle. Not seen in Alpha's component state at all (not even as a hidden key).
If Alpha achieves exclusion through the `snapshot` mechanism, these are functionally equivalent
but structurally separate. Verify before deprecating.

### B2 · `item.hide_logged_out`
Hides the promotion from logged-out users. Related to Alpha's `show_for_guest_users` (inverted
logic: Alpha enables guest visibility, Bravo hides from logged-out). These are two different
controls encoding the same concept with opposite polarity. Only Bravo has the explicit hide toggle
as a first-class field.

### B3 · `display_on.page-*` and `rtg_game_*` hierarchy
Bravo exposes granular display-location controls not present in Alpha:

| Bravo field | Description |
|---|---|
| `display_on.page-cashier` | Show in cashier |
| `display_on.page-entry_page` | Show on entry page |
| `display_on.page-ucc_promotions` | Show on UCC promotions page |
| `display_on.page-ucc_lobby` | Show in UCC lobby |
| `display_on.page-ucc_lobby.rtg_game_sub_groups` + `.rtg_game_sub_groups.{1–12}` | Lobby sub-group targeting (10 sub-groups) |
| `display_on.page-ucc_lobby.rtg_game_categories` + `.rtg_game_categories.{1–4}` | Lobby category targeting |
| `display_on.page-ucc_lobby.rtg_game_themes` + `.rtg_game_themes.{1,2}` | Lobby theme targeting |

Alpha's `display_on` is a flat array — it either encodes these concepts as values in the array, or
this granularity doesn't exist on Alpha yet.

---

## ALIGNED — same concept, same behavior

| Alpha path | Bravo path | Type | Notes |
|---|---|---|---|
| `data.title` | `item.title` | text | maxlength:40 on both (see D3) |
| `data.featured_promo_param` | `featured_promo_param` | checkbox | param toggle aligned; value field unknown (see conditional table) |
| `data.player_class_param` | `player_class_param` | checkbox | param toggle aligned |
| `data.affiliate_param` | `affiliate_param` | checkbox | param toggle aligned |
| `data.snapshot_param` | `snapshot_param` | checkbox | param toggle aligned |
| `data.terms_param` | `terms_param` | checkbox | param toggle aligned |
| `data.coupon_param` | `coupon_param` | checkbox | param toggle aligned |
| `data.signup_date_param` | `signup_date_param` | checkbox | param toggle aligned |
| `data.schedule_param` | `schedule_param` | checkbox | param toggle aligned |
| `data.prize_pool_param` | `prize_pool_param` | checkbox | param toggle aligned |
| `data.display_on_param` | `display_on_param` | checkbox | param toggle aligned; structure diverges (D11) |
| `data.position` | `item.position` | select | same options (Top/Bottom); path rename only (D12) |
| `data.show_for_guest_users` | `item.show_for_guest_users` | checkbox | path rename only (D12) |
| `data.custom_promo_data[N].html` | `item.custom_promo_data.0.html` | textarea | both present; Alpha supports multiple entries, Bravo one (D7) |
| `data.custom_promo_data[N].css` | `item.custom_promo_data.0.css` | textarea | same |
| `data.custom_promo_data[N].js` | `item.custom_promo_data.0.js` | textarea | same |

---

## Summary table

| Category | Count | Key items |
|---|---|---|
| **Drift** | 12 | region_filter options, casino model, namespace changes, type mismatches, campaign flattening, deposit-segments split, display_on hierarchy |
| **Alpha-only (add to Bravo)** | 6 confirmed + 10 unconfirmed conditional | priority, client_type, deposit_date, deposit_count, world_time, associated_coupon |
| **Bravo-only (review for deprecation)** | 3 groups | exclude_param, hide_logged_out, display_on page/rtg hierarchy |
| **Aligned** | 16 | All `_param` toggles, position, show_for_guest_users, custom_promo sub-fields |

---

## Next steps

1. **Expand every Bravo toggle** on the create form and re-run the console extractor to capture
   conditional sub-fields — this will resolve the 10 "parity unclear" rows.
2. **API payload sweep**: GET `/api/{casino}/promotions` on both systems, pull 3+ records, compare
   realised JSON shape. Form fields tell you what's declared; payloads tell you what's stored.
   Especially important for `campaign`, `deposit_segments`, `display_on`, and `schedule`.
3. **D10 (deposit segments)**: decide whether Alpha's v1/v2/ZAR split needs to be backported to
   Bravo or if Bravo's single toggle is intentionally simpler.
4. **D2 (casino model)**: map Alpha region IDs to Bravo casino IDs — required before any data can
   be shared across systems.
5. **B2 (hide_logged_out vs show_for_guest_users)**: confirm whether these are intended to be the
   same control with inverted polarity, or distinct features.
