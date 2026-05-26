"use client";

import { VerdictBadge } from "./verdict-badge";
import type { Persona } from "@/lib/agents/goldilocks";
import sofasData from "@/lib/data/sofas.json";

const sofaUrlById = Object.fromEntries(
  (sofasData.sofas as Array<{ id: string; url?: string }>).map((s) => [
    s.id,
    s.url,
  ]),
);

type Verdict =
  | "JUST_RIGHT"
  | "TOO_LOW"
  | "TOO_HIGH"
  | "OVER_BUDGET"
  | "BORDERLINE";

export interface Assessment {
  sofa_id?: string;
  sofa_name?: string;
  price_usd?: number | null;
  verdict?: Verdict;
  primary_reason?: string;
  cited_value?: string;
}

/**
 * Extract the gap to the customer's range from cited_value.
 * The "measurement as respect" move — show how far off the rejected sofa is.
 * Verdict drives semantics; cited_value just provides the number.
 */
function extractGap(
  cited: string | undefined,
  verdict: Verdict | undefined,
  persona: Persona,
) {
  if (!cited || !verdict) return null;
  const numMatch = cited.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return null;
  const value = parseFloat(numMatch[1]);
  if (Number.isNaN(value)) return null;

  const lo = persona.constraints.seat_height_in.min;
  const hi = persona.constraints.seat_height_in.max;
  const maxDepth = persona.constraints.max_seat_depth_in;
  const budget = persona.constraints.max_budget_usd;

  // OVER_BUDGET — value is a dollar amount
  if (verdict === "OVER_BUDGET") {
    const overBy = value - budget;
    if (overBy <= 0) return null;
    return {
      gap: `$${Math.round(overBy).toLocaleString()}`,
      unit: "",
      direction: "over budget",
    };
  }

  // TOO_LOW — value is a seat height below range
  if (verdict === "TOO_LOW") {
    const delta = lo - value;
    if (delta <= 0) return null;
    return {
      gap: delta.toFixed(2),
      unit: "″",
      direction: "below range",
    };
  }

  // TOO_HIGH — could be seat height above range, OR seat depth too deep.
  // Disambiguate: if value > maxDepth+2 (well above any plausible height),
  // it's a depth measurement; otherwise treat as height.
  if (verdict === "TOO_HIGH") {
    const heightOver = value - hi;
    const depthOver = value - maxDepth;
    // Prefer depth interpretation when value is clearly in depth range (>= 26in)
    // and exceeds the customer's max depth.
    if (value >= 26 && depthOver > 0) {
      return {
        gap: depthOver.toFixed(2),
        unit: "″",
        direction: "above max depth",
      };
    }
    if (heightOver > 0) {
      return {
        gap: heightOver.toFixed(2),
        unit: "″",
        direction: "above range",
      };
    }
  }

  return null;
}

export function AssessmentCard({
  assessment,
  index,
  isMatch,
  isDimmed,
  persona,
}: {
  assessment: Assessment;
  index: number;
  isMatch?: boolean;
  isDimmed?: boolean;
  persona: Persona;
}) {
  const gap = extractGap(assessment.cited_value, assessment.verdict, persona);

  return (
    <article
      className={`reveal border-t border-[color:var(--rule-quiet)] py-6 transition-opacity duration-500 ${
        isDimmed ? "dimmed" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="cited-quiet tabular text-xs">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="truncate text-[1.0625rem] font-medium leading-tight text-[color:var(--ink)]">
              {assessment.sofa_name ?? "…"}
            </h3>
          </div>
          {typeof assessment.price_usd === "number" && (
            <p className="cited-quiet tabular mt-1 text-xs">
              ${assessment.price_usd.toLocaleString()}
            </p>
          )}
        </div>
        {assessment.verdict && assessment.verdict in {JUST_RIGHT:0, TOO_LOW:0, TOO_HIGH:0, OVER_BUDGET:0, BORDERLINE:0} && (
          <VerdictBadge verdict={assessment.verdict} />
        )}
      </div>

      {assessment.primary_reason && (
        <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink-soft)]">
          {assessment.primary_reason}
        </p>
      )}

      {(assessment.cited_value || gap) && (
        <div className="mt-3 flex items-baseline gap-6">
          {assessment.cited_value && (
            <span className="cited-quiet text-xs">
              {assessment.cited_value}
            </span>
          )}
          {gap && (
            <span className="cited tabular text-xs text-[color:var(--reject)]">
              {gap.gap}
              {gap.unit}{" "}
              <span className="text-[color:var(--ink-quiet)]">
                {gap.direction}
              </span>
            </span>
          )}
        </div>
      )}

      {isMatch && (
        <div className="mt-6">
          <p className="lockup-display text-[var(--display-lg)]">
            {persona.name}, this one.
          </p>
          {assessment.sofa_id && sofaUrlById[assessment.sofa_id] && (
            <a
              href={sofaUrlById[assessment.sofa_id]}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-baseline gap-2 text-sm text-[color:var(--ink)] underline decoration-[color:var(--ember-deep)] decoration-2 underline-offset-4 transition hover:text-[color:var(--ember-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--ember-deep)]"
            >
              Take {persona.name} to this sofa
              <span aria-hidden>&rarr;</span>
            </a>
          )}
        </div>
      )}
    </article>
  );
}
