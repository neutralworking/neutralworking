# Spec: Functional NPCs for The Grand

Status: draft for review · Owner: Luke · Builds on: `dist/npc-brain.js` (PR #9)

## 1. Goal

Add a small cast of *functional* residents who explain and surface the casino's promotional and account features in-world, through the same inline conversation used by every resident:

| Role | Working name | Where | One-line job |
|---|---|---|---|
| Bonuses | **Celeste, the Bonus Concierge** | Lobby, concierge desk | Explains the bonuses a player is eligible for and opens the claim panel |
| Competitions + records | **Rex, the Tournament Steward** | Gold Lounge | Announces live and upcoming competitions; shows past results and records |
| Terms and conditions | **Mr Penrose, Clerk of Small Print** | Gallery & Lifts | Quotes the relevant terms clause and links to the full document |
| Banking rules | **Hollis, the Cashier** | Lobby, cashier window | Explains deposit and withdrawal rules, limits, methods and timings |
| Free spins | **Pip, the Spin Attendant** | Neon Arcade | Shows available free spins, which games they apply to, and opens them |

Rex covers records as a second mode, as suggested. A separate archivist can be split out later if the records content grows.

Sofia stays a social character. **She must never take on any of these roles.** A flirt character pushing offers is precisely the pattern a responsible-gambling review flags.

## 2. Principles (apply to every functional NPC)

1. **Data, not improvisation.** Anything factual (amounts, wagering, dates, eligibility, limits, clauses) comes from a data source and is rendered verbatim into a slot or a card. Personas write the framing ("Here's what's open to you tonight"), never the facts.
2. **Terms travel with offers.** Every offer surfaced by Celeste, Rex or Pip shows its key terms (wagering, expiry, max win, eligible games) next to it and links to the full clause via Penrose. Never "see T&Cs" without a link.
3. **No offer to someone in a bad state.** A shared *wellbeing gate* (section 5) suppresses offers and switches to a support message when the player signals distress, loss-chasing, self-exclusion intent or being underage.
4. **Never initiate money movement.** Hollis explains rules and opens the official cashier view; she never asks for or takes payment details, and never encourages a deposit. In the prototype, every money action stays **SIMULATED**.
5. **Same voice system, different tone.** Functional NPCs are warm, brief and plain-spoken. No innuendo, no urgency language ("hurry", "last chance", "don't miss out"), no FOMO countdowns in speech. Countdowns may appear as neutral data on a card.
6. **Frequency caps.** An NPC proactively mentions an offer at most once per session per offer. Ambient lines never mention offers.
7. **Explainability.** Every functional reply records `{intent, p, via, dataIds}` so QA can trace which data produced which sentence.

## 3. Architecture

### 3.1 Personas
One persona file per NPC under `dist/personas/` (`celeste.js`, `rex.js`, `penrose.js`, `hollis.js`, `pip.js`), each built for `npc-brain.js`:
- intents with rules and example phrases (section 4),
- response pools whose `text` can be a function that renders data slots,
- an `action` on responses that need UI (section 3.4),
- reactions: functional NPCs **do not** butt into other residents' conversations (opt out with `reactions: []`).

Move Sofia into `dist/personas/sofia.js` at the same time; `dist/sofia.js` stays as a thin facade so existing imports keep working.

### 3.2 Data provider
A single interface, injected into personas through `ctx.data`:

```ts
interface PromoData {
  bonuses(player: PlayerCtx): Promise<Bonus[]>;          // eligible only
  competitions(): Promise<{ live: Competition[]; upcoming: Competition[] }>;
  records(filter?: { competitionId?: string; limit?: number }): Promise<CompetitionResult[]>;
  terms(section: TermsSection): Promise<TermsClause[]>;
  banking(): Promise<BankingRules>;
  freeSpins(player: PlayerCtx): Promise<FreeSpinOffer[]>;
}
```

- **Prototype:** `dist/data/fixtures/*.json` plus a `FixtureData` implementation. All values are fictional and visibly labelled SIMULATED.
- **Later:** an `ApiData` implementation behind a Vercel function (`/api/promo/*`) that proxies the real CRM or promotions platform. Keys stay server-side. No client or brand data is committed to this repo.
- The brain is synchronous. The app fetches the relevant data when a conversation opens (and on intent change), caches it for the session, and passes a snapshot as `ctx.data`.

### 3.3 Data contracts

```ts
type Money = { amount: number; currency: string };            // display only
type Bonus = {
  id: string; title: string; kind: 'deposit_match' | 'cashback' | 'no_deposit' | 'reload' | 'loyalty';
  summary: string;                                              // one plain sentence, authored by marketing
  value: Money | { percent: number; cap: Money };
  wagering?: { multiplier: number; appliesTo: 'bonus' | 'bonus+deposit' };
  minDeposit?: Money; maxWin?: Money; eligibleGames?: string[];
  startsAt: string; expiresAt: string;                          // ISO
  termsRef: TermsRef;                                           // required
  claimable: boolean; claimedAt?: string;
};
type Competition = {
  id: string; title: string; kind: 'leaderboard' | 'tournament' | 'race' | 'prize_draw';
  status: 'live' | 'upcoming' | 'finished';
  startsAt: string; endsAt: string;
  scoring: string;                                              // plain sentence: "Most points from wins on Grand Sevens"
  prizes: { rank: string; prize: string }[];                    // "1st" -> "5,000 credits"
  eligibleGames?: string[]; minStake?: Money;
  termsRef: TermsRef; optInRequired: boolean; optedIn?: boolean;
  playerStanding?: { rank: number; score: number };             // when opted in
  standings?: { rank: number; displayName: string; score: number }[]; // top N for the leaderboard card, names anonymised upstream
};
type CompetitionResult = {
  competitionId: string; title: string; endedAt: string;
  winners: { rank: number; displayName: string; score: number; prize: string }[]; // display names already anonymised upstream
  records?: { label: string; value: string; holder: string; setAt: string }[];    // "Highest single score"
};
type TermsSection = 'general' | 'bonus' | 'competition' | 'free_spins' | 'banking' | 'responsible_gambling' | 'privacy';
type TermsRef = { section: TermsSection; clauseId: string; url: string };
type TermsClause = { section: TermsSection; clauseId: string; heading: string; text: string; url: string; version: string; updatedAt: string };
type BankingRules = {
  depositMethods: { id: string; label: string; min: Money; max: Money; fee?: string; processing: string }[];
  withdrawalMethods: { id: string; label: string; min: Money; max: Money; fee?: string; processing: string }[];
  verification: { required: boolean; when: string; documents: string[] };  // KYC, plain sentences
  limits: { daily?: Money; weekly?: Money; monthly?: Money; playerSetLimits: boolean };
  pendingPeriod?: string; reversalAllowed?: boolean;
  termsRef: TermsRef;
};
type FreeSpinOffer = {
  id: string; title: string; spins: number; spinValue: Money; eligibleGames: string[];
  expiresAt: string; wagering?: { multiplier: number }; maxWin?: Money;
  termsRef: TermsRef; claimable: boolean; remaining?: number;
};
type PlayerCtx = { id: string; country?: string; ageVerified: boolean; selfExcluded: boolean; coolingOff: boolean; limitsReached: boolean };
```

### 3.4 Actions (returned on responses, handled by the app)

| Action | Payload | App behaviour |
|---|---|---|
| `show-offers` | `{ kind: 'bonus' \| 'free_spins', ids }` | Renders offer cards under the talk bar |
| `open-claim` | `{ kind, id }` | Opens the claim panel; prototype shows SIMULATED and claims fictional value |
| `show-competitions` | `{ status: 'live' \| 'upcoming', ids }` | Competition cards with dates, scoring, prizes |
| `show-leaderboard` | `{ competitionId }` | Live standings (player highlighted) |
| `show-records` | `{ competitionId? }` | Past winners and records table |
| `opt-in` | `{ competitionId }` | Opt-in confirmation panel |
| `show-terms` | `{ section, clauseId }` | Terms card with the clause verbatim and a link to the full document |
| `open-cashier-info` | `{ view: 'deposit' \| 'withdraw' \| 'limits' \| 'verification' }` | Read-only banking info panel; never a payment form |
| `open-safer-play` | `{ reason }` | Safer-play panel: limits, time-out, self-exclusion, support links |

Cards render from data, never from persona text. Persona text is the one-line framing above the card.

## 4. NPCs

### 4.1 Celeste, the Bonus Concierge (lobby desk)
**Intents**

| Intent | Example inputs | Reply | Action |
|---|---|---|---|
| `whatBonuses` | "any bonuses?", "what offers do I have" | Framing + count from data | `show-offers {kind:'bonus'}` |
| `explainBonus` | "how does the reload bonus work", "explain that one" | `summary` + key terms in plain words | `show-terms` for its `termsRef` |
| `wagering` | "what's wagering", "playthrough?" | Generic explanation + this bonus's multiplier | — |
| `claim` | "claim it", "I'll take the cashback" | Confirms which one | `open-claim` |
| `expiry` | "when does it end" | Date from data, in the player's time zone | — |
| `notEligible` | "why can't I get the welcome bonus" | Plain reason from data (`claimable:false` reason) | `show-terms` |
| `noThanks` | "no thanks", "not interested" | Polite close; no follow-up offer this session | — |

**Must not:** recommend a bonus as "best" for the player; mention bonuses unprompted more than once per session; describe a bonus as free money; suggest depositing to unlock anything unless the player asks how a deposit bonus works (then state the rule, neutrally).

### 4.2 Rex, the Tournament Steward (Gold Lounge)
**Intents:** `liveCompetitions`, `upcomingCompetitions`, `howToEnter` (opt-in rules), `scoring`, `prizes`, `myStanding`, `records` ("who won last week", "biggest win ever"), `pastResults`, `optIn`, `competitionTerms`.

**Must not:** pressure the player to play more to climb the leaderboard ("you're only 40 points behind!"). Standing is reported as data, without nudges. Countdowns appear on cards only.

**Records mode:** triggered by the `records` or `pastResults` intents, or by walking to the Hall of Records board in the Gallery (an interactive object that opens the same view). Winners' names are display names anonymised upstream; never show real names.

### 4.3 Mr Penrose, Clerk of Small Print (Gallery)
**Intents:** `findClause` (free text → best-matching clause by heading or keywords, top 3 if ambiguous), `bonusTerms`, `competitionTerms`, `freeSpinTerms`, `bankingTerms`, `responsibleGambling`, `privacy`, `whatChanged` (version and `updatedAt`), `plainEnglish`.

**Rules:** he quotes the clause verbatim in a card (`show-terms`). His spoken line may summarise the clause in one sentence only if `plainEnglish` is requested, and he always ends with "The clause itself is the one that counts." He never interprets for the player's specific case ("you'll be fine").

### 4.4 Hollis, the Cashier (lobby, cashier window)
**Intents:** `depositMethods`, `withdrawalMethods`, `processingTimes`, `fees`, `limits` (including player-set limits), `verification` (why and when KYC is required), `pendingWithdrawal`, `reverseWithdrawal` (state the rule only), `setLimit` (opens safer-play limits).

**Rules:** read-only. `open-cashier-info` never shows a payment form. She never says "deposit now", never links deposits to offers, and answers "how do I deposit" with the method facts only. If `reversalAllowed` is false, she says so plainly; if true, she still doesn't encourage it.

### 4.5 Pip, the Spin Attendant (Neon Arcade)
**Intents:** `whatSpins`, `whichGames`, `spinValue`, `expiry`, `useSpins` (opens the eligible game with spins applied, simulated in the prototype), `spinWagering`, `maxWin`, `noThanks`.

**Rules:** same as Celeste. Never describes spins as "free money". Always shows spin value, wagering and max win on the card.

## 5. Wellbeing gate (shared, runs before every functional reply)

`dist/wellbeing.js` exports `gate(text, mem, playerCtx) → { block: boolean, reason?: string, reply?: string, action?: Action }`.

| Signal | Detection (rules + examples, reusing `npc-brain` matching) | Behaviour |
|---|---|---|
| Distress | "I'm skint", "lost everything", "can't afford", "need to win it back", "chasing" | Block offers for the session; supportive line; `open-safer-play {reason:'distress'}` |
| Underage | "I'm 16", "my mum's card", "for school" | Block all offers and play; age message; flag for review |
| Self-exclusion intent | "I want to stop", "block me", "take a break" | Thank them; `open-safer-play {reason:'exclude'}` |
| Account state | `playerCtx.selfExcluded`, `coolingOff`, `limitsReached` | Functional NPCs decline offers politely and point to safer play |
| Repeated losses (session) | N consecutive losing rounds (configurable) | Offers suppressed for a cooldown; no "luck will turn" language anywhere |

The gate also applies to Sofia: on a distress signal she drops the act for one line ("Hey. Seriously, look after yourself.") and the safer-play link is offered.

## 6. UI

- Same inline talk bar. Below the chips, a horizontal strip of **cards** for `show-*` actions: offer, competition, leaderboard, records, terms clause, banking facts.
- Every card has a visible **Terms** link (opens Penrose's clause card) and, in the prototype, a **SIMULATED** chip.
- The NPC's bubble line stays short (≤ 2 lines). Facts live on cards.
- Accessibility: cards are focusable, have headings, and are mirrored in the `aria-live` region as plain text.

## 7. Acceptance criteria (prototype, fixtures)

**Celeste**
- Given the player has 2 eligible bonuses, when they ask "any bonuses?", then Celeste replies with a one-line framing and 2 offer cards render, each showing wagering, expiry, max win and a Terms link.
- Given a bonus with `claimable:false`, when the player asks why, then the reason from data is shown and the clause card opens.
- Given the player said "no thanks", when they talk to Celeste again in the same session, then she doesn't mention offers unless asked.

**Rex**
- Given 1 live and 2 upcoming competitions, when the player asks "what's on?", then live is listed first, with dates in the player's time zone and prizes from data.
- Given the player is opted in, when they ask "how am I doing?", then rank and score are shown as data with no encouragement to play more.
- When the player asks "who won last week?", then the records view shows anonymised display names and prizes for the most recent finished competition.

**Penrose**
- When the player asks "what's the wagering on free spins?", then the matching `free_spins` clause is quoted verbatim with a link to the full document and its version date.
- Given two clauses match equally, then the top 3 headings are offered as chips.

**Hollis**
- When the player asks "how long do withdrawals take?", then processing times per method come from data, and no deposit prompt appears anywhere in the reply or cards.
- When the player asks to set a limit, then the safer-play limits panel opens.

**Pip**
- Given 20 spins on 2 eligible games, when the player asks "what spins have I got?", then the card shows count, spin value, games, expiry, wagering and max win.

**Wellbeing gate (all NPCs, Sofia included)**
- When the player types "I need to win my money back", then no offer card renders for the rest of the session, a supportive line is shown, and the safer-play panel is offered.
- Given `playerCtx.selfExcluded`, when the player talks to Celeste or Pip, then no offer is shown.
- Given a fuzz run of 2,000 random inputs, no functional NPC line contains urgency language (`hurry|last chance|don't miss|act now|only today`).

## 8. Tests

- Persona unit tests per NPC: intent coverage on a held-out phrasing set (≥ 90%), every data-backed reply renders only values present in the fixture (diff the reply against fixture fields), every offer reply has a `termsRef`.
- Wellbeing gate tests: signal detection set, blocks persist for the session, gate runs before persona replies.
- DOM journey: talk to each NPC, render cards, open a terms card, simulated claim, opt in, records view.
- Fuzz: no urgency language, no unprompted offers, no offers after a distress signal.

## 9. Delivery plan

| # | Ticket | Notes |
|---|---|---|
| 1 | Move Sofia to `dist/personas/`; add `ctx.data` and card-strip UI | Facade keeps imports stable |
| 2 | `PromoData` interface, fixtures, `FixtureData` | Fictional values only |
| 3 | Wellbeing gate + Sofia hook | Before any offer NPC ships |
| 4 | Penrose (terms) | First, because every other NPC links to him |
| 5 | Celeste (bonuses) + claim panel (simulated) | |
| 6 | Pip (free spins) | Reuses Celeste's card and claim |
| 7 | Rex (competitions, leaderboard, records) + Hall of Records object | |
| 8 | Hollis (banking rules, read-only) | |
| 9 | `ApiData` behind `/api/promo/*` (later) | Only when a real data source is chosen; keys server-side |
| 10 | Optional: external classifier adapter (e.g. Jev) | `respond(..., {intent, p})`, fallback to the local classifier |

## 10. Open questions

1. **Data source for v1 beyond fixtures.** Which promotions/CRM platform would supply bonuses, competitions and free spins, and does it expose eligibility per player? (Affects ticket 9 only.)
2. **Jurisdiction.** Which market's rules should the copy and gate follow first? This changes bonus wording, required disclosures and age language.
3. **Records retention.** How far back should records go, and are display names already anonymised upstream?
4. **Claim flow in the prototype.** Should a simulated claim grant fictional credits (like the funding flow) or only show a confirmation?
5. **Names and art.** Keep the working names and placements above, or brief new characters?
6. **Does Rex need a separate archivist** once records content grows?
