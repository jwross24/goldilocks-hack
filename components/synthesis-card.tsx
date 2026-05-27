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

/**
 * Generic prose scrubber for synthesis output. Strips JSON field-name leaks,
 * enum leaks, CoT tics, and dangling JSON tails. Used on `reconciliation_note`.
 */
function scrubSynthesisProse(text: string): string {
  let s = text;
  // JSON field-name leaks.
  s = s
    .replace(/\bseat_height_in\b/gi, "seat height")
    .replace(/\bseat_depth_in\b/gi, "seat depth")
    .replace(/\bmax_seat_depth_in\b/gi, "max seat depth")
    .replace(/\bmax_budget_usd\b/gi, "budget")
    .replace(/\bprice_usd\b/gi, "price")
    .replace(/\bfirm_cushion_preferred\b/gi, "firm cushion preference");
  // Enum leaks.
  s = s
    .replace(/\bAGREE_WITH_CAVEAT\b/g, "agree with a caveat")
    .replace(/\bAGREE\b/g, "agree")
    .replace(/\bDISAGREE\b/g, "disagree")
    .replace(/\bHOLD\b/g, "hold")
    .replace(/\bCHANGE\b/g, "change")
    .replace(/\bCONCEDE\b/g, "concede")
    .replace(/\bJUST_RIGHT\b/g, "just right")
    .replace(/\bTOO_LOW\b/g, "too low")
    .replace(/\bTOO_HIGH\b/g, "too high")
    .replace(/\bOVER_BUDGET\b/g, "over budget")
    .replace(/\bBORDERLINE\b/g, "borderline");
  // Strip dangling JSON tail.
  s = s.replace(/[\s,]*[}\]]+\s*$/g, "");
  return s.trim();
}

/**
 * Sanitize `updated_reply` for display in the sidebar. The persona card
 * applies a `::first-letter` drop cap that catches the FIRST glyph — so a
 * leading curly quote, straight quote, whitespace, or stray bullet would
 * become the drop-cap glyph and ruin the editorial setting. Also dedupe a
 * leading "Hi, <name>, Hi <name>..." pattern, drop wrapping quotes, and clip
 * any CoT preamble.
 */
function sanitizeReply(text: string | undefined): string | undefined {
  if (!text) return text;
  let s = text;
  // Strip BOM, leading/trailing whitespace, leading bullets/dashes.
  s = s.replace(/^﻿/, "").trim();
  s = s.replace(/^[\s•·\-–—*>]+/, "");
  // Strip wrapping curly or straight quotes; an opening one would land in
  // ::first-letter and replace the intended capital.
  s = s.replace(/^["'“”‘’`]+/, "");
  s = s.replace(/["'“”‘’`]+$/, "");
  // Strip CoT preambles like "Wait, actually — Hi Maya, …".
  s = s.replace(
    /^(Wait[,!.\s]+|Actually[,!.\s]+|Hmm[,!.\s]+|Let me reconsider[,.\s]+|Let's re-evaluate[,.\s]+|On second thought[,.\s]+)+/i,
    "",
  );
  // Dedupe back-to-back greetings: "Hi Maya, Hi Maya, …" → "Hi Maya, …".
  s = s.replace(
    /^(Hi|Hello|Hey)([\s,]+[A-Z][a-z]+)?[\s,]*\1([\s,]+[A-Z][a-z]+)?[\s,]*/i,
    "$1$2, ",
  );
  // Apply the same JSON/enum scrubbing the reconciliation note gets.
  s = scrubSynthesisProse(s);
  // Final tidy.
  s = s.replace(/^[\s,]+/, "").trim();
  return s;
}

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

  // Propagate updates upward. Sanitize the reply before bubbling it up so
  // the sidebar's ::first-letter drop cap lands on a real letter, not a
  // leading curly quote or whitespace.
  useEffect(() => {
    if (!onUpdatedReply) return;
    const clean = sanitizeReply(object?.updated_reply);
    if (clean) onUpdatedReply(clean);
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
        <div className="mt-4 flex items-baseline gap-2">
          <span
            aria-hidden
            className="prime-breathe inline-block text-[1.125rem] not-italic text-[color:var(--ember-deep)]"
          >
            &bull;
          </span>
          <p className="font-display text-[1.125rem] italic text-[color:var(--ink-soft)]">
            Goldilocks is weighing the second opinion&hellip;
          </p>
        </div>
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
            const cotMarkers = /\s+(Wait|Actually|Let me|Hmm|Let's re-evaluate|Let's evaluate|On second thought)\b/i;
            const clipped = raw.split(cotMarkers)[0];
            // Then strip JSON field / enum leaks and dangling JSON tails.
            const cleaned = scrubSynthesisProse(clipped);
            if (!cleaned) return null;
            // Cap at 280 chars (≈ 2 sentences) as a safety net.
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
