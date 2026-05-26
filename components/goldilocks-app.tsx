"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useMemo, useState } from "react";
import {
  GoldilocksOutputSchema,
  personas,
  personasById,
} from "@/lib/agents/goldilocks";
import { PersonaCard } from "./persona-card";
import { AssessmentCard } from "./assessment-card";

export function GoldilocksApp() {
  const [personaId, setPersonaId] = useState("maya");
  const persona = personasById[personaId] ?? personas[0];

  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/goldilocks",
    schema: GoldilocksOutputSchema,
  });

  const pickId = object?.pick?.sofa_id;
  const matchIndex = useMemo(() => {
    if (!pickId || !object?.assessments) return -1;
    return object.assessments.findIndex((a) => a?.sofa_id === pickId);
  }, [pickId, object?.assessments]);

  const hasMatch = matchIndex >= 0;
  const assessmentsCount = object?.assessments?.length ?? 0;

  const handleRun = () => {
    submit({
      personaId,
      query: `Find ${persona.name} their just-right sofa from the corpus.`,
    });
  };

  return (
    <div className="min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)]">
      <header className="border-b border-[color:var(--rule-loud)]">
        <div className="mx-auto max-w-6xl px-6 py-6 sm:px-10">
          <div className="flex items-baseline justify-between gap-6">
            <div>
              <p className="eyebrow text-[color:var(--ember)]">Goldilocks</p>
              <p className="mt-1 text-xs text-[color:var(--ink-quiet)]">
                Furniture that fits — by the inch.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRun}
              disabled={isLoading}
              className="rounded-full bg-[color:var(--ink)] px-6 py-2.5 text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ember-deep)] disabled:opacity-50"
            >
              {isLoading ? "Measuring…" : `Run for ${persona.name}`}
            </button>
          </div>
        </div>
      </header>

      {/* Persona switcher — magazine-style table of contents */}
      <nav className="border-b border-[color:var(--rule-quiet)] bg-[color:var(--paper-recessed)]">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <ol className="flex items-baseline gap-8 overflow-x-auto py-4 text-sm">
            <li className="eyebrow">Customers</li>
            {personas.map((p, i) => {
              const active = p.id === personaId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPersonaId(p.id)}
                    disabled={isLoading}
                    className={`group inline-flex items-baseline gap-2 transition disabled:opacity-50 ${
                      active
                        ? "text-[color:var(--ink)]"
                        : "text-[color:var(--ink-quiet)] hover:text-[color:var(--ink)]"
                    }`}
                  >
                    <span className="cited-quiet tabular text-xs">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`font-display text-[1.0625rem] italic leading-none tracking-tight ${
                        active ? "text-[color:var(--ember-deep)]" : ""
                      }`}
                    >
                      {p.name}
                    </span>
                    <span className="cited-quiet text-xs">{p.age}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-16">
          <aside className="space-y-8 lg:sticky lg:top-12 lg:self-start">
            <PersonaCard persona={persona} />

            {object?.drafted_reply && (
              <section className="border-t border-[color:var(--rule-quiet)] pt-6">
                <p className="eyebrow mb-3 text-[color:var(--right)]">
                  Goldilocks &rarr; {persona.name}
                </p>
                <p className="font-display text-[1.125rem] italic leading-snug text-[color:var(--ink)]">
                  &ldquo;{object.drafted_reply}&rdquo;
                </p>
              </section>
            )}
          </aside>

          <section>
            {assessmentsCount === 0 && !isLoading && (
              <div className="border-t border-[color:var(--rule-loud)] pt-8">
                <p className="eyebrow mb-6">Tonight&rsquo;s assignment</p>
                <h1 className="font-display text-[var(--display-xl)] font-normal leading-[0.95] tracking-tight text-[color:var(--ink)]">
                  Find {persona.name} a sofa
                  <br />
                  that&rsquo;s{" "}
                  <em className="italic text-[color:var(--ember-deep)]">
                    just right.
                  </em>
                </h1>
                <p className="mt-8 max-w-[62ch] text-[1.0625rem] leading-relaxed text-[color:var(--ink-soft)]">
                  Eight real Wayfair sofas. One body that&rsquo;s spent years
                  being told things are &ldquo;accessible&rdquo; without
                  numbers. Goldilocks reads dimensions, materials, and
                  reviews against {persona.name}&rsquo;s exact comfort
                  range — then tells the truth, by the inch.
                </p>
                <p className="cited-quiet mt-8 text-xs">
                  Press <span className="text-[color:var(--ink)]">Run</span>{" "}
                  when ready. Or pick another customer above.
                </p>
              </div>
            )}

            {isLoading && assessmentsCount === 0 && (
              <div className="border-t border-[color:var(--rule-loud)] pt-8">
                <p className="eyebrow mb-2">In progress</p>
                <p className="font-display text-[1.5rem] italic text-[color:var(--ink-soft)]">
                  Reading the corpus.
                </p>
              </div>
            )}

            {assessmentsCount > 0 && (
              <>
                <p className="eyebrow mb-2">The corpus</p>
                <p className="font-display text-[1.5rem] italic leading-tight text-[color:var(--ink-soft)]">
                  {hasMatch
                    ? `${assessmentsCount} considered. One fit.`
                    : `${assessmentsCount} of 8 considered…`}
                </p>

                <div className="mt-8">
                  {object?.assessments?.map((a, i) => (
                    <AssessmentCard
                      key={`${a?.sofa_id ?? i}-${i}`}
                      assessment={a ?? {}}
                      index={i}
                      isMatch={i === matchIndex}
                      isDimmed={hasMatch && i !== matchIndex}
                      persona={persona}
                    />
                  ))}
                </div>
              </>
            )}

            {object?.pick?.summary && (
              <section className="mt-12 border-t border-[color:var(--rule-loud)] pt-8">
                <p className="eyebrow mb-3 text-[color:var(--right)]">
                  The match
                </p>
                <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-[color:var(--ink)]">
                  {object.pick.summary}
                </p>
              </section>
            )}

            {isLoading && assessmentsCount > 0 && (
              <div className="mt-8 flex items-center justify-between border-t border-[color:var(--rule-quiet)] pt-4">
                <span className="cited-quiet tabular text-xs">
                  {assessmentsCount} / 8
                </span>
                <button
                  type="button"
                  onClick={stop}
                  className="text-xs text-[color:var(--ink-quiet)] hover:text-[color:var(--ink)]"
                >
                  Stop
                </button>
              </div>
            )}

            {error && (
              <p className="mt-8 border-t border-[color:var(--reject-edge)] pt-4 text-sm text-[color:var(--reject)]">
                {error.message}
              </p>
            )}
          </section>
        </div>

        <footer className="mt-24 border-t border-[color:var(--rule-quiet)] pt-6">
          <p className="cited-quiet text-xs">
            A demo. Built on Subconscious, Baseten, and Cloudflare. For
            customers Wayfair hasn&rsquo;t served yet.
          </p>
        </footer>
      </main>
    </div>
  );
}
