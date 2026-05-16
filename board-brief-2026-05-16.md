# Board brief — 2026-05-16

Period: 2026-04-18 → 2026-05-16 (4 weeks). Audience: self-board. Operator: Luke (sole).
Sources: Linear (Neutral Working + Chief Scout teams), repo CLAUDE.md context.
Synthesised from four agent perspectives (CEO, COO, CPO, CFO).

## Executive summary

The company quietly changed shape this period. Chief Scout's launch was honestly redefined ("code in prod ≠ launched", CS-430) after 12 days at zero signups, and Neutral Working was reframed from "studio brand" to "fractional PO services business" with five priced offers and a 15-chunk implementation plan landed today (NW-15, NW-37 → NW-51). Strategic clarity is up; execution surface is wider, not narrower. Planning velocity is high — execution velocity is effectively zero across both flagship umbrellas: 1 of 30 NW children Done, 0 In Progress; CS-430's three core children aren't even ticketed yet with four weeks to a 2026-06-11 due date. The next session must convert the planning blitz into shipped surface or this becomes the pattern.

## What shipped

- **NW-32** Founder/PO Daily Brief workflow (dogfood) — built and shipped same day, 2026-05-16. The same Chief-of-Staff pattern that generated this brief.
- **CS-241** Remove level from public view — BRS becomes the single number (2026-04-28).
- **CS-245** Level-hide across OTP, Hall of Fame, KC, Fixtures, Shortlists (2026-04-21).
- **CS-263** Gate /transfers and /kickoff-clash off prod (2026-04-22).
- **CS-266** Prod gate leak fix — /admin, /editor, /squad returning 200 (2026-04-23).
- **CS-230** Production smoke test: full funnel anonymous → paid (2026-04-24).
- **CS-33** Rerun Gaffer question generator (2026-04-29).
- CS-68, CS-69 KC v2 polish/theme **cancelled** as KC moved to its own standalone repo (2026-04-16).
- Plus all 15 deployment children of CS-224 Launch Control closed before CS-430 was filed.

## Strategic shifts this period

- **NW reframed as a fractional PO services business** (NW-15, 2026-05-16). Five priced offers, AI Operations + n8n/Automation as headline differentiators, public starting prices, £600/day floor. Positioning: "Fractional Product Owner who builds the systems, not just the specs."
- **"AI C-Suite Advisory Layer" considered and rejected** as a service tier (NW-15 decision log, 2026-05-16). Good ideas absorbed into AI Ops Weekly Exec Brief (NW-18) and Founder Weekly Brief (NW-35). CEO/CFO/CMO/COO agents permanently rejected. CPO specialist agent held as V2 only (NW-36). Strong scope discipline signal.
- **"Launched" honestly redefined** (CS-430, 2026-05-11). Exit criteria now require legal compliance, verified non-operator traffic, distribution activated, and first N real signups — not just code in prod. This corrects the CS-224 false-launch pattern.
- **Kickoff Clash promoted to its own NW product line** (2026-05-11), with a v2 pivot from gacha to fixed 25-card starter deck + Balatro-flavoured roguelike (CS-423). Spec exists, no builder.
- **Display ads ruled out on Chief Scout** (CS-256, 2026-04-22). Free → Scout paid conversion is now the sole monetisation lever.
- **Portfolio sprawl made explicit** (NW-9, 2026-05-11). neutralworking.com should surface every NW project, but NW-31 (single site vs subdomain split) is still open — three product framings now claim the same URL.

## Cross-perspective recommendations

> Cap 5. CEO / COO / CPO / CFO agreement noted where it exists; disagreement surfaced.

1. **Resolve NW-31 (domain split) this week before any NW-15 implementation chunk ships.**
   Suggested split: `neutralworking.com` = NW-15 services site as the single wedge; portfolio (NW-9) becomes `/work` or `work.neutralworking.com` once more than one product tile is credibly live; `chief-scout.com` stays as-is. Three framings on one URL is not a v1.
   Evidence: NW-9 (focus/next) and NW-15 (High) both target the same domain; NW-31 explicitly listed as outstanding; 15 implementation chunks (NW-37 → NW-51) already cut without this decision.
   Confidence: **high**. Raised by: **all four agents** (consensus).

2. **Close the four gating decisions (NW-27 NDA, NW-28 pricing floor, NW-34 pricing model + currency, NW-29 hero copy) in a single 60–90 min decision-only session.**
   These gate D2/D3/D4 of the NW-15 critical path. Luke is sole decider on all four; sequencing them costs more than batching them.
   Evidence: NW-15 description lists all four as "Decisions outstanding (gating)"; all four are High priority except NW-29; case-study credibility (NW-27) is the highest-leverage credibility lever after the NW-32 dogfood.
   Confidence: **high**. Raised by: **all four agents** (consensus).

3. **Convert CS-430's three "CS-XXX" placeholders into real tickets with owners and acceptance criteria within 48 hours, OR slip the 2026-06-11 due date.**
   The umbrella exists but the actual work (Product Readiness Audit, GDPR + legal, Distribution plan v2) isn't tracked. Four weeks to deadline with the work uncreated is the exact failure mode that produced the CS-224 false-launch.
   Evidence: CS-430 description still uses "CS-XXX" placeholders; CS-224 precedent (zero signups in 12 days post-Done); CS-430 due 2026-06-11.
   Confidence: **high**. Raised by: **CEO, COO, CPO, CFO** (consensus).

