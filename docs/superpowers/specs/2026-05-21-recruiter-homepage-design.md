# Recruiter homepage — design

**Date:** 2026-05-21
**File touched:** `index.html` (single static page; no build step)
**Related Linear:** NW-66 (Job search — find new role / raise take-home, Urgent, focus/now)

## Why

Luke is in an 8–12 week, runway-constrained job search (Senior PO permanent / Lead PO / B2B contract). The current `index.html` reads as an indie-maker portfolio ("creative systems & digital infrastructure") with no role framing, no LinkedIn link, no contact CTA, and 7 mixed-relevance project tiles. Recruiters who land on `neutralworking.com` from LinkedIn or a CV header don't get the signals they need in the first 2 seconds: role, availability, and a way to act.

This change reframes the homepage as the recruiter landing while preserving the same aesthetic and most of the existing structure.

## Approach

**Layer, don't replace.** Keep the existing dark / `#00ff88` / JetBrains Mono / grid-background / glow-orb / cursor-glow look. Keep the `Luke Warrington` logo line and `neutral.working` brand mark. Only the tagline and project grid change. The page stays a single self-contained HTML file with inlined CSS/JS.

This means non-recruiter visitors still get a recognisable site, and the brand identity isn't sacrificed to the job search.

## Positioning decisions

| Decision | Outcome | Rationale |
|---|---|---|
| Industry framing in hero | **Industry-neutral** | Mirrors LinkedIn rewrite, doesn't filter out wildcards (Veeva, SAP). Domain only surfaces via CV/LinkedIn click-through. |
| Mid-section between hero and grid | **None** | Hero → grid directly. Recruiters who need context click the CTAs; anything between dilutes the scan. |
| CV button | **Skipped** | LinkedIn carries that load. One fewer asset to maintain. |
| Email CTA | `luke@neutralworking.com` | Same as existing footer; matches the domain. |
| LinkedIn CTA | Placeholder `{{LINKEDIN_URL}}` | User swaps before publishing. |
| Project grid scope | **Filter 7 → 4** | Drop Kickoff Clash, Chat, n8n. Keep Soft Power, Studio, Knowledge Base, Chief Scout. |
| Studio handling | **Link anyway, mark WIP** | Studio is currently broken end-to-end. Amber dot signals in-progress; link stays. Studio fix is **out of scope** of this work. |

## Concrete changes to `index.html`

### 1. Hero block

Replace the existing tagline:

```html
<p class="tagline cursor-blink">creative systems &amp; digital infrastructure</p>
```

With a role hero + CTA row:

```html
<h2 class="role">Senior Product Owner</h2>
<p class="tagline cursor-blink">Data-rich products. Hands-on with the tech that ships them.</p>

<div class="ctas">
  <a class="cta" href="{{LINKEDIN_URL}}">LinkedIn</a>
  <a class="cta" href="mailto:luke@neutralworking.com">Email</a>
</div>
```

- `Luke Warrington` logo line and `neutral.working` h1 remain unchanged above this block.
- `cursor-blink` class moves from the old tagline to the new tagline so the terminal cursor sits at the end of the pitch line.
- New `.role` element styled smaller than `h1`, larger than `.tagline` — sits visually between them.
- `.ctas` is a flex row of two buttons styled in the existing accent language (subtle outlined buttons, hover lifts to filled / accent text). No new colours, no new fonts.
- CTAs sit above the `selected work` label (see §3), where the tagline used to lead straight into the grid.

### 2. Project grid

Filter and relabel:

```html
<div class="projects">
  <a class="project" href="https://softpower.neutralworking.com">
    <div class="project-name"><span class="project-status live"></span>Soft Power</div>
    <div class="project-type">interactive literature</div>
  </a>
  <a class="project" href="/studio/">
    <div class="project-name"><span class="project-status wip"></span>Studio</div>
    <div class="project-type">AI content pipeline</div>
  </a>
  <a class="project" href="/kb/">
    <div class="project-name"><span class="project-status live"></span>Knowledge Base</div>
    <div class="project-type">scouting reference</div>
  </a>
  <a class="project" href="https://scout.neutralworking.com">
    <div class="project-name"><span class="project-status wip"></span>Chief Scout</div>
    <div class="project-type">AI data product</div>
  </a>
</div>
```

Changes vs current:

- **Dropped:** Kickoff Clash, Chat, n8n.
- **Studio:** status dot `live` → `wip`; type `language tidbits` → `AI content pipeline`. Link unchanged.
- **Chief Scout:** type `internal tool` → `AI data product`. Status, link unchanged.
- **Soft Power, KB:** unchanged.

Order: Soft Power, Studio, KB, Chief Scout (same relative order as today, with the dropped tiles removed in place).

### 3. Section label above the grid

Add a small "selected work" label above the grid so the recruiter understands what they're seeing (today it has no label).

```html
<div class="section-label">selected work</div>
```

Styled the same as the existing `.tagline` / `.project-type` (dim, uppercase, letter-spaced).

### 4. Footer

Remove the `admin` link. Result:

```
writing · github · contact
```

`writing` and `contact` already cover what a recruiter needs from the footer. `admin` is internal-only and shouldn't be advertised.

### 5. Status dot for Studio

The `.wip` class already exists (used for Kickoff Clash and Chief Scout). Studio just switches class. No CSS additions.

## CSS additions (new only)

- `.role` — role label between `h1` and `.tagline`.
- `.ctas` — flex row, gap, top margin.
- `.cta` — outlined button in the accent language, hover transitions match existing `.project` hover style.
- `.section-label` — uppercase / dim / letter-spaced, sits above the project grid.

All inlined in the existing `<style>` block. No new fonts. No new colours. No new external assets.

## Out of scope

- Fixing Studio. Tracked separately; the WIP dot reflects current reality.
- CV PDF asset. Decided in brainstorming that LinkedIn carries this; revisit if a recruiter explicitly asks.
- Any aesthetic shift away from the dark / green-terminal look. The aesthetic IS the "hands-on with the tech that ships them" signal.
- The KB and Chief Scout subdomains themselves. They are linked as-is.
- Mobile-specific polish beyond what the existing `@media (max-width: 480px)` block already does (CTA row stacks naturally on small screens).

## Open items before publish

- Real LinkedIn URL replaces `{{LINKEDIN_URL}}`.
- Manual eyeball check on a phone (the CTA row + new hero stack matters at narrow widths).

## Success criteria

A recruiter landing on `neutralworking.com` from a LinkedIn header or CV link can, within ~2 seconds:

1. See that Luke is a Senior Product Owner.
2. See exactly two ways to act (LinkedIn, Email).
3. See four pieces of supporting work below, three of which read as serious product/data work.

Non-recruiter visitors still see the same brand mark, same aesthetic, same shipping projects — just a tighter selection.
