import { streamObject } from "ai";
import { z } from "zod";
import { subconsciousModel } from "@/lib/subconscious";
import { personasById, type Persona, cleanCorpus, cleanSofa } from "@/lib/agents/goldilocks";
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
${JSON.stringify(cleanCorpus, null, 2)}

## Your Decision

Be honest. The second opinion may be right, partly right, or wrong. You can:

- **HOLD**: defend your original pick. Use this if the critic is wrong or the caveat doesn't outweigh the fit. Explain why in reconciliation_note.
- **CHANGE**: switch to a different sofa from the corpus. Use this if the critic identified a real disqualifier and another sofa is genuinely better. Pick the new sofa BY ID from the corpus.
- **CONCEDE**: keep the original pick but explicitly acknowledge the critic's caveat in your reply to the customer. Use this when the caveat is real but the pick is still the best option.

Then re-draft your message to the customer (3 sentences, by name, second person). The new reply MUST be internally consistent with your decision:
- If CHANGE: mention the NEW sofa by name and briefly why. Do NOT mention the original pick by name.
- If CONCEDE: keep the original pick by name; name the caveat ("one note about delivery...") clearly.
- If HOLD: defend the original pick without being defensive. Do NOT mention any other sofa.

## Critical output rules

- reconciliation_note is 1-2 SENTENCES MAX. Never include your internal reasoning trace, never say "Wait" or "Actually" or "let me re-evaluate", never enumerate sofas. Just a clean explanation of the final decision.
- NEVER include raw JSON field names like 'firm_cushion_preferred', 'max_budget_usd', 'seat_height_in'. Use natural language ("firm cushion preference", "the $1,500 budget", "20-inch seat height").
- The updated_reply must MATCH the decision. If decision is CHANGE, the reply must talk about the new sofa, not the old one.

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
