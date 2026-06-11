import { TRAITS } from "../lib/traits";
import type { TraitProfile } from "../lib/scoring";

// Labelled bar per trait. `variant` colours Test 1 (self) vs Test 2 (others).
export default function TraitBars({
  profile,
  variant = "t1",
}: {
  profile: TraitProfile;
  variant?: "t1" | "t2";
}) {
  const fill = variant === "t2" ? "bg-blue-500" : "bg-brand";
  return (
    <div className="space-y-2">
      {TRAITS.map((t) => {
        const v = profile[t.id];
        return (
          <div key={t.id} className="grid grid-cols-[120px_1fr_34px] items-center gap-3">
            <div className="text-sm">{t.label}</div>
            <div className="h-2.5 rounded-full bg-neutral-200 overflow-hidden">
              <div className={`h-full rounded-full ${fill}`} style={{ width: `${v}%` }} />
            </div>
            <div className="text-sm tabular-nums text-neutral-500 text-right">{v}</div>
          </div>
        );
      })}
    </div>
  );
}
