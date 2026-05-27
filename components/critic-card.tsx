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

/**
 * Scrub critic prose before rendering. Strips:
 *  - JSON field-name leaks ("seat_height_in", "max_budget_usd") → readable.
 *  - Critic enum leaks ("AGREE_WITH_CAVEAT") that sometimes survive into prose.
 *  - Chain-of-thought tics ("Wait,", "Actually,", "Let me reconsider").
 *  - Raw schema tails (dangling `}` or `]`).
 * Returns null if nothing usable remains.
 */
function scrubCriticProse(text: string | null | undefined): string | null {
  if (!text) return null;
  let s = text.trim();
  if (!s || s.toLowerCase() === "null") return null;
  // Strip leading wrapping quotes (curly or straight).
  s = s.replace(/^["'“”‘’]+/, "");
  // JSON field-name leaks.
  s = s
    .replace(/\bseat_height_in\b/gi, "seat height")
    .replace(/\bseat_depth_in\b/gi, "seat depth")
    .replace(/\bmax_seat_depth_in\b/gi, "max seat depth")
    .replace(/\bmax_budget_usd\b/gi, "budget")
    .replace(/\bprice_usd\b/gi, "price")
    .replace(/\bfirm_cushion_preferred\b/gi, "firm cushion preference");
  // Critic + Goldilocks enum leaks.
  s = s
    .replace(/\bAGREE_WITH_CAVEAT\b/g, "agree with a caveat")
    .replace(/\bAGREE\b/g, "agree")
    .replace(/\bDISAGREE\b/g, "disagree")
    .replace(/\bJUST_RIGHT\b/g, "just right")
    .replace(/\bTOO_LOW\b/g, "too low")
    .replace(/\bTOO_HIGH\b/g, "too high")
    .replace(/\bOVER_BUDGET\b/g, "over budget")
    .replace(/\bBORDERLINE\b/g, "borderline");
  // Clip at the first CoT tic that bled into the rationale.
  const cot = /\b(Wait,?|Actually,?|Hmm,?|Let me reconsider|Let me re-evaluate|Let's re-evaluate|On second thought)\b/i;
  const cotMatch = s.search(cot);
  if (cotMatch > 0) s = s.slice(0, cotMatch);
  // Strip dangling JSON tail / trailing commas.
  s = s.replace(/[\s,]*[}\]]+\s*$/g, "").trim();
  if (!s) return null;
  // Reject anything that's only punctuation after scrubbing.
  if (!/[A-Za-z0-9]/.test(s)) return null;
  return s;
}

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
  const reasoning = scrubCriticProse(object?.reasoning) ?? undefined;
  const missed = scrubCriticProse(object?.missed_consideration);
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

      {isLoading && !reasoning && (
        <div className="mt-3 flex items-baseline gap-2">
          <span
            aria-hidden
            className="prime-breathe inline-block text-[1.125rem] not-italic text-[color:var(--ember-deep)]"
          >
            &bull;
          </span>
          <p className="font-display text-[1.125rem] italic text-[color:var(--ink-soft)]">
            A second model is reviewing the pick&hellip;
          </p>
        </div>
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

      {reasoning && (
        <p className="mt-3 max-w-[42ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink)]">
          {reasoning}
        </p>
      )}

      {missed && (
        <div className="mt-4 border-t border-[color:var(--rule-quiet)] pt-3">
          <p className="eyebrow mb-2 text-[color:var(--maybe)]">One catch</p>
          <p className="max-w-[42ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink-soft)]">
            {missed}
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
