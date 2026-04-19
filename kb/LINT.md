# Chief Scout KB Lint

## Purpose

KB lint protects the compiled wiki from drifting into an unusable corpus.

Lint is not just markdown hygiene.
It is the enforcement layer for:

- link integrity
- page uniqueness
- source quality
- evidence freshness
- canonical path rules
- retrieval-readiness

## Current Scope

Today, the canonical lint surface is:

- top-level markdown pages at `kb/<category>/*.md`
- categories currently declared in `pipeline/lib/kb.py:CATEGORIES`

Important constraints:

- `_index.md` and `INDEX.md` are generated outputs
- nested markdown under category subdirectories is not in canonical index scope today
- pages outside canonical categories may exist, but should be treated as noncanonical until tooling is updated

## Severity Model

### Fail

These should block a KB release, mirror publish, or search re-import when introduced by a new change:

- broken internal wiki links
- placeholder internal links such as `[[--]]` or rendered em-dash placeholders
- duplicate canonical files for the same subject
- filenames with copy suffixes such as ` 2.md`
- canonical pages outside the supported path shape `kb/<category>/<slug>.md`
- manual edits to generated index files

### Warn

These do not always block immediately, but must be tracked and should be improved on each KB session:

- orphan concept pages with no inbound links
- stale pages whose evidence is materially out of date
- player pages that never link out to canon pages
- club pages without style identity or tactical context
- legend/reference pages without lineage or comparison anchors
- low-trust sources appearing in the main prose rather than a filtered or explicitly caveated block

## Baseline On 2026-04-18

Current known state after governance was added:

- `python3 pipeline/96_kb_index.py --stats` scanned 22,405 top-level canonical articles
- the same run reported 10,959 broken backlinks
- the sample output shows many placeholder-style missing targets, including rendered em-dash placeholders
- `find kb -type f -name '* 2.md'` returns a large set of duplicate player pages
- Linear issue `CS-142` recorded about 101 KB import/index hygiene failures driven by duplicate filenames and concept-path issues

This means the KB is operational, but it is not clean.
Lint now exists to stop that debt from compounding further.

## Required Checks

### 1. Broken backlink check

Policy:

- every `[[slug]]` link in canonical pages must resolve to an existing canonical slug
- placeholder values are invalid even if the compiler emitted them

Current command:

```bash
python3 pipeline/96_kb_index.py --stats
```

Pass condition:

- zero broken backlinks

### 2. Duplicate file check

Policy:

- there must be one canonical page per subject
- Finder-style or manual-copy suffixes are invalid in canonical KB

Current command:

```bash
find kb -type f -name '* 2.md' | sort
```

Pass condition:

- no results

### 3. Canonical path check

Policy:

- canonical KB pages must live at `kb/<category>/<slug>.md`
- nested markdown is noncanonical until the indexer and downstream tooling support recursion

Current command:

```bash
find kb -mindepth 3 -type f -name '*.md' | sort
```

Pass condition:

- either no nested markdown exists, or every nested file is explicitly treated as noncanonical working material

### 4. Placeholder link check

Policy:

- rendered em-dash placeholders, `[[--]]`, `[[none]]`, and similar placeholders are lint failures

Suggested command:

```bash
rg -n '\[\[(--|none|unknown)\]\]' kb
```

Note:

- use `python3 pipeline/96_kb_index.py --stats` as the primary detector for rendered em-dash placeholder variants that may not be practical to grep for in ASCII-only tooling docs

Pass condition:

- no matches

### 5. Source-quality check

Policy:

- low-trust domains must not drive main-body conclusions
- if low-trust sources are mentioned, they should appear only as filtered/excluded references or explicitly caveated evidence

Suggested command:

```bash
rg -n 'tribuna\\.com|breakingthelines\\.com|thetitansfa\\.com' kb
```

Pass condition:

- no low-trust domains in canonical main prose

### 6. Staleness check

Policy:

- `updated` dates should reflect substantive freshness
- concept, tactic, and club pages older than 90 days should be reviewed if they remain high-traffic or strategically important
- player pages enriched with grounded web research should be refreshed when the competitive or medical state has clearly moved

Current support:

- `kb/INDEX.md` already exposes stale pages via the 30-day threshold in `pipeline/lib/kb.py`

Pass condition:

- no strategically important canon page should remain stale without an explicit reason logged in `kb/LOG.md`

### 7. Canon-link coverage check

Policy:

- player pages should link to reusable canon pages rather than redefining concepts locally
- because concept canon is still sparse, this is a warning today, not a blanket fail

What to look for:

- player pages with only club/archetype links and no concept or tactic links
- concept pages with no inbound links
- club pages with no links to style, tactic, or player exemplars

## Working Rules

Run lint after:

- any KB compiler change
- any batch import or grounded-research run
- any large editorial concept/tactic update
- any mirror publish or Vertex re-import candidate

Minimum post-change workflow:

1. Rebuild indexes.
2. Run KB stats.
3. Sweep for duplicate filenames.
4. Sweep for placeholder links.
5. Record any accepted exceptions in `kb/LOG.md`.

## Exception Policy

Sometimes the KB will ship with known debt.
That is acceptable only if the debt is explicit.

Rules:

- every accepted lint exception must be noted in `kb/LOG.md`
- log the exact failure mode, not a vague summary
- temporary exceptions should have a concrete next action
- new work must not increase an existing failure class without also recording it

## Automation

The first automation pass now exists:

```bash
python3 pipeline/tools/kb_lint.py
```

Useful variants:

```bash
python3 pipeline/tools/kb_lint.py --max-per-check 5
python3 pipeline/tools/kb_lint.py --json
python3 pipeline/tools/kb_lint.py --stale-days 120
```

Current automated checks:

- backlink validation
- placeholder-link detection
- duplicate copy-suffixed filename checks
- noncanonical nested markdown reporting
- required frontmatter checks
- category mismatch checks
- low-trust source scans
- stale-page reporting for concepts, tactics, and clubs
- page-type heading checks for current high-signal categories
- orphan concept and weak player canon-link coverage warnings

Still worth improving later:

- distinguishing accepted noncanonical nested KB workspaces from accidental path drift
- deeper source-quality parsing beyond domain scans
- more nuanced legend/reference lint once that page class is canonical
