import { useEffect, useMemo, useState } from "react";
import {
  isFCAnswer,
  ratingOptions,
  type Answers,
  type FCAnswer,
  type Question,
  type Quiz,
} from "../types";
import { scoreQuiz, type TraitProfile } from "../lib/scoring";
import Html from "./Html";
import Disclaimer from "./Disclaimer";

const LIKERT = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

function isAnswered(q: Question, a: Answers[string] | undefined): boolean {
  if (q.type === "likert" || q.type === "single-select" || q.type === "rating")
    return typeof a === "number";
  if (q.type === "multi-select") return Array.isArray(a) && a.length >= (q.minSelections ?? 1);
  // forced-choice: ranked enough that the leftover is determined (n-1 picks)
  return isFCAnswer(a) && a.order.length >= q.statements.length - 1;
}

export default function QuizRunner({
  quiz,
  onFinish,
}: {
  quiz: Quiz;
  onFinish: (profile: TraitProfile) => void;
}) {
  const [step, setStep] = useState<"mode" | "run">("mode");
  const [mode, setMode] = useState<"practice" | "test">("practice");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  // One-step undo ("change your last response, but no further"): tracks the
  // single most recent pick so it — and only it — can be reverted.
  const [lastPick, setLastPick] = useState<{ qi: number; id: string } | null>(null);

  const started = step === "run";
  const testMode = mode === "test";
  const total = quiz.questions.length;
  const q = quiz.questions[i];
  const a = answers[String(q?.id)];

  // Personality sections are UNTIMED — there is no timer anywhere. Test Mode is
  // simply forward-only; Practice Mode lets you go back.
  const allAnswered = useMemo(
    () => quiz.questions.every((qq) => isAnswered(qq, answers[String(qq.id)])),
    [quiz.questions, answers]
  );

  function set(id: string | number, value: Answers[string]) {
    setAnswers((prev) => ({ ...prev, [String(id)]: value }));
  }

  function toggleMulti(id: string | number, idx: number, max?: number) {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[String(id)]) ? (prev[String(id)] as number[]) : [];
      let next: number[];
      if (cur.includes(idx)) next = cur.filter((x) => x !== idx);
      else if (max && cur.length >= max) next = cur; // cap reached
      else next = [...cur, idx];
      return { ...prev, [String(id)]: next };
    });
  }

  function finish(final?: Answers) {
    onFinish(scoreQuiz(quiz, final ?? answers));
  }

  // Progressive selection (OPQ32r): the candidate picks the statement that
  // describes them best; it's removed and they pick the best of the remaining.
  // When only one is left (order has n-1 picks), the block is complete and we
  // auto-advance, mirroring the real test.
  function pickFC(id: string | number, idx: number, statementCount: number) {
    const cur = isFCAnswer(answers[String(id)]) ? [...(answers[String(id)] as FCAnswer).order] : [];
    if (cur.includes(idx) || cur.length >= statementCount - 1) return; // ignore picked / complete
    const order = [...cur, idx];
    const next: Answers = { ...answers, [String(id)]: { order } };
    setAnswers(next);
    setLastPick({ qi: i, id: String(id) }); // this pick is now the only undoable one
    if (order.length === statementCount - 1) {
      // Block complete (only the implicit "least" statement is left) → advance
      // immediately, like the real OPQ32r. Batched with setAnswers above so the
      // next block renders directly with no intermediate "summary" flash.
      if (i < total - 1) setI((x) => x + 1);
      else finish(next);
    }
  }

  // Rating (Test 2): single ordered choice, auto-advances like forced-choice.
  function pickRating(id: string | number, idx: number) {
    const next: Answers = { ...answers, [String(id)]: idx };
    setAnswers(next);
    setLastPick({ qi: i, id: String(id) });
    if (i < total - 1) setTimeout(() => setI((x) => x + 1), 220);
    else setTimeout(() => finish(next), 220);
  }

  // Revert exactly the last response (and nothing before it), per the
  // assessment's "you can change your last response, but not go back further".
  function undoLast() {
    if (!lastPick) return;
    setAnswers((p) => {
      const copy = { ...p };
      const prevAns = copy[lastPick.id];
      if (isFCAnswer(prevAns)) copy[lastPick.id] = { order: prevAns.order.slice(0, -1) };
      else delete copy[lastPick.id]; // rating/likert/single → clear it
      return copy;
    });
    setI(lastPick.qi);
    setLastPick(null); // can't go back further than the last response
  }

  // Keyboard: 1–5 answers a Likert item; Enter/→ advances; ← undoes (FC) or
  // goes back (other types).
  useEffect(() => {
    if (!started || !q) return;
    function onKey(e: KeyboardEvent) {
      if (q.type === "forced-choice") {
        if (e.key === "ArrowLeft") undoLast();
        return;
      }
      if (q.type === "rating") {
        if (e.key === "ArrowLeft") undoLast();
        else {
          const n = ratingOptions(q).length;
          const d = Number(e.key);
          if (d >= 1 && d <= n) pickRating(q.id, d - 1);
        }
        return;
      }
      if (q.type === "likert" && e.key >= "1" && e.key <= "5") {
        set(q.id, Number(e.key));
      } else if ((e.key === "Enter" || e.key === "ArrowRight") && isAnswered(q, answers[String(q.id)])) {
        if (i < total - 1) setI((x) => x + 1);
        else if (allAnswered) finish();
      } else if (e.key === "ArrowLeft" && i > 0 && !testMode) {
        setI((x) => x - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, q, i, total, answers, allAnswered, lastPick]);

  // ---- Select Mode screen ----
  if (step === "mode") {
    return (
      <div className="max-w-md mx-auto px-5 py-14">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-brand">{quiz.section}</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Select Mode</h1>
          <p className="text-neutral-500 mt-1 text-sm">
            {quiz.subtitle} · {total} questions
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                setMode("practice");
                setStep("run");
              }}
              className="flex w-full items-center gap-4 rounded-2xl border border-neutral-200 p-5 text-left transition hover:border-brand hover:shadow-sm"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand text-xl">▶</span>
              <span>
                <span className="block text-lg font-semibold">Practice Mode</span>
                <span className="block text-sm text-neutral-500">Untimed — take it at your own pace.</span>
              </span>
            </button>

            <button
              onClick={() => {
                setMode("test");
                setStep("run"); // personality is untimed → straight into the assessment
              }}
              className="flex w-full items-center gap-4 rounded-2xl border border-neutral-200 p-5 text-left transition hover:border-brand hover:shadow-sm"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand text-xl">◷</span>
              <span>
                <span className="block text-lg font-semibold">Test Mode</span>
                <span className="block text-sm text-neutral-500">
                  Exam conditions — forward-only, untimed.
                </span>
              </span>
            </button>
          </div>

          <div className="mt-6 border-t border-neutral-100 pt-4">
            <Disclaimer />
          </div>
        </div>
      </div>
    );
  }

  // ---- Question screen ----
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold uppercase tracking-wide text-brand">
          Question {i + 1} <span className="text-neutral-400">of</span> {total}
        </span>
        <span className="text-sm text-neutral-500 hidden sm:inline">
          {quiz.section || quiz.title}
        </span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
        <div className="h-full bg-brand transition-all" style={{ width: `${((i + 1) / total) * 100}%` }} />
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 shadow-sm">
        {q.type === "forced-choice" ? (
          <div className="text-center">
            <h2 className="text-xl text-neutral-700">
              Which statement describes you <strong className="font-bold text-neutral-900">best</strong>?
            </h2>
            <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Pick {(isFCAnswer(a) ? a.order.length : 0) + 1} of {q.statements.length - 1}
            </div>
          </div>
        ) : (
          <Html html={q.text} />
        )}

        {q.type === "likert" && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
            {LIKERT.map((l) => (
              <button
                key={l.value}
                onClick={() => set(q.id, l.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                  a === l.value
                    ? "border-brand bg-brand text-white font-semibold"
                    : "border-neutral-300 hover:border-brand"
                }`}
              >
                {l.label}
              </button>
            ))}
            <p className="sm:col-span-5 text-xs text-neutral-400 mt-1">
              Tip: press <kbd className="font-mono">1</kbd>–<kbd className="font-mono">5</kbd>, then{" "}
              <kbd className="font-mono">Enter</kbd>.
            </p>
          </div>
        )}

        {q.type === "single-select" && (
          <div className="mt-4 space-y-2">
            {q.options.map((o, idx) => (
              <button
                key={idx}
                onClick={() => set(q.id, idx)}
                className={`block w-full text-left rounded-lg border px-4 py-3 transition ${
                  a === idx ? "border-brand bg-brand/5" : "border-neutral-300 hover:border-brand"
                }`}
              >
                {o.text}
              </button>
            ))}
          </div>
        )}

        {q.type === "multi-select" && (
          <div className="mt-4 space-y-2">
            {q.maxSelections && (
              <p className="text-xs text-neutral-500">Select up to {q.maxSelections}.</p>
            )}
            {q.options.map((o, idx) => {
              const sel = Array.isArray(a) && a.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleMulti(q.id, idx, q.maxSelections)}
                  className={`flex w-full items-center gap-3 text-left rounded-lg border px-4 py-3 transition ${
                    sel ? "border-brand bg-brand/5" : "border-neutral-300 hover:border-brand"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border ${
                      sel ? "bg-brand border-brand text-white" : "border-neutral-400"
                    }`}
                  >
                    {sel ? "✓" : ""}
                  </span>
                  {o.text}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "forced-choice" &&
          (() => {
            const order = isFCAnswer(a) ? a.order : [];
            return (
              <div className="mt-5 space-y-3">
                {q.statements.map((s, idx) =>
                  order.includes(idx) ? null : (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => pickFC(q.id, idx, q.statements.length)}
                      className="block w-full rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-center text-neutral-700 transition hover:border-brand hover:bg-brand/5 hover:shadow-sm"
                    >
                      {s.text}
                    </button>
                  )
                )}
              </div>
            );
          })()}

        {q.type === "rating" && (
          <div className="mt-5 space-y-3">
            {ratingOptions(q).map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => pickRating(q.id, idx)}
                className={`block w-full rounded-xl border px-5 py-4 text-center transition hover:shadow-sm ${
                  a === idx
                    ? "border-brand bg-brand text-white"
                    : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-brand hover:bg-brand/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {q.type === "forced-choice" || q.type === "rating" ? (
        // Selection auto-advances; the only control is the one-step undo.
        <div className="mt-6 flex items-center justify-start">
          <button
            className="rounded-lg border border-neutral-300 px-5 py-2.5 font-semibold disabled:opacity-40 hover:bg-neutral-50"
            onClick={undoLast}
            disabled={!lastPick}
            title={lastPick ? "Change your last response" : "You can only change your last response"}
          >
            ← Back
          </button>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-between">
          <button
            className="rounded-lg border border-neutral-300 px-5 py-2.5 font-semibold disabled:opacity-40 hover:bg-neutral-50"
            onClick={() => setI((x) => Math.max(0, x - 1))}
            disabled={i === 0 || testMode}
            title={testMode ? "Test mode is forward-only" : undefined}
          >
            Back
          </button>
          {i < total - 1 ? (
            <button
              className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white disabled:opacity-40 hover:brightness-110"
              onClick={() => setI((x) => Math.min(total - 1, x + 1))}
              disabled={!isAnswered(q, a)}
            >
              Next
            </button>
          ) : (
            <button
              className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white disabled:opacity-40 hover:brightness-110"
              onClick={() => finish()}
              disabled={!allAnswered}
            >
              Finish &amp; see results
            </button>
          )}
        </div>
      )}
    </div>
  );
}
