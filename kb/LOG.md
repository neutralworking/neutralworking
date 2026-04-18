# Chief Scout KB Log

## Purpose

This file is the operating log for material KB-level changes.

Log here when a change affects one or more of:

- raw-source ingest
- KB compilation rules
- new page categories or templates
- grounded research enrichment
- retrieval/indexing infrastructure
- mirror publishing
- lint baselines or known exceptions

Do not log every typo fix or one-off player edit.
Log batches, workflow changes, structural migrations, and noteworthy quality events.

## Entry Format

Each entry should capture:

- date
- change summary
- inputs or source surfaces touched
- outputs created or refreshed
- unresolved issues or follow-up required

## Pre-Log Baseline

This state already existed before formal KB governance was written:

- `pipeline/95_compile_kb.py` compiles KB pages from DB data plus raw docs
- `pipeline/96_kb_index.py` rebuilds `kb/INDEX.md` and per-category `_index.md`
- `pipeline/93_embed_reports.py` can embed `kb_article` into retrieval chunks
- mirror publishing exists via `pipeline/97_export_kb_mirror.py` and `scripts/sync_neutralworking_kb.sh`
- the KB was already acting as a compiled wiki layer, but without an explicit schema/log/lint contract

## Log

| Date | Change | Inputs | Outputs | Unresolved / Follow-up |
|---|---|---|---|---|
| 2026-04-17 | `CS-133` recorded a KB expansion for role and personality pages | Linear issue `CS-133`; `pipeline/95_compile_kb.py` branch work | Linear reports 16 personality pages and 42 role pages were compiled | Current repo state on 2026-04-18 does not list `roles` or `personalities` in `pipeline/lib/kb.py:CATEGORIES`, and those directories are not part of the canonical indexed surface. Reconcile the issue output with repo reality before treating those categories as canonical. |
| 2026-04-18 | `CS-142` shipped Vertex AI Search and grounded player research | `pipeline/94_vertex_player_research.py`, `pipeline/97_kb_to_gcs.py`, `pipeline/98_vertex_datastore.py`, Vertex Search infra | Vertex-backed KB retrieval live; grounded `vertex-research` blocks added to player pages; compiler updated to preserve `vertex-research` and `perplexity-research` blocks on recompile | Linear notes roughly 101 indexing hygiene failures caused by space-suffixed duplicate filenames and concept-path issues. These are now first-class lint targets. |
| 2026-04-18 | KB governance layer formalized from `docs/plans/KB_OPERATING_SPEC.md` | Operating spec, current compiler/indexer behavior, current KB corpus, Linear KB issues `CS-133` and `CS-142` | Added `kb/SCHEMA.md`, `kb/LOG.md`, and `kb/LINT.md`; recorded the first explicit maintenance rules for canonical categories, frontmatter, compiler ownership, and lint policy | Next step is automation: codify lint checks in a dedicated script, then create/fetch workstreams for analytics canon, tactical canon, scouting report schema, role hydration, and legend hydration. |
| 2026-04-18 | First explicit lint baseline captured under governance | `python3 pipeline/96_kb_index.py --stats`; file-system sweep for `* 2.md` duplicates | Baseline on 2026-04-18: 22,405 canonical top-level articles scanned; 10,959 broken backlinks reported; many duplicate player files with ` 2.md` suffixes remain in-tree | Bucket broken-link causes, remove duplicate canonical pages, and resolve nested/noncanonical concept content before treating KB lint as passable. |
| 2026-04-18 | Initial KB lint automation landed | `pipeline/tools/kb_lint.py`; governance rules in `kb/SCHEMA.md` and `kb/LINT.md` | Added a reusable CLI that checks broken links, placeholder links, duplicate filenames, noncanonical nested markdown, required frontmatter, stale canon pages, low-trust domains, and basic schema coverage | The script surfaces current debt but does not yet auto-classify accepted nested workspaces or perform deep semantic source review. Keep expanding it as the canon matures. |
| 2026-04-18 | Fixed missing-archetype placeholder link emission in player compiler output | `pipeline/lib/kb.py`; bulk cleanup of existing `kb/players/*.md` outputs | Missing archetypes now render as plain `—` instead of `[[—]]`; 6,705 existing player pages were normalized in-place; KB lint fail count dropped from 11,164 to 4,459 by removing the entire placeholder-link failure class | The underlying remaining KB debt is now concentrated in real broken links, duplicate copy-suffixed files, and shallow canon coverage rather than compiler-emitted placeholder links. |
| 2026-04-18 | Cleared duplicate HoF overlays and residual broken backlinks | `pipeline/lib/kb.py`, `pipeline/95_compile_kb.py`, `pipeline/tools/kb_lint.py`; bulk KB cleanup pass over canonical articles | Club and archetype renderers now link only to existing player pages; player compiler now preserves `hof-enrichment` blocks; 96 Hall of Fame overlay files were merged into canonical player dossiers, 4 stale duplicate compiled files were removed, and malformed imported wikilinks were downgraded or canonicalized across 77 KB articles | KB lint now reports **0 fails**. Remaining debt is warning-level only: shallow club pages, missing player-schema sections, low-trust source mentions, nested noncanonical concept files, sparse inbound links for concepts, and weak canon-link coverage across the player corpus. |
| 2026-04-18 | Collapsed the remaining KB warning backlog to a single known nested-workspace exception | `pipeline/lib/kb.py`, `pipeline/95_compile_kb.py`, `pipeline/96_kb_index.py`, `pipeline/tools/kb_lint.py`; bulk migrations over `kb/players`, `kb/clubs`, and `kb/concepts` | Player compiler now emits canon-context links, fallback snapshots, fallback evidence ledgers, market-context links, and cleaner freeform-note sanitization; club compiler now emits identity sections and sanitizes null squad cells; 18,275 player pages and 284 legacy club pages were normalized in-place; concept pages were rewired from filesystem markdown links into canonical wiki links; final baseline is `0 fails / 2 warns`, with both warnings coming from `kb/concepts/inverting-the-role/*` nested noncanonical files | Decide whether `kb/concepts/inverting-the-role/` should move out of canonical KB paths or become an explicitly allowlisted noncanonical workspace in lint/governance docs. |
| 2026-04-18 | Moved the `Inverting the Role` series out of `kb/` and into the blog workspace | `blog/inverting-the-role/*`, `apps/web/src/app/blog/kb-loader.ts`, `pipeline/96_kb_index.py`, `pipeline/tools/kb_lint.py` | The series now lives under `blog/inverting-the-role/`; the `/blog` loader reads from the new path; the old nested `kb/concepts/inverting-the-role/` workspace was removed; KB lint baseline is now `0 fails / 0 warns` | If the series grows, consider a dedicated blog schema and loader instead of continuing to reuse the KB-style frontmatter subset. |

## Open KB Risks

These are active operating risks until closed out in future log entries:

- tactics canon is still mostly a formation library rather than a richer tactical concept mesh
- role/personality category status is inconsistent between Linear history and current repo/tooling
