import { streamObject } from "ai";
import { z } from "zod";
import { basetenModel, BASETEN_MODEL_ID } from "@/lib/baseten";
import { personasById, type Persona } from "@/lib/agents/goldilocks";
import sofasData from "@/lib/data/sofas.json";

/**
 * The Baseten critic. Takes Goldilocks's rank-1 pick and the customer's persona,
 * runs an INDEPENDENT second-opinion on a different model. Surfaces any
 * consideration the first model might have missed.
 *
 * This is the multi-model orchestration move: Subconscious decides, Baseten
 * red-teams. Two different models, two different vendors, one structured
 * validation step.
 */

export const CritiqueSchema = z.object({
  verdict: z
    .enum(["AGREE", "AGREE_WITH_CAVEAT", "DISAGREE"])
    .describe("Independent verdict on whether the rank-1 pick is correct"),
  reasoning: z
    .string()
    .describe(
      "2-3 sentence independent rationale. Cite a specific spec or constraint.",
    ),
  missed_consideration: z
    .string()
    .nullable()
    .describe(
      "If the first model missed something important about THIS customer, name it specifically. Null if nothing was missed.",
    ),
  reviewer_model: z
    .string()
    .describe("The name of the reviewing model — set to: " + BASETEN_MODEL_ID),
});

export type Critique = z.infer<typeof CritiqueSchema>;

function buildCritiquePrompt(persona: Persona, pickedSofaId: string) {
  const sofa = (sofasData.sofas as Array<{ id: string }>).find(
    (s) => s.id === pickedSofaId,
  );
  return `You are an INDEPENDENT second-opinion reviewer for a furniture-fit shopping agent.

A different model (Subconscious TIM) just selected the following sofa for this customer:

## Customer
${JSON.stringify(persona, null, 2)}

## The Selected Sofa
${JSON.stringify(sofa, null, 2)}

## Full Product Corpus (the alternatives the first model considered)
${JSON.stringify(sofasData.sofas, null, 2)}

## Your Job

Independently assess whether the rank-1 pick is correct for THIS customer.

- AGREE: the pick is clearly the right call. Defend it with one specific spec citation.
- AGREE_WITH_CAVEAT: the pick is reasonable but there's a meaningful caveat the first model didn't surface (e.g. compression note on cushions, suspicious price, depth borderline). Name it.
- DISAGREE: a different sofa from the corpus would have been a better fit. Name which one and why.

Be honest, not polite. If the first model missed something important about THIS customer's specific body or constraints, say so.

Set reviewer_model to exactly: "${BASETEN_MODEL_ID}"

Return strict JSON matching the schema. No prose outside the JSON.`;
}

export function streamCritique(
  personaId: string,
  pickedSofaId: string,
  customPersona?: Persona,
) {
  const persona =
    customPersona ?? personasById[personaId] ?? personasById.maya;
  return streamObject({
    model: basetenModel,
    schema: CritiqueSchema,
    prompt: buildCritiquePrompt(persona, pickedSofaId),
  });
}
