# CCA Personality Prep — Requirements Specification

**Version:** 2.1 · **Date:** 2026-06-11 · **Status:** implemented (standalone React/Vite app)

> v2 supersedes v1. The product was rebuilt as a standalone **React + Vite +
> Tailwind** single-page app that is **YAML-driven** (mirroring the existing
> `cca-numerical` quiz platform), replacing the earlier Next.js prototype.
> v2.1 adds the SHL-style **forced-choice** format and a **sten-based report**,
> and neutralises product branding.

---

## 1. Purpose & Scope

A web app for practising the two **personality sections** of an SHL-style
consulting career assessment. Quizzes are authored as YAML files; the app
renders them, scores answers into a **7-trait profile**, presents an SHL-style
**sten report**, and analyses the **consistency between Test 1 (self-perception)
and Test 2 (how others see you)** — the behaviour the assessment screens on.

**In scope (v2.1):**
- YAML-driven quizzes loaded via `?quiz-id=<file>.yaml` from `public/quizzes/`.
- Question types: `forced-choice` (SHL OPQ-style most/least), `likert` (1–5 agreement),
  `multi-select` (choose up to N), `single-select`. Types may be mixed in one quiz.
- In-app **trait scoring** (ipsative forced-choice; Likert with reverse-scoring; per-option weights).
- **SHL-style report:** sten scores (1–10) on a profile chart with the population-average band,
  percentile equivalents, and original per-trait narrative interpretation.
- Per-test profile **and** Test 1 ↔ Test 2 consistency analysis (sten gaps + extreme-answer flags).
- Local persistence (`localStorage`) so the cross-test comparison works without a backend.
- Optional timer (practice/test mode) when a quiz defines one; personality sections are untimed.

**Out of scope (v2.1):** user accounts / server database; the numerical question
types (`fill-box`, `chart-adjust`, etc.) and correctness scoring used by the
`cca-numerical` sets; payment; SHL's proprietary norm group (the sten norming is
illustrative, not an official SHL norm comparison).

