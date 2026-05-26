"use client";

type Verdict =
  | "JUST_RIGHT"
  | "TOO_LOW"
  | "TOO_HIGH"
  | "OVER_BUDGET"
  | "BORDERLINE";

const LABELS: Record<Verdict, { word: string; tone: "right" | "reject" | "maybe" }> = {
  JUST_RIGHT: { word: "Just right", tone: "right" },
  TOO_LOW: { word: "Too low", tone: "reject" },
  TOO_HIGH: { word: "Too high", tone: "reject" },
  OVER_BUDGET: { word: "Over budget", tone: "reject" },
  BORDERLINE: { word: "Borderline", tone: "maybe" },
};

const TONE_TEXT = {
  right: "text-[color:var(--right)]",
  reject: "text-[color:var(--reject)]",
  maybe: "text-[color:var(--maybe)]",
};

const TONE_DOT = {
  right: "bg-[color:var(--right)]",
  reject: "bg-[color:var(--reject)]",
  maybe: "bg-[color:var(--maybe)]",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const meta = LABELS[verdict];
  if (!meta) return null; // streaming may pass partial enum values before completion
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full ${TONE_DOT[meta.tone]}`}
      />
      <span className={`eyebrow ${TONE_TEXT[meta.tone]}`}>{meta.word}</span>
    </span>
  );
}
