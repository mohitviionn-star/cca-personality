# CCA Personality Prep — High-Level Design

**Version:** 2.1 · **Date:** 2026-06-11 · Companion to [REQUIREMENTS.md](./REQUIREMENTS.md)

> v2 = standalone React + Vite + Tailwind SPA, YAML-driven, no backend.
> v2.1 adds the forced-choice algorithm and the SHL-style sten report.

---

## 1. Architecture Overview

A static single-page app. There is no server: the browser fetches a YAML quiz,
renders it, scores answers locally, and persists results in `localStorage`.

```
                          Browser (SPA)
   ┌──────────────────────────────────────────────────────────┐
   │  App.tsx  (phase machine: loading→running→results)         │
   │     │                                                      │
   │     ├── lib/loadQuiz.ts ──fetch──▶ /quizzes/<id>.yaml      │
   │     │      (js-yaml parse + validate)                      │
   │     │                                                      │
   │     ├── components/Quiz.tsx                                │
   │     │      Likert / MultiSelect / SingleSelect inputs      │
   │     │      Timer (only if quiz defines one)                │
   │     │                                                      │
   │     ├── lib/scoring.ts  (pure: scoreQuiz, buildFeedback)   │
   │     │                                                      │
   │     ├── components/Results.tsx + TraitBar.tsx              │
   │     └── lib/storage.ts ──▶ localStorage (per-test profile) │
   └──────────────────────────────────────────────────────────┘
                 served as static files (Vite build → dist/)
```

### 1.1 Module responsibilities

| Module | Responsibility |
|---|---|
| `src/App.tsx` | Top-level state machine: load → run → results; reads `quiz-id`. |
| `src/lib/loadQuiz.ts` | Fetch + `js-yaml` parse + schema validation with actionable errors. |
| `src/lib/traits.ts` | The 7 traits, lookup maps, `isTraitId` guard. |
| `src/types.ts` | Quiz / Question / Answer types mirroring the YAML schema. |
| `src/lib/scoring.ts` | **All algorithms** — `scoreQuiz`, `buildFeedback`. Pure, deterministic. |
| `src/lib/storage.ts` | Persist/read the latest profile per test (`localStorage`). |
| `src/components/Quiz.tsx` | Start screen, per-question rendering, navigation, finish. |
| `src/components/Results.tsx` | Trait profile + consistency analysis + extreme flags. |
| `src/components/TraitBar.tsx` | Labelled bars per trait (self vs. others colouring). |
| `src/components/Timer.tsx` | Countdown, used only for timed quizzes. |
| `src/components/Html.tsx` | Renders author-controlled HTML from YAML `text`. |

### 1.2 Key design choices
- **YAML-driven, content-out-of-code** — authors add quizzes by dropping files in
  `public/quizzes/`, matching the `cca-numerical` workflow. The app ships the
  engine + UI only.
- **Algorithm in app, content in YAML** — the YAML tags each item with its trait(s);
  the scoring math lives in `scoring.ts` (a single source of truth).
- **Pure scoring functions** — no I/O, fully deterministic, unit-testable.
- **No backend** — cross-test consistency uses `localStorage`; simplest thing that
  satisfies the requirement without servers or accounts.

---

## 2. Data / Schema Model

YAML quiz (personality), backward-compatible with the numerical sets' metadata:

```yaml
title, subtitle, section, quizNumber     # display metadata (shared convention)
test: 1 | 2                              # drives the consistency comparison
scoring: trait                           # vs. "correctness" (numerical sets)
scale: likert5                           # 1=Strongly disagree … 5=Strongly agree
practiceMode, testMode                   # timer seconds; 0/absent = untimed
format: forced-choice | likert | multi-select   # informational; types may be mixed
questions:
  - { id, type: forced-choice, text?, statements: [{text, trait}] }   # ≥3, distinct traits
  - { id, type: likert, trait, reverse?, text }
  - { id, type: multi-select, maxSelections?, minSelections?, text, options: [{text, trait, weight?}] }
  - { id, type: single-select, text, options: [{text, trait, weight?}] }
```

**Persisted state** (`localStorage`): `cca_profile_test1` / `cca_profile_test2`
→ `{ profile: TraitProfile, at: epochMs }`. Only the computed profile is stored,
so the comparison survives separate sittings.

---

## 3. Runtime Flow

1. `App` reads `quiz-id`, calls `loadQuiz` → parse + validate.
2. `Quiz` renders the start screen, then one question per screen; answers held in component state.
3. On finish → `scoreQuiz(quiz, answers)` → save to `localStorage` → show `Results`.
4. `Results` loads the other test's stored profile; if present → `buildFeedback` → consistency view.

---

## 4. Algorithms (`src/lib/scoring.ts`)

Notation: 7 traits indexed by `t`; profiles map `trait → score ∈ [0,100]`. All
answer types are projected onto a common **contribution scale `[0,1]`**, then a
trait's score is the mean of its contributions × 100. This unifies Likert and
select-style items so they can coexist in one quiz.

