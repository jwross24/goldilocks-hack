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
  // Stable width so the badge doesn't jiggle when a streaming card swaps
  // verdicts mid-stream. "Over budget" (~11ch in the eyebrow setting) is the
  // longest label; reserve a hair more to absorb font metric variance.
  // justify-end keeps the dot+label flush right alongside the sofa title so
  // the dot's horizontal position doesn't appear to dance per verdict.
  return (
    <span
      className="inline-flex shrink-0 items-center justify-end gap-2"
      style={{ minWidth: "8.5rem" }}
    >
      <span aria-hidden className="relative inline-block h-1.5 w-1.5">
        <span
          className={`absolute inset-0 rounded-full ${TONE_DOT[meta.tone]}`}
        />
        <span
          className={`dot-pulse-once absolute inset-0 rounded-full ${TONE_DOT[meta.tone]}`}
        />
      </span>
      <span className={`eyebrow whitespace-nowrap ${TONE_TEXT[meta.tone]}`}>
        {meta.word}
      </span>
    </span>
  );
}
