import { streamObject } from "ai";
import { z } from "zod";
import { subconsciousModel } from "@/lib/subconscious";
import { personasById, type Persona } from "@/lib/agents/goldilocks";
import sofasData from "@/lib/data/sofas.json";

/**
 * The synthesis turn. After Goldilocks (Subconscious) picks and Baseten
 * critiques, if there's disagreement or a meaningful caveat, we fire a third
 * call asking Goldilocks to reconsider with the critic's reasoning as input.
 *
 * The model can:
 *  - HOLD its original pick (defend it against the critique)
 *  - CHANGE to a different sofa from the corpus
 *  - CONCEDE the critique without changing pick (acknowledge the caveat in the reply)
 *
 * The drafted_reply gets rewritten to reflect whatever the final stance is.
 */

export const SynthesisOutputSchema = z.object({
  decision: z
    .enum(["HOLD", "CHANGE", "CONCEDE"])
    .describe(
      "HOLD: defending original pick. CHANGE: switching to a different sofa. CONCEDE: keeping the pick but acknowledging the caveat.",
    ),
  final_sofa_id: z
    .string()
    .describe(
      "The id of the final pick. Same as initial if HOLD or CONCEDE; different if CHANGE.",
    ),
  reconciliation_note: z
    .string()
    .describe(
      "1-2 sentences explaining what the critic said and how the final pick responds to it. Honest and specific.",
    ),
  updated_reply: z
    .string()
    .describe(
      "A re-drafted 3-sentence message to the customer that reflects the final stance. If CHANGE, mention the new pick. If CONCEDE, acknowledge the caveat. If HOLD, defend the original pick.",
    ),
});

export type SynthesisOutput = z.infer<typeof SynthesisOutputSchema>;

interface SynthesisInput {
  personaId: string;
  initialPickId: string;
  initialReply: string;
  criticVerdict: "AGREE" | "AGREE_WITH_CAVEAT" | "DISAGREE";
  criticReasoning: string;
  criticMissed: string | null;
  customPersona?: Persona;
}

function buildPrompt(input: SynthesisInput, persona: Persona) {
  const initialSofa = (sofasData.sofas as Array<{ id: string }>).find(
    (s) => s.id === input.initialPickId,
  );

  return `You are Goldilocks. You previously selected a sofa for this customer. A second model independently reviewed your choice and has feedback. Now you must reconsider.

## The Customer
${JSON.stringify(persona, null, 2)}

## Your Initial Pick
${JSON.stringify(initialSofa, null, 2)}

## Your Initial Reply to the Customer
"${input.initialReply}"

## The Second Opinion
- Verdict: ${input.criticVerdict}
- Reasoning: ${input.criticReasoning}
${input.criticMissed ? `- Caveat the critic flagged: ${input.criticMissed}` : ""}

## The Product Corpus (in case you want to switch)
${JSON.stringify(sofasData.sofas, null, 2)}

## Your Decision

Be honest. The second opinion may be right, partly right, or wrong. You can:

- **HOLD**: defend your original pick. Use this if the critic is wrong or the caveat doesn't outweigh the fit. Explain why in reconciliation_note.
- **CHANGE**: switch to a different sofa from the corpus. Use this if the critic identified a real disqualifier and another sofa is genuinely better. Pick the new sofa BY ID from the corpus.
- **CONCEDE**: keep the original pick but explicitly acknowledge the critic's caveat in your reply to the customer. Use this when the caveat is real but the pick is still the best option.

Then re-draft your message to the customer (3 sentences, by name, second person). The new reply should reflect your final stance honestly — if CHANGE, mention the new sofa and briefly why. If CONCEDE, name the caveat (e.g. "one note about delivery..."). If HOLD, defend without being defensive.

Return strict JSON matching the schema. No prose outside the JSON.`;
}

export function streamSynthesis(input: SynthesisInput) {
  const persona =
    input.customPersona ??
    personasById[input.personaId] ??
    personasById.maya;
  return streamObject({
    model: subconsciousModel,
    schema: SynthesisOutputSchema,
    prompt: buildPrompt(input, persona),
  });
}
