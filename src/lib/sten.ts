// SHL-style standardisation. The OPQ reports trait scores as STEN scores
// (Standard Ten): a 1–10 scale with mean 5.5 and standard deviation 2, derived
// by comparing a candidate against a norm group.
//
// IMPORTANT: SHL's real norm group is proprietary and not public, so we cannot
// reproduce their exact bandings. We standardise against an *illustrative*
// assumed population (mean 50, sd 20 on our 0–100 trait scale). The metric,
// chart, and interpretation mirror SHL's report format; the norming does not.

const POP_MEAN = 50;
const POP_SD = 20;

// Abramowitz–Stegun approximation of the standard normal CDF.
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function stenFromScore(score0to100: number): number {
  const z = (score0to100 - POP_MEAN) / POP_SD;
  return Math.min(10, Math.max(1, Math.round(5.5 + 2 * z)));
}

export function percentileFromScore(score0to100: number): number {
  const z = (score0to100 - POP_MEAN) / POP_SD;
  return Math.min(99, Math.max(1, Math.round(normalCdf(z) * 100)));
}

export type StenBand = "Low" | "Below average" | "Average" | "Above average" | "High";

export function bandForSten(sten: number): StenBand {
  if (sten <= 2) return "Low";
  if (sten <= 4) return "Below average";
  if (sten <= 6) return "Average";
  if (sten <= 8) return "Above average";
  return "High";
}

// SHL convention: stens 4–7 are the broad "average" middle of the population.
export const STEN_AVG_LOW = 4;
export const STEN_AVG_HIGH = 7;
