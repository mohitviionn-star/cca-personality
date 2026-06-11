import { useEffect, useState } from "react";

// Countdown used only when a quiz defines a non-zero timer (numerical sets).
// Personality sections are untimed (seconds = 0), so the Timer isn't rendered.
export default function Timer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) {
      onExpire();
      return;
    }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onExpire]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const low = left <= 30;
  return (
    <span
      className={`inline-block rounded-lg px-4 py-1 text-base font-bold tabular-nums text-white ${
        low ? "bg-red-600" : "bg-brand"
      }`}
    >
      {mm}:{ss}
    </span>
  );
}
