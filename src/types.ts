import type { TraitId } from "./lib/traits";

// Quiz schema — mirrors the existing cca-numerical YAML conventions
// (title/subtitle/section/quizNumber/practiceMode/testMode/questions[]) and
// extends them with personality scoring: `scoring: trait` + the likert /
// multi-select question types, each carrying trait tags.

export type ScoringMode = "trait" | "correctness";

export interface LikertQuestion {
  id: number | string;
  type: "likert";
  trait: TraitId;
  reverse?: boolean; // negatively-worded item → reverse-scored
  text: string; // raw HTML
}

export interface TraitOption {
  text: string;
  trait: TraitId;
  weight?: number; // contribution when selected (default 1)
}

export interface MultiSelectQuestion {
  id: number | string;
  type: "multi-select";
  text: string;
  options: TraitOption[];
  maxSelections?: number;
  minSelections?: number;
}

export interface SingleSelectQuestion {
  id: number | string;
  type: "single-select";
  text: string;
  options: TraitOption[];
}

// Forced-choice (ipsative) — the SHL OPQ32r format. A block of statements (each
// a different trait). The candidate ranks them by progressive selection: pick
// the one most like them, it locks, then pick the most of those remaining; the
// leftover is implicitly the least. Designed so you cannot rate everything high.
export interface FCStatement {
  text: string;
  trait: TraitId;
}

export interface ForcedChoiceQuestion {
  id: number | string;
  type: "forced-choice";
  text?: string; // optional block instruction (raw HTML)
  statements: FCStatement[]; // typically 3 (OPQ32r triplet); each a different trait
}

// Rating (Test 2 style) — "how would others rate you" on an ordered scale.
// One trait per question; the chosen option's index (low → high) scores. The
// scale can be a named preset or inline `options`.
export interface RatingQuestion {
  id: number | string;
  type: "rating";
  trait: TraitId;
  text: string; // raw HTML prompt
  scale?: keyof typeof SCALE_PRESETS; // named scale preset
  options?: string[]; // or inline options, ordered low → high
}

// Ordered rating-scale presets (each low → high). These mirror the kinds of
// scales the assessment uses for the external-perception section.
export const SCALE_PRESETS = {
  percentile: [
    "In the bottom 50% compared to others",
    "In the top 50% compared to others",
    "In the top 25% compared to others",
    "In the top 10% compared to others",
  ],
  frequency: ["Rarely", "Occasionally", "Some of the time", "Most of the time", "Always"],
  speed: [
    "Somewhat slower than others",
    "About as fast as others",
    "Somewhat faster than others",
    "Much faster than others",
  ],
  behavior: [
    "I don't know how others would rate me",
    "Rarely demonstrate this behavior",
    "Sometimes demonstrate this behavior",
    "Occasionally demonstrate this behavior",
    "Usually demonstrate this behavior",
    "Consistently demonstrate this behavior",
  ],
} as const;

export function ratingOptions(q: RatingQuestion): string[] {
  if (q.options && q.options.length) return q.options;
  if (q.scale && SCALE_PRESETS[q.scale]) return [...SCALE_PRESETS[q.scale]];
  return [...SCALE_PRESETS.percentile];
}

export type Question =
  | LikertQuestion
  | MultiSelectQuestion
  | SingleSelectQuestion
  | ForcedChoiceQuestion
  | RatingQuestion;

export interface Quiz {
  title: string;
  subtitle?: string;
  section?: string;
  quizNumber?: number;
  test?: 1 | 2; // which personality test (for consistency comparison)
  scoring?: ScoringMode; // "trait" for personality
  scale?: string; // e.g. "likert5"
  practiceMode?: number; // timer seconds (0/undefined = untimed)
  testMode?: number;
  questions: Question[];
}

// An answer is a Likert value (1..5), a single-select option index, a list of
// selected option indices (multi-select), or a forced-choice ranking: statement
// indices ordered best→worst by progressive selection (the leftover is implied).
export interface FCAnswer {
  order: number[]; // statement indices, most-like first; length === statements-1 when complete
}
export type Answer = number | number[] | FCAnswer;
export type Answers = Record<string, Answer>;

export function isFCAnswer(a: Answer | undefined): a is FCAnswer {
  return !!a && typeof a === "object" && !Array.isArray(a) && "order" in a;
}
