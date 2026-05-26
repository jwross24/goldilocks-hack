"use client";

import { useState } from "react";
import type { Persona } from "@/lib/agents/goldilocks";

interface CustomPersonaFormProps {
  onSubmit: (persona: Persona) => void;
  onCancel: () => void;
}

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ember-deep)]";

export function CustomPersonaForm({
  onSubmit,
  onCancel,
}: CustomPersonaFormProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [seatMin, setSeatMin] = useState("");
  const [seatMax, setSeatMax] = useState("");
  const [maxDepth, setMaxDepth] = useState("28");
  const [budget, setBudget] = useState("1000");
  const [context, setContext] = useState("");
  const [rationale, setRationale] = useState(
    "Seat height comfort range for this body",
  );

  const valid =
    name.trim().length > 0 &&
    Number(seatMin) > 0 &&
    Number(seatMax) >= Number(seatMin) &&
    Number(maxDepth) > 0 &&
    Number(budget) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const persona: Persona = {
      id: `custom-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name: name.trim(),
      age: age ? Number(age) : 0,
      mobility_aid: "custom",
      transfer_strategy: "as described in context",
      constraints: {
        seat_height_in: {
          min: Number(seatMin),
          max: Number(seatMax),
          rationale: rationale.trim() || "Comfort range for this body",
        },
        max_seat_depth_in: Number(maxDepth),
        armrest_required: false,
        firm_cushion_preferred: true,
        max_budget_usd: Number(budget),
        delivery_preference: "any",
      },
      context_for_agent:
        context.trim() ||
        `${name.trim()}'s comfort range is ${seatMin}-${seatMax} inches.`,
    };
    onSubmit(persona);
  };

  const inputCls = `mt-1 w-full rounded-sm border-b border-[color:var(--rule-loud)] bg-transparent px-0 py-1.5 text-[color:var(--ink)] outline-none ${FOCUS_RING}`;
  const labelCls = "block text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-quiet)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-[color:var(--rule-loud)] pt-8"
    >
      <p className="eyebrow mb-2">A different body</p>
      <h2 className="font-display text-[1.75rem] leading-tight tracking-tight text-[color:var(--ink)]">
        Tell us about <em className="italic text-[color:var(--ember-deep)]">you</em>.
      </h2>
      <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink-soft)]">
        Five preset customers above. Here&rsquo;s yourself. Give Goldilocks
        your comfort range and budget — it&rsquo;ll measure the same nine
        sofas against your body, by the inch.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className={labelCls} htmlFor="cp-name">Your name</label>
          <input
            id="cp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="cp-age">Age (optional)</label>
          <input
            id="cp-age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="34"
            className={`${inputCls} cited tabular`}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="cp-seat-min">
            Comfort range (min, inches)
          </label>
          <input
            id="cp-seat-min"
            type="number"
            step="0.1"
            value={seatMin}
            onChange={(e) => setSeatMin(e.target.value)}
            placeholder="18"
            className={`${inputCls} cited tabular`}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="cp-seat-max">
            Comfort range (max, inches)
          </label>
          <input
            id="cp-seat-max"
            type="number"
            step="0.1"
            value={seatMax}
            onChange={(e) => setSeatMax(e.target.value)}
            placeholder="20"
            className={`${inputCls} cited tabular`}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="cp-depth">
            Max seat depth (inches)
          </label>
          <input
            id="cp-depth"
            type="number"
            step="0.1"
            value={maxDepth}
            onChange={(e) => setMaxDepth(e.target.value)}
            className={`${inputCls} cited tabular`}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="cp-budget">
            Budget (USD)
          </label>
          <input
            id="cp-budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className={`${inputCls} cited tabular`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="cp-context">
            Tell Goldilocks anything else (1-2 sentences)
          </label>
          <textarea
            id="cp-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. I'm 6'2' with a knee injury. Standard sofas are too low for me. Firm cushion preferred."
            rows={2}
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-8 flex items-baseline gap-4">
        <button
          type="submit"
          disabled={!valid}
          className={`rounded-full bg-[color:var(--ink)] px-6 py-2.5 text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ember-deep)] disabled:opacity-40 ${FOCUS_RING}`}
        >
          Measure for {name.trim() || "me"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`text-sm text-[color:var(--ink-quiet)] hover:text-[color:var(--ink)] ${FOCUS_RING}`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