### 4.1 Per-type contributions
```
forced-choice (block of statements; answer = {most, least}):   # ipsative
    for each statement s at index i:
        contribution = (i == most) ? 1 : (i == least) ? 0 : 0.5
        → added to s.trait
    # over many blocks: a trait often "most" trends high, often "least" low,
    # unpicked ~0.5 — the SHL relative (ipsative) profile.

likert (value v ∈ 1..5):
    effective = reverse ? (6 - v) : v          # reverse-score negatively-worded items
    contribution = clamp01( (effective - 1) / 4 )   # 1→0.0, 3→0.5, 5→1.0
    → added to the item's single `trait`

single-select (chosen option o):
    contribution = clamp01( o.weight ?? 1 )    # → o.trait

multi-select (each option o at index i):
    contribution = selected(i) ? clamp01(o.weight ?? 1) : 0   # → o.trait
    # every option is a binary item for its trait: chosen = endorse, unchosen = 0
```

### 4.2 Aggregation
```
for each trait t:
    xs = all contributions routed to t
    profile[t] = xs.length ? round( mean(xs) * 100 ) : 50   # 50 = neutral when unmeasured
```
- **Complexity:** O(#questions + #options).
- **Why mean (not sum):** keeps every trait on a comparable 0–100 scale regardless
  of how many items measure it — authors don't have to balance item counts exactly.
- **Worked example.** `time_management` measured by: a normal Likert at 4 (→0.75),
  a reverse Likert at 4 (effective 2 →0.25), and an unselected multi-select option
  (→0). Mean = (0.75+0.25+0)/3 = 0.33 → **33**. (Verified against the live engine.)

### 4.3 Consistency analysis (`buildFeedback(p1, p2)`)
```
for each trait t: gap[t] = |p1[t] - p2[t]|
gaps_sorted   = traits by gap, descending
avgGap        = mean(gap)
consistency   = max(0, round(100 - avgGap))     # 0..100, higher = more aligned
inconsistencies = { t : gap[t] > 25 }            # GAP_FLAG = 25
extremes        = { (t,test) : score ≥ 88 (high) or ≤ 12 (low) }   # on BOTH profiles
```
**Summary** is rule-based: ≥80 and no inconsistencies → "strong, coherent"; any
inconsistencies → name the top 1–2 gap traits; else → "tighten the largest gaps";
append an "avoid extremes" note if any extremes exist.

**Thresholds** (centralised in `scoring.ts`): `100 - avgGap` is intuitive and
bounded; `GAP_FLAG = 25` (~quarter scale) marks genuine self-vs-others
disagreement; `HIGH/LOW = 88/12` flag the top/bottom ~12% spikes BCG penalises.
**Complexity:** O(7).

### 4.4 SHL-style report — sten standardisation (`src/lib/sten.ts`)

The report converts each 0–100 trait score into a **sten** (Standard Ten: mean
5.5, sd 2, range 1–10) — the SHL reporting metric — plus a percentile.
```
z          = (score - POP_MEAN) / POP_SD          # POP_MEAN = 50, POP_SD = 20 (illustrative)
sten       = clamp(round(5.5 + 2·z), 1, 10)
percentile = clamp(round(Φ(z) · 100), 1, 99)      # Φ = standard normal CDF (A&S approx)
band       = Low | Below average | Average | Above average | High   # by sten range
```
The profile chart shades stens **4–7** as the population-average band and marks
each trait's sten. Per-trait narrative text (`src/lib/narratives.ts`) is selected
by band (low ≤4 / avg / high ≥8) and is original wording.

> **Norming caveat:** `POP_MEAN/POP_SD` define an *illustrative* population, not
> SHL's proprietary norm group (which is not public). The sten metric, chart,
> percentile, and banded interpretation mirror SHL's report **format**; the
> numbers indicate relative standing, not an official SHL norm comparison. This
> is stated in the UI.

---

## 5. Validation & Error Handling

`loadQuiz` rejects with a specific message when: the file is missing/empty, has no
`questions`, a likert item lacks a valid `trait`, or a select item has < 2 options
or an option with an invalid `trait`. Errors render in a visible panel naming the
offending question — authoring feedback, not a blank screen.

---

## 6. Build & Deployment

- **Dev:** `npm run dev` → `http://localhost:5173/?quiz-id=personality-test-1.yaml`.
- **Build:** `npm run build` (`tsc -b && vite build`) → static `dist/`.
- **Host:** any static host (e.g. Vercel), same as `cca-numerical`.
- **Add content:** drop a YAML in `public/quizzes/`, redeploy.

---

## 7. Testing Strategy

| Layer | Approach |
|---|---|
| Scoring | Pure-function checks: known answers → expected profile; reverse + multi-select + empty-trait (→50) edge cases. (Verified on the real YAML.) |
| Loader | Valid file parses; malformed files produce the expected validation error. |
| UI | Manual: render likert/multi, enforce `maxSelections`, gating of Next/Finish, results + consistency render. |
| E2E _(planned)_ | Headless run: load both YAMLs, answer, assert consistency view. |
```
