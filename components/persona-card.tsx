"use client";

import type { Persona } from "@/lib/agents/goldilocks";

export function PersonaCard({ persona }: { persona: Persona }) {
  const p = persona;
  const rangeLo = p.constraints.seat_height_in.min;
  const rangeHi = p.constraints.seat_height_in.max;
  return (
    <section className="border-t border-[color:var(--rule-quiet)] pt-6">
      <p className="eyebrow mb-4">The customer</p>

      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-[2rem] leading-none tracking-tight text-[color:var(--ink)]">
          {p.name}
        </h2>
        <span className="cited-quiet text-sm">{p.age}</span>
      </div>

      <p className="mt-4 text-[0.9375rem] leading-relaxed text-[color:var(--ink-soft)]">
        {p.context_for_agent}
      </p>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex items-baseline justify-between border-b border-[color:var(--rule-quiet)] pb-2">
          <dt className="text-[color:var(--ink-quiet)]">Comfort range</dt>
          <dd className="cited tabular text-[color:var(--ink)]">
            {rangeLo}″–{rangeHi}″
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-[color:var(--rule-quiet)] pb-2">
          <dt className="text-[color:var(--ink-quiet)]">Max seat depth</dt>
          <dd className="cited tabular text-[color:var(--ink)]">
            {p.constraints.max_seat_depth_in}″
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-[color:var(--rule-quiet)] pb-2">
          <dt className="text-[color:var(--ink-quiet)]">Budget</dt>
          <dd className="cited tabular text-[color:var(--ink)]">
            ${p.constraints.max_budget_usd.toLocaleString()}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-[color:var(--rule-quiet)] pb-2">
          <dt className="text-[color:var(--ink-quiet)]">Mobility</dt>
          <dd className="text-[color:var(--ink)]">{p.mobility_aid}</dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-[color:var(--rule-quiet)] pb-2">
          <dt className="text-[color:var(--ink-quiet)]">Cushion</dt>
          <dd className="text-[color:var(--ink)]">
            {p.constraints.firm_cushion_preferred ? "firm preferred" : "any"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-[color:var(--ink-quiet)]">Delivery</dt>
          <dd className="text-[color:var(--ink)]">
            {p.constraints.delivery_preference}
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-xs italic text-[color:var(--ink-whisper)]">
        {p.constraints.seat_height_in.rationale}.
      </p>
    </section>
  );
}
