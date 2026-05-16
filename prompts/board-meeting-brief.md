# Board meeting brief — Chief-of-Staff multi-agent pattern

Run a board meeting brief for Neutral Working in the Chief-of-Staff
pattern, with multi-agent perspectives.

Audience: Self-board / strategic review. Luke is sole operator and the
board.
Period: Last 4 weeks (adjust if I tell you otherwise).
Linear MCP is available; pull from there.

Pull context from Linear:
- Neutral Working team — NW-15 and its children, recent activity
- Chief Scout team — CS-430 and active tickets
- Any other active product work in either team (Kickoff Clash, Crumble)

Generate four agent perspectives in parallel. Each agent returns
structured output, no prose padding:

```json
{
  "perspective": "CEO" | "COO" | "CPO" | "CFO",
  "summary": "1-2 sentences from this perspective",
  "observations": [{
    "observation": "string",
    "evidence": ["string", "string"],
    "confidence": "high" | "medium" | "low"
  }],
  "recommendations": [{
    "recommendation": "string",
    "evidence": ["string"],
    "confidence": "high" | "medium" | "low",
    "decision_needed": boolean
  }],
  "questions_for_board": ["string"]
}
```

Agent scopes:
- CEO: strategic alignment, priority focus, what should be paused or
  killed, North Star fidelity
- COO: delivery health, blockers, process breakdowns, where work is
  drifting or stale
- CPO: product judgement, build/don't build, scope discipline,
  positioning coherence across NW and CS
- CFO: runway thinking, where money will need to come from, cost
  commitments, CS funding path (VC vs NW revenue)

Then a Chief of Staff layer synthesises into a single board brief.
Where agents agree, state the consensus. Where they disagree, surface
the disagreement and the trade-off — don't hide it.

Output to ./board-brief-YYYY-MM-DD.md with this structure:

```
# Board brief — [date]

## Executive summary
3-5 sentences. State of the business, what shifted this period, what
needs decision.

## What shipped
Bullets, citing Linear ticket IDs where relevant. Just what's closed
or Done.

## Strategic shifts this period
Direction or framing changes — not feature work. (Examples from recent
history: NW as North Star, CS as dual-purpose case-study-and-investable,
life admin moved to Todoist.)

## Cross-perspective recommendations
For each: recommendation, supporting evidence, confidence level, which
agents raised it. If agents disagreed, surface that.
Cap at 5.

## Decisions needed
Explicit yes/no items requiring direction this meeting.
Cap at 3.

## Open questions
Low-confidence items surfaced as questions. Things I don't yet know.

## Forward focus
Next period's priority themes — not a task list.
Cap at 3.

## Asks
Specific resource needs — capital, intros, partner conversations,
decisions from a real board if I had one. Frames what external help
this period needs.
```

Constraints:
- Every recommendation has evidence and confidence — non-negotiable
- Multi-agent disagreement is surfaced, not hidden
- No generated prose padding
- If Linear MCP is unreachable, stop and ask me to paste context
- Stop and ask if scope is ambiguous

After the brief is written, also save the prompt itself to
./prompts/board-meeting-brief.md (creating the directory if needed)
so it can be reused.
