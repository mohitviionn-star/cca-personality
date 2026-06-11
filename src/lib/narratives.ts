import type { TraitId } from "./traits";

// Original, plain-language interpretations for each trait at low / average / high
// standing. Mirrors the *style* of an SHL narrative report (what a score
// suggests in a work context) — all wording is our own.

type Band = "low" | "avg" | "high";

const TEXT: Record<TraitId, Record<Band, string>> = {
  leadership: {
    low: "Tends to prefer a supporting role and may hold back from taking charge or making the final call.",
    avg: "Will take the lead when needed but is comfortable letting others drive at other times.",
    high: "Readily takes ownership, sets direction in ambiguity, and is comfortable making the call.",
  },
  communication: {
    low: "May keep contributions brief or find it harder to land a point with a varied audience.",
    avg: "Communicates clearly in most settings and adapts the message reasonably well.",
    high: "Explains complex ideas clearly, tailors to the audience, and is comfortable with senior stakeholders.",
  },
  adaptability: {
    low: "Prefers stability and clear plans; sudden change or ambiguity may be unsettling.",
    avg: "Copes with change when it comes and adjusts without much difficulty.",
    high: "Thrives in ambiguity, re-plans quickly, and treats change as an opportunity.",
  },
  empathy: {
    low: "Focuses on the task and may pay less attention to how decisions land for others.",
    avg: "Reads people reasonably well and considers their perspective most of the time.",
    high: "Highly attuned to others, builds trust quickly, and responds to client and team needs.",
  },
  teamwork: {
    low: "Works well independently and may prefer autonomy over close collaboration.",
    avg: "Collaborates effectively and contributes to shared goals when working in a group.",
    high: "Puts collective outcomes first, shares credit, and actively supports teammates.",
  },
  time_management: {
    low: "May work reactively and feel time pressure more acutely near deadlines.",
    avg: "Generally organised, meets deadlines, and keeps competing demands in check.",
    high: "Plans ahead, prioritises ruthlessly, and protects quality under pressure.",
  },
  cognitive: {
    low: "May favour intuition or speed over structured, data-led analysis.",
    avg: "Brings a sound, logical approach to most problems.",
    high: "Structures complex problems instinctively and reasons rigorously from evidence.",
  },
};

export function narrative(trait: TraitId, sten: number): string {
  const band: Band = sten <= 4 ? "low" : sten >= 8 ? "high" : "avg";
  return TEXT[trait][band];
}

// Description for the competency table, by 3-level band (Low/Moderate/High).
export function levelDescription(trait: TraitId, level: "Low" | "Moderate" | "High"): string {
  const band: Band = level === "Low" ? "low" : level === "High" ? "high" : "avg";
  return TEXT[trait][band];
}

// Original, actionable development suggestions per trait (shown for lower traits).
export const DEV_SUGGESTIONS: Record<TraitId, string> = {
  leadership:
    "Volunteer to own a small initiative end-to-end, practise making the call with incomplete information, and watch how leaders you admire set direction.",
  communication:
    "Open with your headline before the detail, summarise discussions into one clear takeaway, and practise tailoring the message to senior audiences.",
  adaptability:
    "Deliberately take on unfamiliar tasks, build a habit of re-planning quickly when priorities shift, and reframe setbacks as new information.",
  empathy:
    "Practise active listening, ask one more question before responding, and check how a decision will land for the people it affects.",
  teamwork:
    "Share credit explicitly, take on an unglamorous part of a shared task, and build on others' ideas rather than competing with them.",
  time_management:
    "Plan the week around your few highest-value priorities, protect focused time, and aim to finish before the deadline rather than at it.",
  cognitive:
    "Structure a problem before solving it, reason from evidence to conclusion, and pressure-test your own assumptions before committing.",
};
