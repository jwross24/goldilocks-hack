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
    const idx = uniqueAssessments.findIndex((a) => a?.sofa_id === id);
    if (idx === -1) return -1;
    // Defensive: don't celebrate as "the match" if the verdict for that sofa
    // says it's not actually JUST_RIGHT or BORDERLINE. Prevents nonsense like
    // "Carlos, this one." being slapped on a sofa marked TOO LOW.
    const v = uniqueAssessments[idx]?.verdict;
    if (v && v !== "JUST_RIGHT" && v !== "BORDERLINE") return -1;
    return idx;
  }, [pickId, synthesisPickId, uniqueAssessments]);
  // Only treat as "matched" once the stream is settled (we have summary) —
  // otherwise the climax fires before stillness is earned.
  const matchSettled = !isLoading && Boolean(pickId);
  const dimNonMatches = matchSettled && matchIndex >= 0;

  const effectiveReply = synthesisReply ?? draftedReply;
  const effectivePickId = synthesisPickId ?? pickId;

  // Split the reply into its first alpha character + the rest so the
  // decorative drop-cap targets the real first letter ("M" in "Maya, …")
  // and not the curly opening quote. We render the quote as a sibling
  // decorative span; the drop-cap span carries the styling.
  const replyParts = (() => {
    if (!effectiveReply) return null;
    const match = effectiveReply.match(/^(\s*)([A-Za-z])([\s\S]*)$/);
    if (!match) return { lead: "", first: "", rest: effectiveReply };
    return { lead: match[1], first: match[2], rest: match[3] };
  })();

  const lastSubmittedKey = useRef<string | null>(null);
  // Internal runner that takes the persona explicitly — used both by the
  // header Run button (reads current state) and by handleCustomSubmit
  // (which has a fresh persona that hasn't propagated through state yet).
  const runForPersona = (p: Persona, isCustom: boolean) => {
    setCriticSnap(null);
    setSynthesisReply(null);
    setSynthesisPickId(null);
    if (isLoading) stop();
    const key = isCustom ? "__custom" : p.id;
    lastSubmittedKey.current = key;
    setResultsForPersonaId(key);
    setShowCustomForm(false);
    setDraftPersona(null);
    submit({
      personaId: isCustom ? "__custom" : p.id,
      customPersona: isCustom ? p : undefined,
      query: `Find ${p.name} their just-right sofa from the corpus.`,
    });
  };

  const handleRun = () => {
    runForPersona(persona, isCustomActive);
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
    // Run immediately — one click, no extra confirmation.
    runForPersona(p, true);
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

            {!showCustomForm && matchSettled && pickId && (
              <div
                className="grow-smooth slot-reserve space-y-8"
                style={{ ["--slot-min" as string]: "16rem" }}
              >
                {effectiveReply && replyParts && (
                  <section className="reveal border-t border-[color:var(--rule-quiet)] pt-6">
                    <p className="eyebrow mb-3 text-[color:var(--right)]">
                      Goldilocks &rarr; {persona.name}
                      {synthesisReply &&
                        synthesisPickId &&
                        synthesisPickId !== pickId && (
                          <span className="ml-2 text-[color:var(--ember-deep)] normal-case tracking-normal">
                            (revised)
                          </span>
                        )}
                    </p>
                    <p className="font-display text-[1.125rem] italic leading-snug text-[color:var(--ink)]">
                      {replyParts.first && (
                        <span className="drop-cap" aria-hidden>
                          {replyParts.first}
                        </span>
                      )}
                      <span className="sr-only">
                        {replyParts.lead}
                        {replyParts.first}
                      </span>
                      {replyParts.rest}
                    </p>
                  </section>
                )}

                <CriticCard
                  personaId={personaId}
                  customPersona={isCustomActive ? customPersona : null}
                  pickedSofaId={pickId}
                  onSnapshot={setCriticSnap}
                />
              </div>
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

            {!showCustomForm && (isLoading || assessmentsCount > 0) && (
              <div className="border-t border-[color:var(--rule-loud)] pt-8">
                <div className="grid grid-cols-[1fr_auto] items-baseline gap-4">
                  <p className="eyebrow">
                    {matchSettled ? "The corpus" : "Measuring"}
                  </p>
                  {isLoading && (
                    <button
                      type="button"
                      onClick={stop}
                      className={`text-xs text-[color:var(--ink-quiet)] hover:text-[color:var(--ink)] ${FOCUS_RING}`}
                    >
                      Stop
                    </button>
                  )}
                </div>
                <p className="mt-2 font-display text-[1.5rem] italic leading-tight text-[color:var(--ink-soft)]">
                  <span className="cited tabular not-italic text-[color:var(--ink)]">
                    {assessmentsCount}
                  </span>
                  <span className="px-1.5">of</span>
                  <span className="cited tabular not-italic">{CORPUS_SIZE}</span>{" "}
                  {matchSettled ? (
                    <>measured. One fits.</>
                  ) : assessmentsCount >= CORPUS_SIZE ? (
                    <>
                      measured. Picking the just-right one
                      <span aria-hidden className="prime-breathe ml-1 not-italic">
                        ″
                      </span>
                    </>
                  ) : (
                    <>
                      measured against{" "}
                      <span className="not-italic">{persona.name}</span>
                      <span aria-hidden className="prime-breathe ml-1 not-italic">
                        ″
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}

            {!showCustomForm && assessmentsCount > 0 && (
              <>
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

            {!showCustomForm && <TopPicksList topPicks={topPicks as never} />}

            {!showCustomForm && matchSettled && pickId && (
              <div
                className="grow-smooth slot-reserve"
                style={{ ["--slot-min" as string]: "18rem" }}
              >
                {criticSnap?.settled && (
                  <div className="reveal">
                    <SynthesisCard
                      personaId={personaId}
                      customPersona={isCustomActive ? customPersona : null}
                      initialPickId={pickId}
                      initialReply={draftedReply}
                      criticVerdict={criticSnap.verdict}
                      criticReasoning={criticSnap.reasoning}
                      criticMissed={criticSnap.missed}
                      onUpdatedReply={setSynthesisReply}
                      onFinalPick={setSynthesisPickId}
                    />
                  </div>
                )}
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
