// The seven traits both BCG CCA personality tests measure. Test 1 captures
// self-perception, Test 2 captures how others would describe you; the platform
// compares the two for consistency.

export type TraitId =
  | "leadership"
  | "communication"
  | "adaptability"
  | "empathy"
  | "teamwork"
  | "time_management"
  | "cognitive";

export interface Trait {
  id: TraitId;
  label: string;
  description: string;
}

export const TRAITS: Trait[] = [
  { id: "leadership", label: "Leadership", description: "Ownership, driving direction in ambiguity, influencing others." },
  { id: "communication", label: "Communication", description: "Clear expression, listening, tailoring the message." },
  { id: "adaptability", label: "Adaptability", description: "Staying effective when priorities or plans shift." },
  { id: "empathy", label: "Empathy", description: "Reading others, building trust, responding to needs." },
  { id: "teamwork", label: "Teamwork", description: "Collaboration, sharing credit, collective outcomes." },
  { id: "time_management", label: "Time Management", description: "Prioritising, hitting deadlines, protecting quality." },
  { id: "cognitive", label: "Cognitive Style", description: "Structuring problems, reasoning with data." },
];

export const TRAIT_IDS = TRAITS.map((t) => t.id);
export const TRAIT_MAP: Record<TraitId, Trait> = Object.fromEntries(
  TRAITS.map((t) => [t.id, t])
) as Record<TraitId, Trait>;

export function isTraitId(x: unknown): x is TraitId {
  return typeof x === "string" && (TRAIT_IDS as string[]).includes(x);
}
