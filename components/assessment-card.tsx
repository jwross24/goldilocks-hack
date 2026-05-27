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

const sofaHeightById = Object.fromEntries(
  (sofasData.sofas as Array<{ id: string; seat_height_in?: number }>).map(
    (s) => [s.id, s.seat_height_in],
  ),
);

type Verdict =
  | "JUST_RIGHT"
  | "TOO_LOW"
  | "TOO_HIGH"
  | "OVER_BUDGET"
  | "BORDERLINE";

const VALID_VERDICTS = new Set<Verdict>([
  "JUST_RIGHT",
  "TOO_LOW",
  "TOO_HIGH",
  "OVER_BUDGET",
  "BORDERLINE",
]);

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
  // Strip commas first so "$1,429.99" parses as 1429.99, not 1.
  const numMatch = cited.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
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
      style={{ animationDelay: `${Math.min(index * 70, 560)}ms` }}
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
        {assessment.verdict && VALID_VERDICTS.has(assessment.verdict) && (
          <VerdictBadge verdict={assessment.verdict} />
        )}
      </div>

      {assessment.primary_reason && (
        <p
          className="mt-3 line-clamp-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink-soft)]"
          title={assessment.primary_reason}
        >
          {/* Strip raw enum leaks like 'JUST_RIGHT', 'TOO_LOW' that TIM
              sometimes spills into user-facing prose. */}
          {assessment.primary_reason
            .replace(/\bJUST_RIGHT\b/g, "just right")
            .replace(/\bTOO_LOW\b/g, "too low")
            .replace(/\bTOO_HIGH\b/g, "too high")
            .replace(/\bOVER_BUDGET\b/g, "over budget")
            .replace(/\bBORDERLINE\b/g, "borderline")}
        </p>
      )}

      {((assessment.cited_value && assessment.cited_value !== "null") || gap) && (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          {assessment.cited_value && assessment.cited_value !== "null" && (() => {
            // Normalize cited_value display: ensure $ for over-budget,
            // ″ for seat-height/depth measurements. TIM is inconsistent.
            // First, strip any leaked JSON field syntax like
            // `seat_height_": 15.74` → `15.74`.
            const raw = assessment.cited_value
              .trim()
              .replace(/^[a-z_]+["':\s]+/i, "")
              .replace(/,\s*[a-z_]+["':\s]+/gi, ", ");
            let display = raw;
            if (assessment.verdict === "OVER_BUDGET") {
              // Strip any existing $ + commas, reformat with $ + commas
              const num = parseFloat(raw.replace(/[$,]/g, ""));
              if (!Number.isNaN(num)) {
                display = `$${num.toLocaleString()}`;
              }
            } else {
              // Treat as inches measurement — but only if the value looks
              // plausibly like inches (< 100). Large bare numbers (e.g.
              // 1429.99) are TIM mis-emitting a price into a non-budget
              // verdict; don't slap ″ on them.
              display = raw
                .replace(/\s*inches?\b/gi, "″")
                .replace(/\s*in\b/gi, "″")
                .replace(/\s*″\s*″/g, "″");
              const trimmed = display.trim();
              if (/^\d+(\.\d+)?$/.test(trimmed)) {
                const val = parseFloat(trimmed);
                if (!Number.isNaN(val) && val < 100) {
                  display = `${trimmed}″`;
                } else if (val >= 100) {
                  // Probably a price TIM mis-attributed. Render with $ to be safe.
                  display = `$${val.toLocaleString()}`;
                }
              }
            }
            return (
              <span className="cited-quiet text-xs">{display}</span>
            );
          })()}
          {gap && (
            <span className="cited tabular text-xs text-[color:var(--reject)]">
              {gap.gap}
              {gap.unit}{" "}
              <span className="text-[color:var(--ink-quiet)]">
                {gap.direction}
              </span>
            </span>
          )}
          {/* For OVER_BUDGET rows, TIM cites the price — so the height never
              surfaces from cited_value. Pull it from the sofa data and show
              it as supplementary context (would-have-fit signal). */}
          {assessment.verdict === "OVER_BUDGET" &&
            assessment.sofa_id &&
            typeof sofaHeightById[assessment.sofa_id] === "number" && (() => {
              const h = sofaHeightById[assessment.sofa_id]!;
              const lo = persona.constraints.seat_height_in.min;
              const hi = persona.constraints.seat_height_in.max;
              const inRange = h >= lo && h <= hi;
              return (
                <span className="cited-quiet text-xs">
                  seat{" "}
                  <span
                    className={`tabular ${
                      inRange
                        ? "text-[color:var(--right)]"
                        : "text-[color:var(--ink-soft)]"
                    }`}
                  >
                    {h}″
                  </span>
                </span>
              );
            })()}
        </div>
      )}

      {isMatch && (
        <div className="mt-8">
          {/* Editorial register mark — a hairline draws in above the climax. */}
          <span
            aria-hidden
            className="rule-draw mb-4 block h-px w-16 bg-[color:var(--ember-deep)]"
          />
          {/* The brand thesis at peak: the number IS the typography.
              Only render when the cited number ACTUALLY falls within the
              customer's comfort range — never lie. */}
          {assessment.cited_value && (() => {
            const numMatch = assessment.cited_value.match(/(\d+(?:\.\d+)?)/);
            if (!numMatch) return null;
            const value = parseFloat(numMatch[1]);
            const lo = persona.constraints.seat_height_in.min;
            const hi = persona.constraints.seat_height_in.max;
            if (Number.isNaN(value) || value < lo || value > hi) return null;
            return (
              <div className="mb-2 flex items-baseline gap-4">
                <span className="cited tabular text-[var(--display-xl)] font-medium leading-none text-[color:var(--ember-deep)]">
                  {numMatch[1]}
                  <span className="not-italic">″</span>
                </span>
                <span className="eyebrow">
                  within your {lo}–{hi}″ range
                </span>
              </div>
            );
          })()}
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
