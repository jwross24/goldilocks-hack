"use client";

import { VerdictBadge } from "./verdict-badge";
import type { Persona } from "@/lib/agents/goldilocks";

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
 */
function extractGap(
  cited: string | undefined,
  verdict: Verdict | undefined,
  persona: Persona,
) {
  if (!cited) return null;
  const numMatch = cited.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return null;
  const value = parseFloat(numMatch[1]);
  if (Number.isNaN(value)) return null;

  const lo = persona.constraints.seat_height_in.min;
  const hi = persona.constraints.seat_height_in.max;

  if (verdict === "TOO_LOW" && /seat\s*height|height/i.test(cited)) {
    const gap = lo - value;
    return { gap: gap.toFixed(2), unit: "″", direction: "below range" };
  }
  if (verdict === "TOO_HIGH" && /seat\s*height|height/i.test(cited)) {
    const gap = value - hi;
    return { gap: gap.toFixed(2), unit: "″", direction: "above range" };
  }
  if (verdict === "OVER_BUDGET") {
    const budget = persona.constraints.max_budget_usd;
    const overBy = value - budget;
    return {
      gap: `$${Math.round(overBy).toLocaleString()}`,
      unit: "",
      direction: "over budget",
    };
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
        {assessment.verdict && <VerdictBadge verdict={assessment.verdict} />}
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
        </div>
      )}
    </article>
  );
}
