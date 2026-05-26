"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { Persona } from "@/lib/agents/goldilocks";
import { ExtractedPersonaSchema } from "@/lib/agents/extract-persona";

interface CustomPersonaFormProps {
  onSubmit: (persona: Persona) => void;
  onCancel: () => void;
  onDraftChange?: (draft: Persona | null) => void;
}

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ember-deep)]";

function buildPersona(
  name: string,
  age: string,
  seatMin: string,
  seatMax: string,
  maxDepth: string,
  budget: string,
  context: string,
): Persona | null {
  if (
    !name.trim() ||
    !(Number(seatMin) > 0) ||
    !(Number(seatMax) >= Number(seatMin)) ||
    !(Number(maxDepth) > 0) ||
    !(Number(budget) > 0)
  ) {
    return null;
  }
  return {
    id: `custom-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name: name.trim(),
    age: age ? Number(age) : 0,
    mobility_aid: "custom",
    transfer_strategy: "as described",
    constraints: {
      seat_height_in: {
        min: Number(seatMin),
        max: Number(seatMax),
        rationale: "Seat-height comfort range for this body",
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
}

export function CustomPersonaForm({
  onSubmit,
  onCancel,
  onDraftChange,
}: CustomPersonaFormProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [seatMin, setSeatMin] = useState("");
  const [seatMax, setSeatMax] = useState("");
  const [maxDepth, setMaxDepth] = useState("28");
  const [budget, setBudget] = useState("1000");
  const [context, setContext] = useState("");
  const [extractRationale, setExtractRationale] = useState<string | null>(null);
  // When true, auto-submit as soon as extraction completes
  const [pendingAutoSubmit, setPendingAutoSubmit] = useState(false);

  // Extraction: prose → numeric fields via Subconscious
  const extraction = useObject({
    api: "/api/extract-persona",
    schema: ExtractedPersonaSchema,
  });
  const lastExtractedKey = useRef<string | null>(null);

  useEffect(() => {
    const e = extraction.object;
    if (!e || extraction.isLoading) return;
    const key = JSON.stringify(e);
    if (key === lastExtractedKey.current) return;
    lastExtractedKey.current = key;
    if (typeof e.name === "string" && !name.trim()) setName(e.name);
    if (typeof e.age === "number" && !age) setAge(String(e.age));
    if (typeof e.seat_height_min_in === "number")
      setSeatMin(String(e.seat_height_min_in));
    if (typeof e.seat_height_max_in === "number")
      setSeatMax(String(e.seat_height_max_in));
    if (typeof e.max_seat_depth_in === "number")
      setMaxDepth(String(e.max_seat_depth_in));
    if (typeof e.budget_usd === "number") setBudget(String(e.budget_usd));
    if (typeof e.rationale === "string") setExtractRationale(e.rationale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraction.object, extraction.isLoading]);

  // Auto-submit after extraction completes (when user clicked Measure with only prose)
  useEffect(() => {
    if (!pendingAutoSubmit || extraction.isLoading) return;
    if (!extraction.object) return;
    // Build persona from the just-filled state and submit
    const p = buildPersona(
      extraction.object.name ?? name,
      extraction.object.age != null ? String(extraction.object.age) : age,
      extraction.object.seat_height_min_in != null
        ? String(extraction.object.seat_height_min_in)
        : seatMin,
      extraction.object.seat_height_max_in != null
        ? String(extraction.object.seat_height_max_in)
        : seatMax,
      extraction.object.max_seat_depth_in != null
        ? String(extraction.object.max_seat_depth_in)
        : maxDepth,
      extraction.object.budget_usd != null
        ? String(extraction.object.budget_usd)
        : budget,
      context,
    );
    if (p) {
      setPendingAutoSubmit(false);
      onSubmit(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoSubmit, extraction.isLoading, extraction.object]);

  const handleExtract = () => {
    if (!context.trim()) return;
    setExtractRationale(null);
    lastExtractedKey.current = null;
    extraction.submit({ description: context.trim() });
  };

  // Live draft preview — fires whenever any field changes
  useEffect(() => {
    if (!onDraftChange) return;
    const draft = buildPersona(name, age, seatMin, seatMax, maxDepth, budget, context);
    onDraftChange(draft);
  }, [name, age, seatMin, seatMax, maxDepth, budget, context, onDraftChange]);

  const valid =
    buildPersona(name, age, seatMin, seatMax, maxDepth, budget, context) !==
    null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If the user has prose but no manual numeric values, auto-extract then submit.
    const numericFieldsEmpty = !seatMin.trim() && !seatMax.trim();
    if (context.trim() && numericFieldsEmpty) {
      setPendingAutoSubmit(true);
      handleExtract();
      return;
    }
    const p = buildPersona(name, age, seatMin, seatMax, maxDepth, budget, context);
    if (p) onSubmit(p);
  };

  const inputCls = `mt-1 w-full rounded-sm border-b border-[color:var(--rule-loud)] bg-transparent px-0 py-1.5 text-[color:var(--ink)] outline-none ${FOCUS_RING}`;
  const labelCls =
    "block text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-quiet)]";
  const hintCls =
    "mt-1.5 text-[0.75rem] italic leading-snug text-[color:var(--ink-quiet)]";

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
        Five preset customers above. Here&rsquo;s yourself. The persona card
        on the left updates as you type so you can see what Goldilocks will
        measure against.
      </p>

      <div className="mt-8 grid gap-7 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className={labelCls} htmlFor="cp-name">
            Your name
          </label>
          <input
            id="cp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="cp-age">
            Age (optional)
          </label>
          <input
            id="cp-age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="34"
            className={`${inputCls} cited tabular`}
          />
        </div>

        <div className="sm:col-span-2">
          <p className={labelCls}>Comfort range — your guide</p>
          <ul className={`${hintCls} mt-2 space-y-1 not-italic`}>
            <li><span className="cited tabular">17-19″</span> &mdash; wheelchair self-transfer (ADA)</li>
            <li><span className="cited tabular">18-20″</span> &mdash; arthritis or knee strain on standing</li>
            <li><span className="cited tabular">19-22″</span> &mdash; back injury, lumbar fusion, or tall frames</li>
            <li><span className="cited tabular">20-23″</span> &mdash; 6&prime;2&Prime; or taller body</li>
          </ul>
        </div>

        <div>
          <label className={labelCls} htmlFor="cp-seat-min">
            Comfort range — min (inches)
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
          <p className={hintCls}>Below this, hard to push up from.</p>
        </div>
        <div>
          <label className={labelCls} htmlFor="cp-seat-max">
            Comfort range — max (inches)
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
          <p className={hintCls}>Above this, feet dangle or transfer is awkward.</p>
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
          <p className={hintCls}>
            <span className="cited tabular">22″</span> if you perch forward to stand; <span className="cited tabular">28″</span> if you sink back fully.
          </p>
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
          <p className={hintCls}>The corpus ranges <span className="cited tabular">$104</span> to <span className="cited tabular">$1,430</span>.</p>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="cp-context">
            Describe yourself in 1-2 sentences (optional)
          </label>
          <textarea
            id="cp-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. I'm 6'2&quot; with a knee injury. Standard sofas are too low for me. Firm cushion preferred."
            rows={2}
            className={inputCls}
          />
          <p className={hintCls}>
            Or just describe yourself here, leave the fields blank, and
            hit <span className="font-medium text-[color:var(--ink)]">Measure</span>{" "}
            &mdash; Goldilocks will figure out the numbers.
          </p>
          {extractRationale && (
            <p className="mt-2 max-w-[60ch] text-[0.8125rem] italic leading-relaxed text-[color:var(--ink-quiet)]">
              <span className="not-italic font-medium text-[color:var(--ember-deep)]">Inferred:</span>{" "}
              {extractRationale}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-baseline gap-4">
        <button
          type="submit"
          disabled={
            (!valid && !context.trim()) ||
            extraction.isLoading ||
            pendingAutoSubmit
          }
          className={`rounded-full bg-[color:var(--ink)] px-6 py-2.5 text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ember-deep)] disabled:opacity-40 ${FOCUS_RING}`}
        >
          {extraction.isLoading || pendingAutoSubmit
            ? "Reading your description…"
            : `Measure for ${name.trim() || "me"}`}
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
