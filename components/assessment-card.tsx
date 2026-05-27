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

/**
 * Scrub user-facing prose: drop raw enum names, JSON field names, and
 * chain-of-thought reasoning markers that TIM occasionally lets slip into
 * `primary_reason`. Returns null if scrubbing leaves nothing meaningful.
 */
function scrubProse(text: string): string {
  let s = text;
  // Verdict enum leaks → natural language.
  s = s
    .replace(/\bJUST_RIGHT\b/g, "just right")
    .replace(/\bTOO_LOW\b/g, "too low")
    .replace(/\bTOO_HIGH\b/g, "too high")
    .replace(/\bOVER_BUDGET\b/g, "over budget")
    .replace(/\bBORDERLINE\b/g, "borderline");
  // Common JSON field-name leaks → readable nouns.
  s = s
    .replace(/\bseat_height_in\b/gi, "seat height")
    .replace(/\bseat_depth_in\b/gi, "seat depth")
    .replace(/\bmax_seat_depth_in\b/gi, "max seat depth")
    .replace(/\bmax_budget_usd\b/gi, "budget")
    .replace(/\bprice_usd\b/gi, "price")
    .replace(/\bfirm_cushion_preferred\b/gi, "firm cushion preference");
  // Clip at the first chain-of-thought tic if it slipped in mid-sentence.
  const cot = /\b(Wait,?|Actually,?|Hmm,?|Let me reconsider|Let me re-evaluate|Let's re-evaluate|On second thought)\b/i;
  const cotMatch = s.search(cot);
  if (cotMatch > 0) s = s.slice(0, cotMatch);
  // Strip stray JSON tail like a dangling closing brace.
  s = s.replace(/[\s,]*[}\]]+\s*$/g, "");
  return s.trim();
}

/**
 * Strip leaked JSON fragments and pull a clean numeric token out of TIM's
 * `cited_value` field. TIM is inconsistent here — it has been seen emitting:
 *   - `seat_height_": 15.74`        (raw JSON key + colon)
 *   - `"seat_height_in": 15.74`     (quoted key + colon)
 *   - `15.74 inches`, `15.74in`     (unit words)
 *   - `15.74″.`, `15.74″,`          (trailing punctuation)
 *   - `15.74″″`, `15.74″ ″`         (doubled prime)
 *   - `"`, `''`, ASCII " for inches (curly/straight/double-quote variants)
 *   - `1.574e1`                     (scientific notation)
 *   - `null`, `"null"`              (the string null)
 * This helper returns a normalized string ready for display, or null if
 * nothing usable remains after scrubbing.
 */
function normalizeCited(
  cited: string | undefined,
  verdict: Verdict | undefined,
): string | null {
  if (!cited) return null;
  let raw = cited.trim();
  // Anything that's literally null-ish after trim is unusable.
  if (!raw || raw.toLowerCase() === "null" || raw === '"null"') return null;

  // Strip leaked JSON key syntax at the head: `seat_height_": 15.74` or
  // `"seat_height_in": 15.74` → `15.74`. Also handle the same pattern after
  // a comma for multi-field leaks.
  raw = raw
    .replace(/^"?[a-z_][a-z0-9_]*"?\s*[:=]\s*/i, "")
    .replace(/,\s*"?[a-z_][a-z0-9_]*"?\s*[:=]\s*/gi, ", ");

  // Strip wrapping quotes that sometimes survive: `"15.74"` → `15.74`.
  raw = raw.replace(/^["']+|["']+$/g, "");

  // Strip trailing punctuation that's never meaningful here (period, comma,
  // semicolon, closing brace/bracket from a half-streamed JSON tail).
  raw = raw.replace(/[\s.,;:})\]]+$/g, "");

  // Normalize inch units to the prime mark. Handle plural with or without
  // a leading space (`15.74inches`, `15.74 inches`, `15.74 in`, `15.74in`).
  // Also normalize doubled-quote ASCII (`15.74"`) and apostrophe pairs
  // (`15.74''`) into the typographic prime.
  raw = raw
    .replace(/\s*inches\b/gi, "″")
    .replace(/\s*inch\b/gi, "″")
    .replace(/\s*in\b/gi, "″")
    .replace(/''/g, "″")
    .replace(/"/g, "″");

  // Collapse runs of primes with any interior whitespace into a single one.
  raw = raw.replace(/(?:″\s*){2,}/g, "″");

  // Expand scientific notation into a plain decimal if present.
  const sciMatch = raw.match(/(-?\d+(?:\.\d+)?)[eE]([+-]?\d+)/);
  if (sciMatch) {
    const expanded = Number(sciMatch[0]);
    if (!Number.isNaN(expanded)) {
      raw = raw.replace(sciMatch[0], expanded.toString());
    }
  }

  const cleaned = raw.trim();
  if (!cleaned) return null;
  // A token that's only punctuation/whitespace after scrubbing is junk.
  if (!/[0-9a-zA-Z$]/.test(cleaned)) return null;

  // OVER_BUDGET → render as dollars.
  if (verdict === "OVER_BUDGET") {
    const num = parseFloat(cleaned.replace(/[$,]/g, ""));
    if (!Number.isNaN(num)) return `$${num.toLocaleString()}`;
    return cleaned;
  }

  // Bare numeric → infer unit. Numbers under 100 are inches; values ≥ 100
  // are almost always a price TIM mis-attributed into a non-budget verdict.
  const bare = cleaned.replace(/[,]/g, "");
  if (/^-?\d+(\.\d+)?$/.test(bare)) {
    const val = parseFloat(bare);
    if (!Number.isNaN(val)) {
      if (val < 100) return `${bare}″`;
      return `$${val.toLocaleString()}`;
    }
  }
  return cleaned;
}

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

      {assessment.primary_reason && (() => {
        const cleaned = scrubProse(assessment.primary_reason);
        if (!cleaned) return null;
        return (
          <p
            className="mt-3 line-clamp-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink-soft)]"
            title={cleaned}
          >
            {cleaned}
          </p>
        );
      })()}

      {(() => {
        const citedDisplay = normalizeCited(
          assessment.cited_value,
          assessment.verdict,
        );
        if (!citedDisplay && !gap && assessment.verdict !== "OVER_BUDGET") {
          return null;
        }
        return (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          {citedDisplay && (
            <span className="cited-quiet tabular text-xs">{citedDisplay}</span>
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
        );
      })()}

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
