import { describe, it, expect } from "vitest";
import { scoreQuiz, buildFeedback, bandOf, appearancesByTrait, type TraitProfile } from "./scoring";
import { TRAIT_IDS, type TraitId } from "./traits";
import type { Quiz } from "../types";

// Build a full 7-trait profile from partial overrides (rest default to `fill`).
function prof(partial: Partial<Record<TraitId, number>>, fill = 50): TraitProfile {
  const p = {} as TraitProfile;
  for (const t of TRAIT_IDS) p[t] = partial[t] ?? fill;
  return p;
}

function quiz(questions: Quiz["questions"]): Quiz {
  return { title: "test", scoring: "trait", questions };
}

describe("scoreQuiz — per question type", () => {
  it("likert maps 1..5 onto 0..100 via (v-1)/4", () => {
    expect(scoreQuiz(quiz([{ id: 1, type: "likert", trait: "leadership", text: "x" }]), { "1": 5 }).leadership).toBe(100);
    expect(scoreQuiz(quiz([{ id: 1, type: "likert", trait: "leadership", text: "x" }]), { "1": 1 }).leadership).toBe(0);
    expect(scoreQuiz(quiz([{ id: 1, type: "likert", trait: "leadership", text: "x" }]), { "1": 3 }).leadership).toBe(50);
  });

  it("likert reverse flips the scale (6 - v)", () => {
    const q = quiz([{ id: 1, type: "likert", trait: "leadership", reverse: true, text: "x" }]);
    expect(scoreQuiz(q, { "1": 5 }).leadership).toBe(0); // eff = 1
    expect(scoreQuiz(q, { "1": 1 }).leadership).toBe(100); // eff = 5
  });

  it("single-select credits the chosen option's trait by its weight", () => {
    const q = quiz([
      {
        id: 1,
        type: "single-select",
        text: "x",
        options: [
          { text: "a", trait: "teamwork", weight: 1 },
          { text: "b", trait: "empathy" },
        ],
      },
    ]);
    expect(scoreQuiz(q, { "1": 0 }).teamwork).toBe(100);
  });

  it("multi-select scores each option as a binary item for its trait", () => {
    // three teamwork options, two selected → mean(1,1,0) = 0.667 → 67
    const q = quiz([
      {
        id: 1,
        type: "multi-select",
        text: "x",
        options: [
          { text: "a", trait: "teamwork" },
          { text: "b", trait: "teamwork" },
          { text: "c", trait: "teamwork" },
        ],
      },
    ]);
    expect(scoreQuiz(q, { "1": [0, 1] }).teamwork).toBe(67);
  });

  it("rating maps the chosen band index onto 0..100", () => {
    const q = quiz([{ id: 1, type: "rating", trait: "cognitive", scale: "percentile", text: "x" }]); // 4 bands
    expect(scoreQuiz(q, { "1": 3 }).cognitive).toBe(100);
    expect(scoreQuiz(q, { "1": 0 }).cognitive).toBe(0);
  });

  it("forced-choice ranks the block: top→100, mid→50, leftover→0", () => {
    const q = quiz([
      {
        id: 1,
        type: "forced-choice",
        statements: [
          { text: "a", trait: "leadership" },
          { text: "b", trait: "communication" },
          { text: "c", trait: "adaptability" },
        ],
      },
    ]);
    // picked stmt0 best, stmt1 next; stmt2 is the implicit leftover (least)
    const p = scoreQuiz(q, { "1": { order: [0, 1] } });
    expect(p.leadership).toBe(100);
    expect(p.communication).toBe(50);
    expect(p.adaptability).toBe(0);
  });

  it("forced-choice respects a different pick order", () => {
    const q = quiz([
      {
        id: 1,
        type: "forced-choice",
        statements: [
          { text: "a", trait: "leadership" },
          { text: "b", trait: "communication" },
          { text: "c", trait: "adaptability" },
        ],
      },
    ]);
    const p = scoreQuiz(q, { "1": { order: [1, 2] } }); // comm best, adapt next, leadership leftover
    expect(p.communication).toBe(100);
    expect(p.adaptability).toBe(50);
    expect(p.leadership).toBe(0);
  });

  it("untouched traits default to 50 and all 7 traits are always present", () => {
    const p = scoreQuiz(quiz([{ id: 1, type: "likert", trait: "leadership", text: "x" }]), { "1": 4 });
    for (const t of TRAIT_IDS) expect(typeof p[t]).toBe("number");
    expect(p.empathy).toBe(50); // never measured
  });
});

describe("bandOf", () => {
  it("bands scores into Low / Moderate / High", () => {
    expect(bandOf(100)).toBe("High");
    expect(bandOf(70)).toBe("High");
    expect(bandOf(69)).toBe("Moderate");
    expect(bandOf(45)).toBe("Moderate");
    expect(bandOf(44)).toBe("Low");
    expect(bandOf(0)).toBe("Low");
  });
});

describe("appearancesByTrait", () => {
  it("counts how many items measure each trait", () => {
    const q = quiz([
      { id: 1, type: "likert", trait: "leadership", text: "x" },
      {
        id: 2,
        type: "forced-choice",
        statements: [
          { text: "a", trait: "leadership" },
          { text: "b", trait: "communication" },
          { text: "c", trait: "adaptability" },
        ],
      },
    ]);
    const counts = appearancesByTrait(q);
    expect(counts.leadership).toBe(2); // likert + 1 FC statement
    expect(counts.communication).toBe(1);
    expect(counts.empathy).toBe(0);
  });
});

describe("buildFeedback — self vs. others consistency", () => {
  it("identical profiles → perfect consistency, no flags", () => {
    const fb = buildFeedback(prof({}), prof({}));
    expect(fb.consistencyScore).toBe(100);
    expect(fb.inconsistencies).toHaveLength(0);
    expect(fb.extremes).toHaveLength(0);
    expect(fb.summary).toMatch(/coherent profile/i);
  });

  it("a single large gap is flagged and surfaced in the summary", () => {
    const fb = buildFeedback(prof({ leadership: 80 }), prof({ leadership: 40 }));
    // one gap of 40 over 7 traits → avg ≈ 5.71 → 94
    expect(fb.consistencyScore).toBe(94);
    expect(fb.gaps[0].trait).toBe("leadership"); // largest gap first
    expect(fb.gaps[0].gap).toBe(40);
    expect(fb.inconsistencies.map((g) => g.trait)).toEqual(["leadership"]);
    expect(fb.summary).toMatch(/Leadership/);
  });

  it("does not flag gaps at or below the threshold (25)", () => {
    const fb = buildFeedback(prof({ leadership: 60 }), prof({ leadership: 35 })); // gap exactly 25
    expect(fb.inconsistencies).toHaveLength(0);
  });

  it("detects extreme high/low scores in both tests", () => {
    const fb = buildFeedback(prof({ leadership: 90 }), prof({ leadership: 90 }));
    expect(fb.extremes).toHaveLength(2); // high in test 1 and test 2
    expect(fb.extremes.every((e) => e.kind === "high")).toBe(true);
    expect(fb.summary).toMatch(/extreme scores/i);
  });

  it("consistency score is clamped at 0 for maximal disagreement", () => {
    const fb = buildFeedback(prof({}, 100), prof({}, 0));
    expect(fb.consistencyScore).toBe(0);
    expect(fb.inconsistencies).toHaveLength(TRAIT_IDS.length);
  });
});
