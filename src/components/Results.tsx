import { buildFeedback, bandOf, appearancesByTrait, type Level, type TraitProfile } from "../lib/scoring";
import { loadProfile } from "../lib/storage";
import { TRAITS } from "../lib/traits";
import { levelDescription, DEV_SUGGESTIONS } from "../lib/narratives";
import type { Quiz } from "../types";
import RadarChart from "./RadarChart";
import Disclaimer from "./Disclaimer";

const LEVEL_PILL: Record<Level, string> = {
  Low: "bg-orange-100 text-orange-700",
  Moderate: "bg-yellow-100 text-yellow-800",
  High: "bg-green-100 text-green-700",
};

export default function Results({
  test,
  profile,
  quiz,
  onRetake,
}: {
  test: 1 | 2;
  profile: TraitProfile;
  quiz: Quiz;
  onRetake: () => void;
}) {
  const counts = appearancesByTrait(quiz);
  const rows = TRAITS.map((t) => {
    const score = profile[t.id];
    const max = Math.max(1, counts[t.id]);
    const points = Math.round((score / 100) * max);
    const level = bandOf(score);
    return { trait: t, score, max, points, level };
  });

  // Development suggestions for the lower traits (Low; fall back to the 2 lowest).
  let dev = rows.filter((r) => r.level === "Low");
  if (dev.length === 0) dev = [...rows].sort((a, b) => a.score - b.score).slice(0, 2);

  const other = test === 1 ? 2 : 1;
  const otherProfile = loadProfile(other);
  const p1 = test === 1 ? profile : otherProfile;
  const p2 = test === 2 ? profile : otherProfile;
  const feedback = p1 && p2 ? buildFeedback(p1, p2) : null;

  function download() {
    const payload = {
      test,
      traits: rows.map((r) => ({
        trait: r.trait.label,
        score: `${r.points}/${r.max}`,
        level: r.level,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `personality-test-${test}-results.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10 space-y-8">
      {/* Competency Assessment Profile */}
      <section>
        <h1 className="text-xl font-bold text-brand">Competency Assessment Profile</h1>
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand text-white text-left">
                <th className="px-4 py-2.5 font-semibold">Trait</th>
                <th className="px-4 py-2.5 font-semibold">Score</th>
                <th className="px-4 py-2.5 font-semibold">Level</th>
                <th className="px-4 py-2.5 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.trait.id} className={idx % 2 ? "bg-neutral-50" : "bg-white"}>
                  <td className="px-4 py-3 font-medium">{r.trait.label}</td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    {r.points}/{r.max}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_PILL[r.level]}`}>
                      {r.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{levelDescription(r.trait.id, r.level)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Note: the score is based on weighted points from your answers, with more weight given to first
          choices; it is compared to the maximum possible and converted into a three-level band
          (Low → High).
        </p>
      </section>

      {/* Radar + Development Suggestions */}
      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold text-brand">Behavioral Traits Radar</h2>
          <div className="mt-2 flex justify-center">
            <RadarChart profile={profile} color={test === 2 ? "#3b82f6" : "#1ea672"} />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand">Development Suggestions</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {dev.map((r) => (
              <li key={r.trait.id}>
                <strong>{r.trait.label}</strong> — {DEV_SUGGESTIONS[r.trait.id]}
              </li>
            ))}
          </ul>
          <button
            onClick={download}
            className="mt-5 rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:brightness-110"
          >
            Download Results
          </button>
        </div>
      </section>

      {/* Self-vs-others consistency (our addition) */}
      {feedback && p1 && p2 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-brand">Consistency: self vs. others</h2>
              <p className="text-sm text-neutral-500">Test 1 (self) compared with Test 2 (others).</p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${feedback.consistencyScore >= 80 ? "text-brand" : "text-amber-500"}`}>
                {feedback.consistencyScore}
              </div>
              <div className="text-xs text-neutral-400">/ 100</div>
            </div>
          </div>
          <div
            className={`mt-3 rounded-lg border-l-4 bg-neutral-50 px-4 py-3 text-sm ${
              feedback.inconsistencies.length ? "border-amber-400" : "border-brand"
            }`}
          >
            {feedback.summary}
          </div>
        </section>
      )}

      {!feedback && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 text-sm">
          Take <strong>Test {other}</strong> too to unlock the self-vs-others consistency analysis.{" "}
          <a className="text-brand underline" href={`/?quiz-id=personality-test-${other}.yaml`}>
            Go to Test {other}
          </a>
          .
        </section>
      )}

      <div className="flex justify-center">
        <button
          onClick={onRetake}
          className="rounded-full bg-brand px-10 py-2.5 font-semibold text-white hover:brightness-110"
        >
          Finished
        </button>
      </div>

      <Disclaimer />
    </div>
  );
}
