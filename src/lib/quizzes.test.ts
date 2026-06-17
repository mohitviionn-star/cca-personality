import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { validate } from "./loadQuiz";
import { scoreQuiz, buildFeedback } from "./scoring";
import { TRAIT_IDS } from "./traits";
import type { Answers, Quiz } from "../types";

const QUIZ_DIR = path.resolve(__dirname, "../../public/quizzes");

function loadYaml(name: string): Quiz {
  return yaml.load(fs.readFileSync(path.join(QUIZ_DIR, name), "utf8")) as Quiz;
}

// A complete, valid set of answers for every question in a quiz.
function fullAnswers(quiz: Quiz): Answers {
  const a: Answers = {};
  for (const q of quiz.questions) {
    const id = String(q.id);
    if (q.type === "likert") a[id] = 4;
    else if (q.type === "rating") a[id] = 1;
    else if (q.type === "single-select") a[id] = 0;
    else if (q.type === "multi-select") a[id] = [0];
    else if (q.type === "forced-choice")
      a[id] = { order: q.statements.map((_, i) => i).slice(0, q.statements.length - 1) };
  }
  return a;
}

const SHIPPED = [
  "personality-test-1.yaml",
  "personality-test-2.yaml",
  "personality-test-1-likert.yaml",
  "personality-test-2-likert.yaml",
];

describe("shipped quiz content", () => {
  for (const name of SHIPPED) {
    describe(name, () => {
      const quiz = loadYaml(name);

      it("passes the loader's validation", () => {
        expect(() => validate(quiz, name)).not.toThrow();
      });

      it("scores to a complete, in-range 7-trait profile", () => {
        const p = scoreQuiz(quiz, fullAnswers(quiz));
        for (const t of TRAIT_IDS) {
          expect(p[t], `${name} trait ${t}`).toBeGreaterThanOrEqual(0);
          expect(p[t]).toBeLessThanOrEqual(100);
          expect(Number.isInteger(p[t])).toBe(true);
        }
      });
    });
  }

  it("Test 1 + Test 2 produce a usable consistency report", () => {
    const t1 = loadYaml("personality-test-1.yaml");
    const t2 = loadYaml("personality-test-2.yaml");
    const p1 = scoreQuiz(t1, fullAnswers(t1));
    const p2 = scoreQuiz(t2, fullAnswers(t2));
    const fb = buildFeedback(p1, p2);
    expect(fb.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(fb.consistencyScore).toBeLessThanOrEqual(100);
    expect(fb.gaps).toHaveLength(TRAIT_IDS.length);
    expect(fb.summary.length).toBeGreaterThan(0);
  });

  it("Test 1 covers all seven traits", () => {
    const t1 = loadYaml("personality-test-1.yaml");
    const counts = TRAIT_IDS.map((t) =>
      t1.questions
        .filter((q): q is Extract<typeof q, { type: "forced-choice" }> => q.type === "forced-choice")
        .flatMap((q) => q.statements)
        .filter((s) => s.trait === t).length
    );
    expect(counts.every((c) => c > 0)).toBe(true);
  });
});

describe("validate — rejects malformed quizzes", () => {
  it("rejects an empty questions list", () => {
    expect(() => validate({ title: "x", questions: [] } as Quiz, "bad")).toThrow(/non-empty/);
  });

  it("rejects a forced-choice block with fewer than 3 statements", () => {
    const q = {
      title: "x",
      questions: [
        {
          id: 1,
          type: "forced-choice",
          statements: [
            { text: "a", trait: "leadership" },
            { text: "b", trait: "communication" },
          ],
        },
      ],
    } as Quiz;
    expect(() => validate(q, "bad")).toThrow(/at least 3/);
  });

  it("rejects a forced-choice block with duplicate traits", () => {
    const q = {
      title: "x",
      questions: [
        {
          id: 1,
          type: "forced-choice",
          statements: [
            { text: "a", trait: "leadership" },
            { text: "b", trait: "leadership" },
            { text: "c", trait: "communication" },
          ],
        },
      ],
    } as Quiz;
    expect(() => validate(q, "bad")).toThrow(/different trait/);
  });

  it("rejects a likert question without a valid trait", () => {
    const q = {
      title: "x",
      questions: [{ id: 1, type: "likert", trait: "nonsense", text: "x" }],
    } as unknown as Quiz;
    expect(() => validate(q, "bad")).toThrow(/valid `trait`/);
  });

  it("rejects an unknown question type", () => {
    const q = { title: "x", questions: [{ id: 1, type: "mystery" }] } as unknown as Quiz;
    expect(() => validate(q, "bad")).toThrow(/unknown type/);
  });
});
