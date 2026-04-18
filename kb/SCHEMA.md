# Chief Scout KB Schema

## Purpose

`kb/` is Chief Scout's compiled football wiki layer.
It is not the raw-source archive and it is not an ungoverned RAG dump.

This file defines:

- what counts as a canonical KB page
- which metadata fields are required
- how pages should be named, linked, and cited
- which sections each page type must carry
- which pages are compiler-owned versus editorial

## Canonical Scope

Today, the canonical KB surface is whatever the current tooling can compile, index, lint, mirror, and retrieve consistently.

Current canonical categories are defined in `pipeline/lib/kb.py`:

- `players`
- `archetypes`
- `tactics`
- `clubs`
- `concepts`
- `queries`

Current canonical page path shape is:

`kb/<category>/<slug>.md`

Notes:

- `kb/INDEX.md` and every `kb/<category>/_index.md` are generated outputs. Do not hand-edit them.
- The current indexer only scans one level deep with `glob("*.md")`. Nested files such as `kb/concepts/<series>/...` are not treated as canonical indexed pages today.
- Proposed future categories such as `roles`, `personalities`, or dedicated `legends` pages are not canonical until `pipeline/lib/kb.py`, `pipeline/96_kb_index.py`, and downstream retrieval/publish tooling are updated to support them.

## Source Layers

The KB operates as three layers:

1. Raw sources
2. Compiled wiki
3. Schema, governance, and linting

Raw sources live outside `kb/`, primarily in:

- `docs/research/`
- `docs/Scouting/`
- `docs/formations/`
- database tables such as `people`, `player_profiles`, `player_status`, `player_market`, `player_personality`, `attribute_grades`, and related sources

Rules:

- raw sources are evidence inputs, not KB outputs
- preserve originals where possible
- do not paste entire source documents into canonical KB prose
- synthesize in `kb/`; preserve provenance in ledgers, comments, or explicit source lists

## Frontmatter Contract

All canonical KB pages must begin with flat frontmatter.

Important implementation constraint:

- the current parser in `pipeline/lib/kb.py` is intentionally simple
- frontmatter must stay flat, one key per line
- lists must be single-line bracket lists such as `[a, b, c]`
- do not use nested YAML, multiline values, or complex maps

### Required fields

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Human-readable page title |
| `category` | yes | Must match the containing canonical category |
| `tags` | yes | Flat list; use concise reusable descriptors |
| `updated` | yes | `YYYY-MM-DD` |
| `source` | yes | Current valid values in live corpus: `compiled`, `editorial`, `query` |
| `confidence` | yes | `low`, `medium`, or `high` |
| `summary` | yes | One-line synopsis used by indexes and retrieval |

### Optional fields

| Field | Use |
|---|---|
| `person_id` | Required on player pages when the page is backed by `people.id` |
| `backlinks` | Optional slug list for compiler-generated relationship hints |

### Field rules

- `title` should be the canonical subject name, not a marketing headline
- `category` must reflect placement and retrieval scope
- `tags` should support grouping, not become a source dump
- `updated` should reflect the last substantive content change, not an index rebuild
- `summary` should stay short enough for index tables and search snippets
- `backlinks` must only contain resolvable slugs; placeholder values such as `--` or `-` are invalid

## Filenames And Slugs

Canonical filenames must follow the same slug rules as `pipeline/lib/kb.py:slug()`:

- ASCII only
- lowercase
- words separated by `-`
- no spaces
- no duplicate suffixes such as ` 2.md`
- one canonical subject per file

Examples:

- `kb/players/antoine-semenyo.md`
- `kb/clubs/manchester-city.md`
- `kb/concepts/transfer-market-2025.md`

Invalid examples:

- `kb/players/Antoine Semenyo.md`
- `kb/players/antoine-semenyo 2.md`
- `kb/concepts/Transfer Market 2025.md`

## Linking Conventions

Chief Scout uses wiki-style internal links.

Rules:

- internal KB links should use `[[slug]]`
- when needed for readability, use `[[slug]] Display Name`
- link targets must match the target file slug, not the target title
- do not use placeholder links such as `[[--]]`, rendered em-dash placeholders, or `[[unknown]]`
- do not rely on nested concept paths for canonical linking until the indexer supports them