4. **Declare NW services as the commercial North Star for the next 90 days; treat Chief Scout as a NW-revenue-funded internal product, not a fundraising candidate.**
   CS has zero signups, no verified analytics, no legal compliance, and one remaining revenue lever (paid conversion) with no baseline — a VC story isn't credible now. NW-15 has priced offers and a faster path to first invoice. Finish CS-430 honestly, then put CS on maintenance until services revenue is real.
   Evidence: CS-430 (zero signups, Plausible unverified); CS-256 (display ads ruled out); NW-15 (5 priced offers, £600/day floor, dogfood proof in NW-32); operator capacity is single-thread.
   Confidence: **high (CEO, CFO)**, **medium (COO — process-neutral)**.
   **Disagreement surfaced:** CPO frames this as an open question rather than a decision: "Is NW-15 a separate business from CS, or the operating cashflow that funds CS through the World Cup window?" Trade-off: CEO/CFO want a clean priority; CPO warns that the framing also dictates the homepage IA and what neutralworking.com leads with. Decision shapes both the calendar and the brand.

5. **Cut NW-15 v1 surface from 5 offers to a smaller wedge — and sequence Backlog Rescue first.**
   Two trade-offs to choose between:
   - **CPO position (aggressive):** Cut to 2.5 offers — AI Ops Setup (NW-18) + Automation Build as the headline; Backlog Rescue (NW-17) as the funnel-filler; defer Product Clarity Sprint (NW-20) and Fractional PO Retainer (NW-22) to v2. Five offers dilutes the "builds the systems, not just the specs" line into a services menu.
   - **CFO position (sequencing, not cutting):** Keep all five but ship Backlog Rescue first — £1,800 first-cash SKU, no asset-library dependency (NW-33), can be sold before AI Ops is build-ready.
   Evidence: NW-15 positioning line is systems-specific; NW-32 dogfood proves AI Ops specifically; NW-33 (asset library) gates AI Ops £4,500 SKU; Backlog Rescue is tagged "easiest first sale, funnel-filler".
   Confidence: **high** (both CPO and CFO).
   **Disagreement surfaced:** CEO and COO do not push to cut. Trade-off: cutting now reduces decision load (fewer pricing/positioning fights — NW-34, NW-35) but commits to AI Ops as the brand identity; keeping all five preserves positioning optionality but pushes the launch later.

## Decisions needed

> Cap 3. Yes/no items requiring direction this meeting.

1. **neutralworking.com domain architecture.** Single services site (NW-15) with portfolio as a subpage; OR subdomain split with services, portfolio, and CS marketing on separate hosts; OR pause NW-9 portfolio until NW-15 ships. (NW-31)
2. **Is Chief Scout treated as a NW-revenue-funded internal product for the next 90 days, with no fundraising activity until CS-430 exit criteria are met?** Yes / no.
3. **NW-15 v1 scope: ship all 5 offers, OR cut to AI Ops + Automation + Backlog Rescue and defer the other two to v2?** Implies the answer to NW-34 (per-project vs productized recurring) and NW-35 (named productized offer naming).

## Open questions

Lower-confidence items the agents surfaced as questions rather than recommendations:

- If CS-430 misses 2026-06-11 with still-zero signups, is the response to keep funding CS operator-hours from NW services revenue, or freeze CS to `someday`?
- What is the minimum monthly NW services revenue (one Retainer + one Backlog Rescue?) that triggers a reduction in agency-side day-job hours?
- Does KC v2 get a commercial model attached this period (paid release, ads, licensing) — or does it move to `someday` alongside Director of Football? CS-423 is a correct product pivot with no builder and no monetisation surface, which is the classic sunk-cost pattern.
- Should the "launched" definition (legal live + verified external traffic + first N signups) become a Linear template applied to every umbrella, or stay per-ticket exit criteria?
- What is the explicit bar for the rejected CPO specialist agent (NW-36, V2) returning vs staying rejected? Right now it's the only surviving piece of the rejected AI C-Suite layer.
- Given a sole operator, what is the right hard WIP cap across both teams — 1, 2, or 3?

## Forward focus

> Cap 3. Priority themes for next period, not a task list.

1. **Convert decisions into shippable surface.** The four gating decisions + NW-31 + the NW-15 scope cut must close this week. Anything that doesn't ship Backlog Rescue or AI Ops in saleable form within the period is noise.
2. **CS-430 honestly delivered or honestly slipped.** Ticket the three placeholder children (audit, GDPR, distribution), or move the due date. No third option — repeating the CS-224 pattern would be the only real failure here.
3. **Hold the line on portfolio sprawl.** KC v2, Soft Power, Director of Football, Crumble. Either staffed or formally parked. The dogfood pattern is the real moat; everything else is sunk cost until services revenue exists.

## Asks

> What external help would matter this period if a real board could provide it.

- **Legal intro for Czech/EU GDPR compliance** on Chief Scout before CS-430 distribution: cookie banner, privacy policy, ToS, CZ imprint. A 1-hour consult unblocks the legal child of CS-430.
- **NDA / case-study sign-off from agency leadership** for the three iGaming case studies (NW-24/25/26). NW-27 is the single highest-leverage credibility lever for the NW services site after the dogfood.
- **One trusted ex-agency PO / fractional PO peer** to sanity-check the NW-15 pricing floor (NW-28) and offer mix before going public. Goal: an outside read in under a week.
- **Distribution channel intros for CS-430** — Czech tech communities, indie product communities, an HN-ready peer who can post when the launch is real. Without distribution, Plausible cannot be verified live and the funnel math doesn't exist.
- **A budget cap (operator hours) for non-revenue work.** Explicit number of Claude Code sessions or week-hours allocated to KC v2, Soft Power, and CS feature work outside CS-430 until the first NW services invoice is paid.

---

*Agents: CEO, COO, CPO, CFO synthesised by Chief of Staff. Where agents agreed, recommendations are marked "consensus". Where they disagreed, the trade-off is surfaced under the recommendation. Every recommendation cites Linear evidence and confidence level. No prose padding added beyond what each agent provided.*
