"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useMemo, useRef, useState } from "react";
import {
  GoldilocksOutputSchema,
  personas,
  personasById,
} from "@/lib/agents/goldilocks";
import sofasData from "@/lib/data/sofas.json";
import { PersonaCard } from "./persona-card";
import { AssessmentCard } from "./assessment-card";
import { CriticCard, type CriticSnapshot } from "./critic-card";
import { TopPicksList } from "./top-picks-list";
import { SynthesisCard } from "./synthesis-card";
import { CustomPersonaForm } from "./custom-persona-form";
import type { Persona } from "@/lib/agents/goldilocks";

const CORPUS_SIZE = sofasData.sofas.length;

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ember-deep)]";

export function GoldilocksApp() {
  const [personaId, setPersonaId] = useState("maya");
  const [customPersona, setCustomPersona] = useState<Persona | null>(null);
  const [draftPersona, setDraftPersona] = useState<Persona | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  // Track which persona the current results belong to.
  // If user switches persona, we hide stale results until they hit Run again.
  const [resultsForPersonaId, setResultsForPersonaId] = useState<string | null>(
    null,
  );
  const isCustomActive = personaId === "__custom" && customPersona !== null;
  const persona: Persona = isCustomActive
    ? customPersona!
    : personasById[personaId] ?? personas[0];

  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/goldilocks",
    schema: GoldilocksOutputSchema,
  });

  // Only show results if the active persona matches the persona we ran for.
  const showResults = resultsForPersonaId === personaId;

  // De-duplicate by sofa_id to handle streaming partial-emit duplicates.
  const uniqueAssessments = useMemo(() => {
    if (!showResults || !object?.assessments) return [];
    const seen = new Set<string>();
    return object.assessments.filter((a) => {
      const id = a?.sofa_id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [showResults, object?.assessments]);
  const assessmentsCount = Math.min(uniqueAssessments.length, CORPUS_SIZE);

  const pickId = showResults ? object?.pick?.sofa_id : undefined;
  const pickSummary = showResults ? object?.pick?.summary : undefined;
  const draftedReply = showResults ? object?.drafted_reply : undefined;
  const topPicks = showResults ? object?.top_picks : undefined;

  // Critic snapshot + synthesis-derived overrides
  const [criticSnap, setCriticSnap] = useState<CriticSnapshot | null>(null);
  const [synthesisReply, setSynthesisReply] = useState<string | null>(null);
  const [synthesisPickId, setSynthesisPickId] = useState<string | null>(null);

  const matchIndex = useMemo(() => {
    const id = synthesisPickId ?? pickId;
    if (!id) return -1;
    return uniqueAssessments.findIndex((a) => a?.sofa_id === id);
  }, [pickId, synthesisPickId, uniqueAssessments]);
  // Only treat as "matched" once the stream is settled (we have summary) —
  // otherwise the climax fires before stillness is earned.
  const matchSettled = !isLoading && Boolean(pickId);
  const dimNonMatches = matchSettled && matchIndex >= 0;

  const effectiveReply = synthesisReply ?? draftedReply;
  const effectivePickId = synthesisPickId ?? pickId;

  const lastSubmittedKey = useRef<string | null>(null);
  const handleRun = () => {
    setCriticSnap(null);
    setSynthesisReply(null);
    setSynthesisPickId(null);
    if (isLoading) stop();
    lastSubmittedKey.current = personaId;
    setResultsForPersonaId(personaId);
    setShowCustomForm(false);
    submit({
      personaId: isCustomActive ? "__custom" : personaId,
      customPersona: isCustomActive ? persona : undefined,
      query: `Find ${persona.name} their just-right sofa from the corpus.`,
    });
  };

  const handlePersonaSwitch = (id: string) => {
    // Always close the custom form when switching personas, even if the same
    // preset was already selected — the form may be open with a stale id.
    setShowCustomForm(false);
    setDraftPersona(null);
    if (id === personaId) return;
    if (isLoading) stop();
    setPersonaId(id);
  };

  const handleCustomTabClick = () => {
    if (isLoading) stop();
    if (customPersona) {
      setPersonaId("__custom");
    } else {
      setShowCustomForm(true);
    }
  };

  const handleCustomSubmit = (p: Persona) => {
    setCustomPersona(p);
    setPersonaId("__custom");
    setShowCustomForm(false);
  };

  return (
    <div className="min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)]">
      <header className="border-b border-[color:var(--rule-loud)]">
        <div className="mx-auto max-w-6xl px-6 py-6 sm:px-10">
          <div className="flex items-baseline justify-between gap-6">
            <div>
              <p className="eyebrow text-[color:var(--ember-deep)]">
                Goldilocks
              </p>
              <p className="mt-1 text-xs text-[color:var(--ink-quiet)]">
                Furniture that fits, by the inch.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRun}
              disabled={isLoading}
              className={`rounded-full bg-[color:var(--ink)] px-6 py-2.5 text-sm font-medium text-[color:var(--paper)] transition hover:bg-[color:var(--ember-deep)] disabled:opacity-50 ${FOCUS_RING}`}
            >
              {isLoading && resultsForPersonaId === personaId
                ? "Measuring…"
                : `Run for ${persona.name}`}
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-[color:var(--rule-quiet)] bg-[color:var(--paper-recessed)]">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <ol
            className="flex items-baseline gap-8 overflow-x-auto py-4 text-sm"
            aria-label="Customer profiles"
          >
            <li className="eyebrow shrink-0">Customers</li>
            {personas.map((p, i) => {
              const active = p.id === personaId && !showCustomForm;
              return (
                <li key={p.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePersonaSwitch(p.id)}
                    aria-current={active ? "page" : undefined}
                    className={`group inline-flex items-baseline gap-2 transition ${FOCUS_RING} ${
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
            <li className="shrink-0 border-l border-[color:var(--rule-loud)] pl-8">
              <button
                type="button"
                onClick={handleCustomTabClick}
                aria-current={isCustomActive || showCustomForm ? "page" : undefined}
                className={`group inline-flex items-baseline gap-2 transition ${FOCUS_RING} ${
                  isCustomActive || showCustomForm
                    ? "text-[color:var(--ink)]"
                    : "text-[color:var(--ink-quiet)] hover:text-[color:var(--ink)]"
                }`}
              >
                <span className="cited-quiet tabular text-xs">+</span>
                <span
                  className={`font-display text-[1.0625rem] italic leading-none tracking-tight ${
                    isCustomActive || showCustomForm
                      ? "text-[color:var(--ember-deep)]"
                      : ""
                  }`}
                >
                  {customPersona?.name ?? "You"}
                </span>
              </button>
            </li>
          </ol>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-16">
          <aside className="space-y-8 lg:sticky lg:top-12 lg:self-start">
            {showCustomForm ? (
              draftPersona ? (
                <>
                  <PersonaCard persona={draftPersona} />
                  <p className="cited-quiet -mt-4 text-[0.6875rem] italic text-[color:var(--ember-deep)]">
                    Live preview &mdash; updates as you type.
                  </p>
                </>
              ) : (
                <section className="border-t border-[color:var(--rule-quiet)] pt-6">
                  <p className="eyebrow mb-2">Live preview</p>
                  <p className="font-display text-[1.25rem] italic leading-snug text-[color:var(--ink-soft)]">
                    Describe yourself, or fill the fields. Your customer
                    profile composes itself here.
                  </p>
                </section>
              )
            ) : (
              <PersonaCard persona={persona} />
            )}

            {effectiveReply && matchSettled && (
              <section className="border-t border-[color:var(--rule-quiet)] pt-6">
                <p className="eyebrow mb-3 text-[color:var(--right)]">
                  Goldilocks &rarr; {persona.name}
                  {synthesisReply && (
                    <span className="ml-2 text-[color:var(--ember-deep)] normal-case tracking-normal">
                      (revised)
                    </span>
                  )}
                </p>
                <p className="font-display text-[1.125rem] italic leading-snug text-[color:var(--ink)] [&::first-letter]:font-display [&::first-letter]:not-italic [&::first-letter]:float-left [&::first-letter]:pr-2 [&::first-letter]:pt-1 [&::first-letter]:text-[2.5rem] [&::first-letter]:leading-[0.85] [&::first-letter]:text-[color:var(--ember-deep)]">
                  &ldquo;{effectiveReply}&rdquo;
                </p>
              </section>
            )}

            {matchSettled && pickId && (
              <CriticCard
                personaId={personaId}
                pickedSofaId={pickId}
                onSnapshot={setCriticSnap}
              />
            )}
          </aside>

          <section
            role="status"
            aria-live="polite"
            aria-atomic="false"
            aria-label="Goldilocks assessments"
          >
            {showCustomForm && (
              <CustomPersonaForm
                onSubmit={handleCustomSubmit}
                onCancel={() => {
                  setShowCustomForm(false);
                  setDraftPersona(null);
                }}
                onDraftChange={setDraftPersona}
              />
            )}

            {!showCustomForm && assessmentsCount === 0 && !isLoading && (
              <div className="border-t border-[color:var(--rule-loud)] pt-8">
                <p className="eyebrow mb-6">The thesis</p>
                <h1 className="font-display text-[var(--display-xl)] font-normal leading-[0.95] tracking-tight text-[color:var(--ink)]">
                  The dimension
                  <br />
                  your spec sheet
                  <br />
                  <em className="italic text-[color:var(--ember-deep)]">
                    didn&rsquo;t list.
                  </em>
                </h1>
                <p className="mt-8 max-w-[62ch] text-[1.0625rem] leading-relaxed text-[color:var(--ink-soft)]">
                  Most sofas don&rsquo;t publish the dimension that decides
                  the purchase. Goldilocks reads seat height, depth, cushion
                  firmness, armrest geometry, and weight capacity. By the
                  inch.
                </p>
                <p className="mt-6 max-w-[62ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink-quiet)]">
                  Pick a customer. Run the agent. Each one gets a different
                  answer. Press{" "}
                  <span className="text-[color:var(--ink)]">
                    Run for {persona.name}
                  </span>{" "}
                  when ready.
                </p>
              </div>
            )}

            {!showCustomForm && isLoading && assessmentsCount === 0 && (
              <div className="border-t border-[color:var(--rule-loud)] pt-8">
                <p className="eyebrow mb-2">In progress</p>
                <p className="font-display text-[1.5rem] italic text-[color:var(--ink-soft)]">
                  Measuring {CORPUS_SIZE} sofas
                  <span
                    aria-hidden
                    className="prime-breathe ml-0.5 inline-block not-italic"
                  >
                    ″
                  </span>
                </p>
              </div>
            )}

            {assessmentsCount > 0 && (
              <>
                <p className="eyebrow mb-2">The corpus</p>
                <p className="font-display text-[1.5rem] italic leading-tight text-[color:var(--ink-soft)]">
                  {matchSettled ? (
                    `${assessmentsCount} measured. One fits.`
                  ) : (
                    <>
                      <span className="cited not-italic text-[color:var(--ink)]">
                        {assessmentsCount}
                      </span>{" "}
                      of{" "}
                      <span className="cited not-italic">{CORPUS_SIZE}</span>{" "}
                      measured
                      <span
                        aria-hidden
                        className="prime-breathe ml-0.5 inline-block not-italic"
                      >
                        ″
                      </span>
                    </>
                  )}
                </p>

                <div className="mt-8">
                  {uniqueAssessments.slice(0, CORPUS_SIZE).map((a, i) => (
                    <AssessmentCard
                      key={`${a?.sofa_id ?? i}-${i}`}
                      assessment={a ?? {}}
                      index={i}
                      isMatch={i === matchIndex && matchSettled}
                      isDimmed={dimNonMatches && i !== matchIndex}
                      persona={persona}
                    />
                  ))}
                </div>
              </>
            )}

            <TopPicksList topPicks={topPicks as never} />

            {matchSettled && pickId && criticSnap?.settled && (
              <SynthesisCard
                personaId={personaId}
                initialPickId={pickId}
                initialReply={draftedReply}
                criticVerdict={criticSnap.verdict}
                criticReasoning={criticSnap.reasoning}
                criticMissed={criticSnap.missed}
                onUpdatedReply={setSynthesisReply}
                onFinalPick={setSynthesisPickId}
              />
            )}

            {isLoading && assessmentsCount > 0 && (
              <div className="mt-8 flex items-center justify-between border-t border-[color:var(--rule-quiet)] pt-4">
                <span className="cited-quiet tabular text-xs">
                  {assessmentsCount} / {CORPUS_SIZE}
                </span>
                <button
                  type="button"
                  onClick={stop}
                  className={`text-xs text-[color:var(--ink-quiet)] hover:text-[color:var(--ink)] ${FOCUS_RING}`}
                >
                  Stop
                </button>
              </div>
            )}

            {error && (
              <p className="mt-8 border-t border-[color:var(--reject-edge)] pt-4 text-sm text-[color:var(--reject)]">
                Something went off-spec. Try again, or pick a different
                customer.
              </p>
            )}
          </section>
        </div>

        <footer className="mt-24 border-t border-[color:var(--rule-quiet)] pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="cited-quiet text-xs">
              <em className="not-italic font-medium text-[color:var(--ink)]">
                Wayfair sells sofas. Goldilocks sells fits.
              </em>
            </p>
            <p className="cited-quiet text-xs">
              Subconscious &middot; Baseten
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
