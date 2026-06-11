# Consulting Personality Practice — Test 1 & 2

Standalone React + Vite + Tailwind app for practising the two **personality
sections** of the consulting career assessment (the SHL-style personality
screen). Built to the same conventions as the `cca-numerical` quiz app: quizzes
are YAML files in `public/quizzes/`, loaded via `?quiz-id=<file>.yaml`.

It adds the personality-specific pieces on top of that convention:

- **Question types:** `forced-choice` (SHL OPQ-style — mark *most* and *least*
  like you), plus `likert` (1–5 agreement) and `multi-select` (SJT-style).
- **Trait scoring (in-app):** answers aggregate into a 7-trait profile. Content
  and trait tags live in YAML; the scoring algorithm lives here.
- **SHL-style report:** results are shown as **sten scores (1–10)** on a profile
  chart with the population-average band, percentiles, and original per-trait
  narrative interpretation.
- **Consistency analysis:** Test 1 ↔ Test 2 self-vs-others comparison (sten
  gaps + extreme-answer flags). Profiles persist in `localStorage`, so the
  comparison works across sittings (no backend).

## Run

```bash
npm install
npm run dev
# Test 1:  http://localhost:5173/?quiz-id=personality-test-1.yaml
# Test 2:  http://localhost:5173/?quiz-id=personality-test-2.yaml
```

Build: `npm run build` → static `dist/` (deploy anywhere, e.g. Vercel).
Quiz sets shipped: forced-choice (`personality-test-1.yaml`, `-2.yaml`) and
Likert variants (`personality-test-1-likert.yaml`, `-2-likert.yaml`).

## YAML schema

Shared metadata mirrors the `cca-numerical` sets (`title`, `subtitle`,
`section`, `quizNumber`, `practiceMode`, `testMode`).

```yaml
title: Consulting Personality Practice
subtitle: Personality Test 1
section: Self-perception
test: 1                 # 1 or 2 — drives the consistency comparison
scoring: trait          # vs. "correctness" used by numerical sets
format: forced-choice   # forced-choice | likert | multi-select (mixed allowed)
practiceMode: 0         # timer seconds; 0 = untimed
testMode: 0
questions:
  # Forced-choice (ipsative) — mark most + least; each statement a different trait
  - id: 1
    type: forced-choice
    statements:
      - { text: "I step up to lead when a group has no direction.", trait: leadership }
      - { text: "I explain complex ideas clearly.",                trait: communication }
      - { text: "I stay effective when priorities change.",        trait: adaptability }
      - { text: "I notice when a teammate is struggling.",         trait: empathy }

  # Likert (1–5 agreement) → one trait, optional reverse
  - id: 2
    type: likert
    trait: time_management
    reverse: false
    text: "<p>I plan my week so deadlines never surprise me.</p>"

  # Multi-select (SJT-style) → trait keyed per option
  - id: 3
    type: multi-select
    maxSelections: 2
    text: "<p>Select the two things you'd most likely do.</p>"
    options:
      - { text: "Re-focus the group on the objective", trait: leadership }
      - { text: "Summarise where we are",              trait: communication }
```

Valid traits: `leadership`, `communication`, `adaptability`, `empathy`,
`teamwork`, `time_management`, `cognitive`.

### Scoring model
All answer types project onto a common `[0,1]` contribution scale; a trait's
score = mean of its contributions × 100.
- **forced-choice:** within a block, *most* → 1, *least* → 0, others → 0.5 (ipsative).
- **likert:** `effective = reverse ? 6 - v : v`; contribution `= (effective-1)/4`.
- **multi-select:** each option is a binary item — selected → `weight` (default 1), else 0.

The 0–100 score is then expressed as a **sten (1–10)** for the report, standardised
against an illustrative population (see disclaimer).

---

> **Independent practice tool — not affiliated with or endorsed by Boston
> Consulting Group (BCG) or SHL.** BCG, SHL, OPQ, and Consulting Career
> Assessment are trademarks of their respective owners, used here only to
> describe what this tool helps you practise for. All questions and
> interpretations are original practice material. Sten scores are standardised
> against an illustrative population, **not SHL's proprietary norm group**, so
> they indicate relative standing, not an official SHL percentile.