Examples:

- `[[striker]]`
- `[[manchester-city]] Manchester City`
- `[[transfer-market-2025]]`

## Ownership Rules

Some pages are compiler-owned and will be overwritten on rebuild unless the compiler explicitly preserves a block.

### Compiler-owned today

- most `players`
- `archetypes`
- most `clubs`
- most `tactics`
- generated index files

### Editorial or mixed ownership today

- `concepts`
- `queries`
- manually enriched sections that the compiler is documented to preserve

### Preservation rules

Currently, `pipeline/95_compile_kb.py` preserves these player-page blocks across recompiles:

- `<!-- BEGIN vertex-research --> ... <!-- END vertex-research -->`
- `<!-- BEGIN perplexity-research --> ... <!-- END perplexity-research -->`

Rules:

- do not assume other manual edits inside compiler-owned pages will survive a recompile
- if a manual section must survive recompiles, either add compiler support for it or use an explicitly preserved block
- do not hand-edit generated `_index.md` or `INDEX.md`

## Evidence And Citation Rules

KB pages should synthesize evidence, not simply restate a source.

Rules:

- every nontrivial claim should be traceable to structured DB evidence, raw research, a scouting note, or a grounded research block
- player pages should prefer an `Evidence Ledger` over vague unsupported claims
- concept, tactic, and query pages should name the key source set in a `Sources`, `Evidence`, or equivalent section
- low-trust sources must not drive core conclusions in the main prose
- if low-trust sources are filtered, note that filtering explicitly rather than silently mixing them into the synthesis
- preserve raw long-form material in research archives, not the main KB narrative

## Page Templates

Existing pages are uneven. The rules below are the target standard for all new pages and any page touched materially from this point forward.

### Players

Required:

- `## Overview`
- `## Snapshot`
- `## Role Fit`
- `## Valuation Range`
- `## Risk Flags`
- `## Evidence Ledger`

Strongly expected when evidence exists:

- `## In Possession`
- `## Out of Possession`
- `## Athletic Profile`
- `## Personality`
- `## Trait Ledger`

Allowed preserved sections:

- `## Research Notes`
- grounded research blocks under explicit HTML markers

Rules:

- player pages summarize the player; they do not redefine core football concepts inline
- link outward to archetype, club, and relevant tactic/concept pages where those canon pages exist
- `person_id` should be present for DB-backed players

### Archetypes

Required:

- opening definition or descriptor block
- `## Top Exemplars`

Recommended:

- `## Compound Archetypes`
- lineage notes
- role boundaries
- anti-patterns

Rules:

- archetypes define reusable football jobs and traits
- they should not depend on one exemplar to make sense

### Tactics

Required for new or rewritten pages:

- shape or system definition
- core principles
- role interactions
- historical context
- modern application notes
- related systems or player-role links

Legacy note:

- many current tactic pages are imported formation notes and do not yet meet this standard
- if a tactic page is touched materially, rewrite it toward the full schema rather than preserving the old dump shape

### Clubs

Required for new or rewritten pages:

- identity snapshot
- style or playing-model section
- recruitment pattern or squad construction context
- current squad or key profiles
- evidence note or source basis

Rules:

- club pages should explain style and context, not just list players

### Concepts

Required:

- clear definition
- why the concept matters
- how Chief Scout uses or should use it
- examples or boundary cases
- related pages
- sources or evidence

Rules:

- concepts should be canonical and reusable
- they should be link destinations for player, club, and tactic pages
- do not create concept pages that only make sense as a note about one player

### Queries

Required:

- question as title or heading
- `## Answer`
- `## Sources`

Rules:

- query pages are reusable synthesis outputs, not scratch notes
- promote only benchmark answers worth retrieving again

## Non-Canonical Content

These may exist in the repo, but they are not canonical until tooling is updated:

- nested KB markdown under category subdirectories
- experiment categories not present in `CATEGORIES`
- duplicate files created by Finder or manual copy workflows
- temporary research scratch pages that have not been normalized to canonical frontmatter and path rules

## Change Control

When adding a new page type, category, frontmatter key, or preserved block:

1. update this file
2. update compiler/indexer/lint tooling
3. record the change in `kb/LOG.md`
4. rebuild indexes
5. run KB lint checks
