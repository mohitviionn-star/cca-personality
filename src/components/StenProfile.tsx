import { TRAITS } from "../lib/traits";
import type { TraitProfile } from "../lib/scoring";
import { stenFromScore, percentileFromScore, bandForSten, STEN_AVG_LOW, STEN_AVG_HIGH } from "../lib/sten";

// SHL-style STEN profile chart: each trait on a 1–10 scale with the broad
// population-average band (stens 4–7) shaded and a marker at the trait's sten.
export default function StenProfile({
  profile,
  variant = "t1",
}: {
  profile: TraitProfile;
  variant?: "t1" | "t2";
}) {
  const dot = variant === "t2" ? "bg-blue-600" : "bg-brand";
  const cells = Array.from({ length: 10 }, (_, k) => k + 1);

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[140px_1fr_46px] items-center gap-3 text-[11px] text-neutral-400 pb-1">
        <span />
        <span className="flex justify-between px-1">
          <span>1</span><span>low</span><span className="font-medium">average</span><span>high</span><span>10</span>
        </span>
        <span className="text-right">sten</span>
      </div>

      {TRAITS.map((t) => {
        const sten = stenFromScore(profile[t.id]);
        const pct = percentileFromScore(profile[t.id]);
        return (
          <div key={t.id} className="grid grid-cols-[140px_1fr_46px] items-center gap-3">
            <div className="text-sm" title={`${pct}th percentile · ${bandForSten(sten)}`}>{t.label}</div>
            <div className="flex gap-[3px]">
              {cells.map((c) => {
                const inAvg = c >= STEN_AVG_LOW && c <= STEN_AVG_HIGH;
                const isSten = c === sten;
                return (
                  <div
                    key={c}
                    className={`h-6 flex-1 rounded-sm grid place-items-center ${
                      inAvg ? "bg-neutral-200/70" : "bg-neutral-100"
                    }`}
                  >
                    {isSten && <span className={`h-3.5 w-3.5 rounded-full ${dot}`} />}
                  </div>
                );
              })}
            </div>
            <div className="text-right text-sm font-semibold tabular-nums">{sten}</div>
          </div>
        );
      })}
    </div>
  );
}
