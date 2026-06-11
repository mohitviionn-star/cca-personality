import type { TraitProfile } from "./scoring";

// The reference product has no backend, so we persist the latest profile of
// each test in localStorage. That lets the results screen compute the Test 1 ↔
// Test 2 consistency comparison even across separate sittings.

const KEY = (test: 1 | 2) => `cca_profile_test${test}`;

export function saveProfile(test: 1 | 2, profile: TraitProfile): void {
  try {
    localStorage.setItem(KEY(test), JSON.stringify({ profile, at: Date.now() }));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function loadProfile(test: 1 | 2): TraitProfile | null {
  try {
    const raw = localStorage.getItem(KEY(test));
    if (!raw) return null;
    return (JSON.parse(raw).profile as TraitProfile) ?? null;
  } catch {
    return null;
  }
}
