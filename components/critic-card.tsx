"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { CritiqueSchema } from "@/lib/agents/critic";
import type { Persona } from "@/lib/agents/goldilocks";

const VERDICT_TEXT = {
  AGREE: "Agree",
  AGREE_WITH_CAVEAT: "Agree, with a caveat",
  DISAGREE: "Disagree",
} as const;

const VERDICT_TONE = {
  AGREE: "text-[color:var(--right)]",
  AGREE_WITH_CAVEAT: "text-[color:var(--maybe)]",
  DISAGREE: "text-[color:var(--reject)]",
} as const;

const VERDICT_DOT = {
  AGREE: "bg-[color:var(--right)]",
  AGREE_WITH_CAVEAT: "bg-[color:var(--maybe)]",
  DISAGREE: "bg-[color:var(--reject)]",
} as const;

type VerdictKey = keyof typeof VERDICT_TEXT;
const isVerdict = (v: unknown): v is VerdictKey =>
  typeof v === "string" && v in VERDICT_TEXT;

export interface CriticSnapshot {
  verdict: "AGREE" | "AGREE_WITH_CAVEAT" | "DISAGREE" | undefined;
  reasoning: string | undefined;
  missed: string | null | undefined;
  settled: boolean;
}

export function CriticCard({
  personaId,
  pickedSofaId,
  customPersona,
  onSnapshot,
}: {
  personaId: string;
  pickedSofaId: string | undefined;
  customPersona?: Persona | null;
  onSnapshot?: (snap: CriticSnapshot) => void;
}) {
  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/critique",
    schema: CritiqueSchema,
  });

  // Track what we last submitted so we don't double-fire or fire on null transitions
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (!pickedSofaId) return;
    const key = `${personaId}:${pickedSofaId}`;
    if (key === lastKey.current) return;
    if (isLoading) stop();
    lastKey.current = key;
    submit({
      personaId,
      pickedSofaId,
      customPersona: customPersona ?? undefined,
    });
    return () => {
      // Cleanup: abort if unmounting mid-stream
      if (isLoading) stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedSofaId, personaId]);

  // Reset lastKey on unmount to allow re-firing if the same component remounts
  useEffect(() => () => { lastKey.current = null; }, []);

  const verdict = isVerdict(object?.verdict) ? object.verdict : undefined;
  const reasoning = object?.reasoning;
  const missed = object?.missed_consideration;
  const settled = Boolean(!isLoading && verdict && reasoning);

  // Propagate snapshot upward whenever it changes
  useEffect(() => {
    if (onSnapshot) {
      onSnapshot({ verdict, reasoning, missed, settled });
    }
  }, [verdict, reasoning, missed, settled, onSnapshot]);

  if (!pickedSofaId) return null;

  return (
    <section className="border-t border-[color:var(--rule-quiet)] pt-6">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Second opinion</p>
        <p className="cited-quiet text-[0.6875rem]">
          via Baseten · gpt-oss-120b
        </p>
      </div>

      {isLoading && !object?.reasoning && (
        <p className="mt-3 font-display text-[1.125rem] italic text-[color:var(--ink-soft)]">
          Cross-checking on gpt-oss-120b.
        </p>
      )}

      {verdict && (
        <div className="mt-3 flex items-baseline gap-2">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${VERDICT_DOT[verdict]}`}
          />
          <span className={`eyebrow ${VERDICT_TONE[verdict]}`}>
            {VERDICT_TEXT[verdict]}
          </span>
        </div>
      )}

      {object?.reasoning && (
        <p className="mt-3 max-w-[42ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink)]">
          {object.reasoning}
        </p>
      )}

      {object?.missed_consideration && (
        <div className="mt-4 border-t border-[color:var(--rule-quiet)] pt-3">
          <p className="eyebrow mb-2 text-[color:var(--maybe)]">One catch</p>
          <p className="max-w-[42ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink-soft)]">
            {object.missed_consideration}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-[color:var(--reject)]">
          Critic unavailable{error?.message ? `: ${error.message}` : "."}
        </p>
      )}
    </section>
  );
}
