---
name: next-ticket
description: Use at the start of a working session, or when the user says things like "what's next", "next ticket", "start the next thing", "let's pick something up". Fetches the top candidate Linear tickets from team Neutral Working, lets the user pick one, then loads its full context and seeds a task plan so work can start immediately. Automatically triggered by the SessionStart hook in .claude/settings.json — do NOT also run on every user message.
---

# next-ticket

A short ritual to start a work session: pull the next candidate tickets from Linear, pick one with the user, load full context, and seed a plan.

## When this fires

- **SessionStart hook** in `.claude/settings.json` — surfaces a reminder on session open. If the user immediately gives you a different task, drop this and follow them.
- **User intent** — phrases like "what's next", "start the next thing", "let's pick something up", "next ticket".

Do not re-run the skill within the same session unless explicitly asked. Once a ticket is picked and a plan is seeded, get on with the work.

## Workflow

### 1. Fetch candidates (parallel calls)

Pull two pools so we can fall back gracefully if nothing is in flight:

```
mcp__claude_ai_Linear__list_issues(team="Neutral Working", assignee="me", state="In Progress", limit=10, orderBy="updatedAt")
mcp__claude_ai_Linear__list_issues(team="Neutral Working", assignee="me", state="Backlog", limit=10, orderBy="updatedAt")
```

Run both in parallel.

### 2. Rank to top 3

The user's prioritisation is **label-driven**, not priority-driven. Combine and rank:

1. Issues with label `focus/now` (any state)
2. Then any In Progress
3. Then label `focus/next`
4. Then by Linear priority (1=Urgent, 2=High, …)
5. Then by `updatedAt` desc as a tiebreaker

Drop anything with label `someday` or `focus/later` from this view unless nothing else is left.

Take the top 3. If fewer than 3 candidates exist, show what you have.

### 3. Present + let the user pick

Show a compact card per candidate — identifier, title, one-line summary from the description, status, labels, priority. Use `AskUserQuestion` with the 3 candidates as options. Single-select. Example header: "Pick a ticket".

If a ticket is obviously the right one (only one candidate, or the user already named it in this session), skip the question.

### 4. Load full context

Once picked, call in parallel:

```
mcp__claude_ai_Linear__get_issue(id=<picked-id>, includeRelations=true)
mcp__claude_ai_Linear__list_comments(issueId=<picked-id>, limit=50)
```

Print a tight briefing: full description, any blockers/related tickets, comments in chronological order. Highlight anything that looks like a decision or a constraint (deadlines, dependencies, "do this first"-style notes).

### 5. Seed a plan

Translate the issue into 3–7 `TaskCreate` items that map to its actual deliverable. Make them concrete and verifiable — not "investigate X" but "list the files that handle X, with line numbers". If the description is too vague to seed tasks, say so and ask the user to scope it before continuing.

If the ticket would benefit from a written implementation plan (multi-step, touches several files, design tradeoffs), suggest the `superpowers:writing-plans` skill before any code.

### 6. Hand off

End with a one-sentence statement of what's about to happen next, e.g. "Starting on the n8n /portfolio endpoint shape — first task is to enumerate the current mock output." Then begin the first task.

## Things to NOT do

- Do not create a git branch automatically. The user opted out.
- Do not change the ticket's Linear status to "In Progress". The user opted out.
- Do not push anything to Linear (comments, labels, status) without being asked.
- Do not skip the user-pick step unless there's exactly one candidate or the user has named one.
- Do not run this skill more than once per session — it's a "start" ritual, not a recurring poll.

## Edge cases

- **No candidates at all** (empty pools): say so plainly, list the most recent 3 Done tickets for context, and ask the user what they'd like to do (open a new ticket, work outside Linear, etc.).
- **More than one `focus/now`**: that's intentional from the user — show them and let them pick.
- **MCP fails / unauthenticated**: don't fall back to silence. Tell the user the Linear MCP didn't respond, point them at `mcp__claude_ai_Linear` tools in the available list, and offer to proceed without Linear context.

## Notes on the user's setup

- Team: **Neutral Working** (`731894bd-7c17-44f7-a46e-f120b07a5176`)
- Linear assignee name: **13 Triangle** (`7410a52a-efcc-4cb3-9fe3-8ebbafc3ae7b`) — but `"me"` works as a filter shortcut
- Label vocabulary: `focus/now`, `focus/next`, `focus/later`, `someday`
- The user does NOT use Linear's "Todo" state — workflow is `Backlog` → `In Progress` → `Done`
