"use client";

import type { Persona } from "@/lib/agents/goldilocks";

const ROW_BORDER = "border-b border-[color:var(--rule-quiet)] py-2.5";
const DT_BASE = "text-[color:var(--ink-quiet)]";
const DD_BASE = "text-right text-[color:var(--ink)]";

export function PersonaCard({ persona }: { persona: Persona }) {
  const p = persona;
  const rangeLo = p.constraints.seat_height_in.min;
  const rangeHi = p.constraints.seat_height_in.max;
  const rationale = p.constraints.seat_height_in.rationale?.trim();
  const context = p.context_for_agent?.trim();
  const mobility = p.mobility_aid?.trim();
  const delivery = p.constraints.delivery_preference?.trim();

  // Trim a trailing period off the rationale so we can append our own without
  // doubling it; "Reason." → "Reason." stays the same as "Reason" → "Reason.".
  const rationaleClean = rationale
    ? rationale.replace(/[.\s]+$/, "")
    : null;

  return (
    <section className="border-t border-[color:var(--rule-quiet)] pt-6">
      <p className="eyebrow mb-4">The customer</p>

      <div className="flex min-w-0 items-baseline gap-3">
        <h2
          className="min-w-0 break-words font-display text-[2rem] leading-none tracking-tight text-[color:var(--ink)]"
          title={p.name}
        >
          {p.name}
        </h2>
        {p.age > 0 && (
          <span className="cited-quiet shrink-0 text-sm">{p.age}</span>
        )}
      </div>

      {context && (
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-[color:var(--ink-soft)]">
          {context}
        </p>
      )}

      {/*
        Single grid for the whole dl so the dt column auto-sizes to the widest
        label and stays consistent across rows. Values right-align in column 2;
        wrapping text right-aligns line by line, which reads as editorial-data.
        Rows whose value is empty are skipped entirely — no "—" or blank cells.
      */}
      <dl className="mt-6 grid grid-cols-[auto_1fr] items-baseline gap-x-6 text-sm">
        <dt className={`${ROW_BORDER} ${DT_BASE}`}>Comfort range</dt>
        <dd className={`${ROW_BORDER} ${DD_BASE} cited tabular`}>
          {rangeLo}″–{rangeHi}″
        </dd>

        <dt className={`${ROW_BORDER} ${DT_BASE}`}>Max seat depth</dt>
        <dd className={`${ROW_BORDER} ${DD_BASE} cited tabular`}>
          {p.constraints.max_seat_depth_in}″
        </dd>

        <dt className={`${ROW_BORDER} ${DT_BASE}`}>Budget</dt>
        <dd className={`${ROW_BORDER} ${DD_BASE} cited tabular`}>
          ${p.constraints.max_budget_usd.toLocaleString()}
        </dd>

        {mobility && (
          <>
            <dt className={`${ROW_BORDER} ${DT_BASE}`}>Mobility</dt>
            <dd className={`${ROW_BORDER} ${DD_BASE} break-words`}>
              {mobility}
            </dd>
          </>
        )}

        <dt className={`${ROW_BORDER} ${DT_BASE}`}>Cushion</dt>
        <dd className={`${ROW_BORDER} ${DD_BASE}`}>
          {p.constraints.firm_cushion_preferred ? "firm preferred" : "any"}
        </dd>

        {delivery && (
          <>
            <dt className={`py-2.5 ${DT_BASE}`}>Delivery</dt>
            <dd className={`py-2.5 ${DD_BASE}`}>{delivery}</dd>
          </>
        )}
      </dl>

      {rationaleClean && (
        <p className="mt-6 text-xs italic text-[color:var(--ink-whisper)]">
          {rationaleClean}.
        </p>
      )}
    </section>
  );
}
