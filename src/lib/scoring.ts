import { TRAIT_IDS, TRAIT_MAP, type TraitId } from "./traits";
import { isFCAnswer, ratingOptions, type Answers, type Quiz } from "../types";

export type TraitProfile = Record<TraitId, number>; // each 0–100

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function emptyContribs(): Record<TraitId, number[]> {
  const o = {} as Record<TraitId, number[]>;
  for (const t of TRAIT_IDS) o[t] = [];
  return o;
}

// Unify Likert and multi/single-select onto a common [0,1] contribution scale,
// then a trait's score is the mean of its contributions × 100.
//
//  - Likert (1–5): effective = reverse ? 6 - v : v;  contribution = (effective-1)/4
//  - single-select: chosen option contributes its weight (default 1) to its trait
//  - multi-select: each option is a binary item for its trait —
//                  selected → weight (default 1), not selected → 0
function accumulate(quiz: Quiz, answers: Answers): Record<TraitId, number[]> {
  const contribs = emptyContribs();

  for (const q of quiz.questions) {
    const a = answers[String(q.id)];

    if (q.type === "likert") {
      if (typeof a !== "number") continue;
      const eff = q.reverse ? 6 - a : a;
      contribs[q.trait].push(clamp01((eff - 1) / 4));
    } else if (q.type === "single-select") {
      if (typeof a !== "number") continue;
      const opt = q.options[a];
      if (opt) contribs[opt.trait].push(clamp01(opt.weight ?? 1));
    } else if (q.type === "multi-select") {
      const sel = Array.isArray(a) ? a : [];
      q.options.forEach((opt, i) => {
        contribs[opt.trait].push(sel.includes(i) ? clamp01(opt.weight ?? 1) : 0);
      });
    } else if (q.type === "rating") {
      // Ordered band: chosen index over (#options − 1) → [0,1].
      if (typeof a !== "number") continue;
      const n = ratingOptions(q).length;
      contribs[q.trait].push(n > 1 ? clamp01(a / (n - 1)) : 0.5);
    } else if (q.type === "forced-choice") {
      // Ipsative (OPQ32r): the candidate ranks the block by progressive
      // selection. Build the full ranking (picked order, then the leftover) and
      // map rank position to a [0,1] contribution: top rank → 1, bottom → 0,
      // evenly spaced in between. Over many blocks this yields a relative profile.
      if (!isFCAnswer(a)) continue;
      const n = q.statements.length;
      const ranked = [...a.order];
      for (let i = 0; i < n; i++) if (!ranked.includes(i)) ranked.push(i); // append leftover(s)
      ranked.forEach((stmtIdx, rankPos) => {
        const v = n > 1 ? (n - 1 - rankPos) / (n - 1) : 0.5;
        contribs[q.statements[stmtIdx].trait].push(v);
      });
    }
  }

  return contribs;
}

export function scoreQuiz(quiz: Quiz, answers: Answers): TraitProfile {
  const contribs = accumulate(quiz, answers);
  const profile = {} as TraitProfile;
  for (const t of TRAIT_IDS) {
    const xs = contribs[t];
    profile[t] = xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) : 50;
  }
  return profile;
}

// ----- Competency report helpers -----

export type Level = "Low" | "Moderate" | "High";

export function bandOf(score: number): Level {
  if (score >= 70) return "High";
  if (score >= 45) return "Moderate";
  return "Low";
}

// How many items measure each trait (used to express a score as points/max).
export function appearancesByTrait(quiz: Quiz): Record<TraitId, number> {
  const counts = Object.fromEntries(TRAIT_IDS.map((t) => [t, 0])) as Record<TraitId, number>;
  for (const q of quiz.questions) {
    if (q.type === "likert" || q.type === "rating") counts[q.trait] += 1;
    else if (q.type === "single-select" || q.type === "multi-select")
      q.options.forEach((o) => (counts[o.trait] += 1));
    else if (q.type === "forced-choice") q.statements.forEach((s) => (counts[s.trait] += 1));
  }
  return counts;
}

// ----- Consistency analysis (Test 1 self vs Test 2 others) -----

export interface TraitGap {
  trait: TraitId;
  label: string;
  test1: number;
  test2: number;
  gap: number;
}

export interface Feedback {
  consistencyScore: number; // 0–100
  gaps: TraitGap[]; // largest gap first
  inconsistencies: TraitGap[]; // gap > 25
  extremes: { trait: TraitId; label: string; value: number; kind: "high" | "low"; test: 1 | 2 }[];
  summary: string;
}

const GAP_FLAG = 25;
const HIGH = 88;
const LOW = 12;

export function buildFeedback(p1: TraitProfile, p2: TraitProfile): Feedback {
  const gaps: TraitGap[] = TRAIT_IDS.map((t) => ({
    trait: t,
    label: TRAIT_MAP[t].label,
    test1: p1[t],
    test2: p2[t],
    gap: Math.abs(p1[t] - p2[t]),
  })).sort((a, b) => b.gap - a.gap);

  const avgGap = gaps.reduce((s, g) => s + g.gap, 0) / gaps.length;
  const consistencyScore = Math.max(0, Math.round(100 - avgGap));
  const inconsistencies = gaps.filter((g) => g.gap > GAP_FLAG);

  const extremes: Feedback["extremes"] = [];
  for (const t of TRAIT_IDS) {
    for (const [test, prof] of [
      [1, p1],
      [2, p2],
    ] as const) {
      const v = prof[t];
      if (v >= HIGH) extremes.push({ trait: t, label: TRAIT_MAP[t].label, value: v, kind: "high", test });
      else if (v <= LOW) extremes.push({ trait: t, label: TRAIT_MAP[t].label, value: v, kind: "low", test });
    }
  }

  let summary: string;
  if (consistencyScore >= 80 && inconsistencies.length === 0) {
    summary =
      "Strong, coherent profile. Your self-view and how others perceive you line up well — exactly what BCG's scoring rewards.";
  } else if (inconsistencies.length > 0) {
    summary = `Watch the gap on ${inconsistencies
      .slice(0, 2)
      .map((g) => g.label)
      .join(" and ")}. Large differences between how you rate yourself and how others see you can flag your profile as inconsistent.`;
  } else {
    summary = "Reasonably consistent — tighten the largest gaps so both profiles tell the same story.";
  }
  if (extremes.length > 0) {
    summary +=
      " You also have extreme scores on some traits; BCG prefers well-rounded candidates, so avoid sitting at the very top or bottom of any dimension.";
  }

  return { consistencyScore, gaps, inconsistencies, extremes, summary };
}
