import yaml from "js-yaml";
import { ratingOptions, type Quiz, type Question } from "../types";
import { isTraitId } from "./traits";

// Loads and validates a quiz YAML from /quizzes/<id>, matching the
// cca-numerical convention of `?quiz-id=<file>.yaml`.

export function getQuizId(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("quiz-id") || "personality-test-1.yaml";
}

export async function loadQuiz(quizId: string): Promise<Quiz> {
  const res = await fetch(`/quizzes/${quizId}`);
  if (!res.ok) throw new Error(`Could not load quiz "${quizId}" (${res.status}).`);
  const text = await res.text();
  const data = yaml.load(text) as Quiz;
  validate(data, quizId);
  return data;
}

export function validate(quiz: Quiz, quizId: string): void {
  const errs: string[] = [];
  if (!quiz || typeof quiz !== "object") errs.push("file is empty or not an object");
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0)
    errs.push("missing a non-empty `questions` list");

  (quiz.questions || []).forEach((q: Question, i) => {
    const where = `question ${i + 1} (id ${q?.id ?? "?"})`;
    if (q.type === "likert" || q.type === "rating") {
      if (!isTraitId(q.trait)) errs.push(`${where}: ${q.type} needs a valid \`trait\``);
      if (!q.text) errs.push(`${where}: missing \`text\``);
      if (q.type === "rating" && ratingOptions(q).length < 2)
        errs.push(`${where}: rating needs a \`scale\` or at least 2 \`options\``);
    } else if (q.type === "multi-select" || q.type === "single-select") {
      if (!Array.isArray(q.options) || q.options.length < 2)
        errs.push(`${where}: needs at least 2 \`options\``);
      (q.options || []).forEach((o, j) => {
        if (!isTraitId(o.trait)) errs.push(`${where}: option ${j + 1} needs a valid \`trait\``);
      });
    } else if (q.type === "forced-choice") {
      if (!Array.isArray(q.statements) || q.statements.length < 3)
        errs.push(`${where}: forced-choice needs at least 3 \`statements\``);
      (q.statements || []).forEach((s, j) => {
        if (!isTraitId(s.trait)) errs.push(`${where}: statement ${j + 1} needs a valid \`trait\``);
        if (!s.text) errs.push(`${where}: statement ${j + 1} missing \`text\``);
      });
      const traits = new Set((q.statements || []).map((s) => s.trait));
      if ((q.statements || []).length && traits.size !== (q.statements || []).length)
        errs.push(`${where}: forced-choice statements must each be a different trait`);
    } else {
      errs.push(`${where}: unknown type "${(q as { type?: string }).type}"`);
    }
  });

  if (errs.length) {
    throw new Error(`Invalid quiz "${quizId}":\n- ${errs.join("\n- ")}`);
  }
}
