"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { SynthesisOutputSchema } from "@/lib/agents/synthesize";
import type { Persona } from "@/lib/agents/goldilocks";
import sofasData from "@/lib/data/sofas.json";

const sofaIndex = Object.fromEntries(
  (sofasData.sofas as Array<{ id: string; name: string }>).map((s) => [
    s.id,
    s,
  ]),
);

const DECISION_LABEL = {
  HOLD: "Held the pick",
  CHANGE: "Changed the pick",
  CONCEDE: "Conceded the caveat",
} as const;

const DECISION_TONE = {
  HOLD: "text-[color:var(--ink)]",
  CHANGE: "text-[color:var(--ember-deep)]",
  CONCEDE: "text-[color:var(--maybe)]",
} as const;

type DecisionKey = keyof typeof DECISION_LABEL;
const isDecision = (v: unknown): v is DecisionKey =>
  typeof v === "string" && v in DECISION_LABEL;

interface SynthesisCardProps {
  personaId: string;
  customPersona?: Persona | null;
  initialPickId: string | undefined;
  initialReply: string | undefined;
  criticVerdict: "AGREE" | "AGREE_WITH_CAVEAT" | "DISAGREE" | undefined;
  criticReasoning: string | undefined;
  criticMissed: string | null | undefined;
  onUpdatedReply?: (reply: string) => void;
  onFinalPick?: (sofaId: string) => void;
}

export function SynthesisCard({
  personaId,
  customPersona,
  initialPickId,
  initialReply,
  criticVerdict,
  criticReasoning,
  criticMissed,
  onUpdatedReply,
  onFinalPick,
}: SynthesisCardProps) {
  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/synthesize",
    schema: SynthesisOutputSchema,
  });

  const lastKey = useRef<string | null>(null);

  // Only fire when the critic actually had feedback worth reconciling
  const shouldFire =
    initialPickId &&
    initialReply &&
    criticReasoning &&
    (criticVerdict === "DISAGREE" || criticVerdict === "AGREE_WITH_CAVEAT");

  useEffect(() => {
    if (!shouldFire) return;
    const key = `${personaId}:${initialPickId}:${criticVerdict}`;
    if (key === lastKey.current) return;
    if (isLoading) stop();
    lastKey.current = key;
    submit({
      personaId,
      customPersona: customPersona ?? undefined,
      initialPickId,
      initialReply,
      criticVerdict,
      criticReasoning,
      criticMissed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFire, personaId, initialPickId, criticVerdict]);

  // Propagate updates upward
  useEffect(() => {
    if (object?.updated_reply && onUpdatedReply) {
      onUpdatedReply(object.updated_reply);
    }
  }, [object?.updated_reply, onUpdatedReply]);

  useEffect(() => {
    if (object?.final_sofa_id && onFinalPick) {
      onFinalPick(object.final_sofa_id);
    }
  }, [object?.final_sofa_id, onFinalPick]);

  if (!shouldFire) return null;

  const decision = isDecision(object?.decision) ? object.decision : null;
  const finalSofa = object?.final_sofa_id
    ? sofaIndex[object.final_sofa_id]
    : undefined;

  return (
    <section className="mt-12 border-t-2 border-[color:var(--ink)] pt-8">
      <p className="eyebrow text-[color:var(--ember-deep)]">
        After the second opinion
      </p>
      <p className="mt-1 font-display text-[1.5rem] italic leading-tight text-[color:var(--ink-soft)]">
        Goldilocks reconsiders.
      </p>

      {isLoading && !decision && (
        <p className="mt-4 font-display text-[1.125rem] italic text-[color:var(--ink-soft)]">
          Weighing the second opinion&hellip;
        </p>
      )}

      {decision && (
        <div className="mt-6">
          <p className={`eyebrow ${DECISION_TONE[decision]}`}>
            {DECISION_LABEL[decision]}
            {decision === "CHANGE" && finalSofa && (
              <span className="ml-2 text-[color:var(--ink)] normal-case tracking-normal">
                &mdash; {finalSofa.name}
              </span>
            )}
          </p>

          {object?.reconciliation_note && (() => {
            // Trim chain-of-thought leakage: clip at first reasoning-tic word
            // ("Wait", "Actually", "Let me", "Hmm") if it slipped in.
            const raw = object.reconciliation_note;
            const cotMarkers = /\s+(Wait|Actually|Let me|Hmm|Let's re-evaluate|Let's evaluate)\b/i;
            const cleaned = raw.split(cotMarkers)[0].trim();
            // Cap at 280 chars (≈ 2 sentences) as a safety net
            const display =
              cleaned.length > 280 ? cleaned.slice(0, 280) + "…" : cleaned;
            return (
              <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink)]">
                {display}
              </p>
            );
          })()}
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-[color:var(--reject)]">
          Synthesis unavailable; the second-opinion stands as a note only.
        </p>
      )}
    </section>
  );
}