**Branding & disclaimer:** the product is named neutrally ("Consulting
Personality Practice"); BCG/SHL/OPQ/CCA appear only descriptively. A prominent
disclaimer states it is **not affiliated with or endorsed by BCG or SHL**, that
those names are trademarks of their owners, and that all items/interpretations
are original practice material.

---

## 2. Actors

| Actor | Description |
|---|---|
| **Candidate** | Takes a quiz, sees their trait profile + consistency analysis. |
| **Content author (Eric)** | Drops a YAML file into `public/quizzes/` and redeploys; owns all question content. |
| **Operator** | Builds and hosts the static site (e.g. Vercel). |

---

## 3. Domain Glossary

- **Trait** — one of 7 measured dimensions: `leadership`, `communication`,
  `adaptability`, `empathy`, `teamwork`, `time_management`, `cognitive`.
- **Quiz** — a YAML file describing one test (metadata + questions).
- **Question** — `likert`, `multi-select`, or `single-select`; each carries trait tag(s).
- **Trait Profile** — a vector of 7 scores in `[0,100]`.
- **Consistency Score** — `[0,100]` alignment between a Test 1 and Test 2 profile.

---

## 4. Functional Requirements

### 4.1 Quiz loading
- **FR-L1** The app reads `quiz-id` from the URL query and fetches `/quizzes/<quiz-id>`; default `personality-test-1.yaml`.
- **FR-L2** The YAML is parsed and **validated**; invalid files show a clear, specific error (which question, what's wrong) rather than failing silently.
- **FR-L3** Question content is authored as raw HTML in the `text` field and rendered as such (author-controlled, not user input).

### 4.2 Question types
- **FR-Q0 `forced-choice`** — a block of ≥3 statements, each a *different* trait; the candidate marks the one **most** and the one **least** like them (a statement cannot be both). The SHL OPQ-style ipsative format.
- **FR-Q1 `likert`** — one statement, answered on a 1–5 agreement scale (single-select); maps to one `trait`, optional `reverse`.
- **FR-Q2 `multi-select`** — a prompt with options; the candidate selects up to `maxSelections`; each option maps to a `trait` (+ optional `weight`).
- **FR-Q3 `single-select`** — a prompt with options; exactly one chosen; each option maps to a `trait`.

### 4.3 Taking a quiz
- **FR-T1** Questions are presented one per screen with a progress bar and position indicator.
- **FR-T2** Navigation: Back/Next; Next is disabled until the current question is answered; the last screen offers Finish, enabled only when all questions are answered.
- **FR-T3** Multi-select enforces `maxSelections`/`minSelections`; forced-choice requires both a *most* and a *least* (and they must differ).
- **FR-T4** A start screen shows title/section, a prominent disclaimer, and (if timers are defined) a Practice vs. Test choice; personality quizzes (timer 0) start untimed.
- **FR-T5** If a non-zero timer is active and expires, the quiz auto-submits.
- **FR-T6** Keyboard support: Likert items accept keys 1–5; Enter/→ advances, ← goes back.

### 4.4 Scoring & results
- **FR-S1** On finish, the app computes the trait profile in-app (algorithm fixed; see DESIGN §4).
- **FR-S2** Results present an **SHL-style report**: each trait as a **sten score (1–10)** on a profile chart with the population-average band shaded, plus percentile and band, and an original narrative interpretation per trait.
- **FR-S3** If a profile for the *other* test exists (this session or a prior one), results show the **consistency analysis**: overall score, trait-by-trait sten-gap table, and extreme-answer flags, with a plain-language summary.
- **FR-S4** With only one test taken, results prompt the user to take the other to unlock the comparison, linking to it.
- **FR-S5** Each test's latest profile persists in `localStorage`, keyed by test number.
- **FR-S6** The report states that sten norming is illustrative, not SHL's proprietary norm group.

### 4.5 Content authoring
- **FR-C1** Adding/editing a quiz requires only a YAML file in `public/quizzes/`; no code changes.
- **FR-C2** The schema is backward-compatible with the `cca-numerical` metadata keys (`title`, `subtitle`, `section`, `quizNumber`, `practiceMode`, `testMode`).

---

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| **NFR-1 (No backend)** | Pure static SPA; runs from any static host. State lives in the browser. |
| **NFR-2 (Determinism)** | Scoring is a pure function of answers + quiz; identical inputs → identical profile. |
| **NFR-3 (Validation)** | Malformed YAML never crashes silently; the user sees what to fix. |
| **NFR-4 (Performance)** | Single small bundle (~65 kB gzipped); instant scoring (O(#answers)). |
| **NFR-5 (Responsive)** | Usable on mobile and desktop widths. |
| **NFR-6 (Maintainability)** | Scoring isolated in `src/lib/scoring.ts`, framework-free and unit-testable. |
| **NFR-7 (Authoring fidelity)** | Same YAML conventions as `cca-numerical` so content tooling/workflow is shared. |
| **NFR-8 (Privacy)** | No accounts, no server, no third-party analytics; only local trait scores stored. |

---

## 6. Constraints & Assumptions

- Real CCA item content is proprietary; the app models the **format**, not the items.
- Cross-test consistency relies on `localStorage`, so it is per-browser (clearing storage resets it). Acceptable given the no-backend constraint.
- Node 18+ / modern evergreen browsers.

---

## 7. Acceptance Criteria (v2) — passing

- Loads & validates `personality-test-1.yaml` / `-2.yaml`; bad YAML shows a specific error. ✅
- `likert` (with reverse) and `multi-select` (with `maxSelections`) render and are answerable. ✅
- Finishing produces a 7-trait profile (all values 0–100); reverse + multi-select scoring verified numerically. ✅
- Taking both tests shows the consistency score, gap table, and extreme flags. ✅
- Production build compiles and type-checks clean. ✅

---

## 8. Roadmap (not in v2)

| Item | Summary |
|---|---|
| Full content | Expand to the real ~76 (Test 1) + ~15 (Test 2) items (author-supplied). |
| Pre-test coaching | Briefing + per-trait "what good looks like" guidance. |
| Progress trend | Track consistency across attempts over time. |
| Answer review | Let candidates revisit/change answers before submitting. |
