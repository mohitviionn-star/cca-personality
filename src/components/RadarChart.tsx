import { TRAITS } from "../lib/traits";
import type { TraitProfile } from "../lib/scoring";

// Behavioral Traits Radar — a 7-axis spider chart of the trait profile (0–100).
export default function RadarChart({
  profile,
  size = 280,
  color = "#1ea672",
}: {
  profile: TraitProfile;
  size?: number;
  color?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 46; // leave room for labels
  const n = TRAITS.length;

  // Axis angle for trait i (start at top, clockwise).
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, frac: number) => [cx + r * frac * Math.cos(angle(i)), cy + r * frac * Math.sin(angle(i))];

  const rings = [0.25, 0.5, 0.75, 1];
  const polygon = (frac: number) =>
    TRAITS.map((_, i) => point(i, frac).join(",")).join(" ");

  const dataPts = TRAITS.map((t, i) => point(i, Math.max(0, Math.min(1, profile[t.id] / 100))));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img" aria-label="Behavioral traits radar">
      {/* grid rings */}
      {rings.map((f) => (
        <polygon key={f} points={polygon(f)} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      ))}
      {/* axes */}
      {TRAITS.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />;
      })}
      {/* data polygon */}
      <polygon
        points={dataPts.map((p) => p.join(",")).join(" ")}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeWidth={2}
      />
      {dataPts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={color} />
      ))}
      {/* labels */}
      {TRAITS.map((t, i) => {
        const [x, y] = point(i, 1.18);
        return (
          <text
            key={t.id}
            x={x}
            y={y}
            textAnchor={Math.abs(x - cx) < 4 ? "middle" : x > cx ? "start" : "end"}
            dominantBaseline="middle"
            fontSize={10}
            fill="#6b7280"
          >
            {t.label}
          </text>
        );
      })}
    </svg>
  );
}
