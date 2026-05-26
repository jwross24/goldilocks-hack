import { streamObject } from "ai";
import { z } from "zod";
import { subconsciousModel } from "@/lib/subconscious";
import sofasData from "@/lib/data/sofas.json";

export type Persona = (typeof sofasData.personas)[number];
export const personas = sofasData.personas as Persona[];
export const personasById: Record<string, Persona> = Object.fromEntries(
  personas.map((p) => [p.id, p]),
);

/** Default + backward-compat (the original demo persona). */
export const mayaPersona = personasById.maya;

/** A single sofa's verdict against the customer's constraints. */
export const AssessmentSchema = z.object({
  sofa_id: z
    .string()
    .describe("The id field from the sofa corpus, exactly as provided"),
  sofa_name: z
    .string()
    .describe("The sofa's product name, shortened to <= 6 words"),
  price_usd: z
    .number()
    .nullable()
    .describe("Listed price in USD, null if not listed"),
  verdict: z
    .enum([
      "JUST_RIGHT",
      "TOO_LOW",
      "TOO_HIGH",
      "OVER_BUDGET",
      "BORDERLINE",
    ])
    .describe("Single-word verdict for this sofa"),
  primary_reason: z
    .string()
    .describe(
      "One sentence citing the specific dimension/spec that drove the verdict",
    ),
  cited_value: z
    .string()
    .describe(
      "The specific number that drove the verdict, e.g. 'seat height 15.74in' or 'price $1,429'",
    ),
});

export const TopPickSchema = z.object({
  rank: z.number().describe("1, 2, or 3 — strictly ordered"),
  sofa_id: z.string().describe("The id from the corpus, exactly"),
  why_chosen: z
    .string()
    .describe(
      "One sentence on why this sofa earned this rank for THIS customer",
    ),
  tradeoff: z
    .string()
    .describe(
      "For rank 1: the one caveat (or 'none' if perfect). For rank 2-3: what this sofa gives up vs the rank above it. Be specific with numbers.",
    ),
});

export const GoldilocksOutputSchema = z.object({
  assessments: z
    .array(AssessmentSchema)
    .describe(
      "Verdict for each sofa in the corpus. Output ALL sofas in the order they appear in the corpus.",
    ),
  top_picks: z
    .array(TopPickSchema)
    .describe(
      "The 1-3 best matches, ranked. Always include at least 1; up to 3 if multiple JUST_RIGHT or strong BORDERLINE candidates exist.",
    ),
  pick: z.object({
    sofa_id: z
      .string()
      .describe(
        "The id of the rank-1 pick (same as top_picks[0].sofa_id). For UI backward compatibility.",
      ),
    summary: z
      .string()
      .describe(
        "One paragraph explaining why the rank-1 sofa is the right call",
      ),
  }),
  drafted_reply: z
    .string()
    .describe(
      "A 3-sentence message addressed to the customer by name, in second person. Warm but not patronizing. Mentions the rank-1 pick and a key fit detail.",
    ),
});

export type GoldilocksOutput = z.infer<typeof GoldilocksOutputSchema>;

function buildSystemPrompt(persona: Persona): string {
  const lo = persona.constraints.seat_height_in.min;
  const hi = persona.constraints.seat_height_in.max;
  const maxDepth = persona.constraints.max_seat_depth_in;
  const budget = persona.constraints.max_budget_usd;

  return `You are Goldilocks — an AI shopping agent that finds furniture that's *just right* for each customer's body, budget, and home.

## The Customer

${JSON.stringify(persona, null, 2)}

## The Product Corpus

You must assess EVERY ONE of these ${sofasData.sofas.length} sofas, in the order listed:

${JSON.stringify(sofasData.sofas, null, 2)}

## Reasoning Rules

This customer's seat-height comfort range is **${lo}–${hi} inches** (${persona.constraints.seat_height_in.rationale}).

- Seat height < ${lo} inches → **TOO_LOW**
- Seat height > ${hi} inches → **TOO_HIGH**
- Seat depth > ${maxDepth} inches → **TOO_HIGH** (this body cannot perch forward to stand)
- Price > $${budget} → **OVER_BUDGET**
- Meets criteria with a real concern (borderline seat height, missing data) → **BORDERLINE** with explanation
- Meets all criteria cleanly → **JUST_RIGHT**

For each sofa, cite the specific number (e.g. "seat height 15.74in", "price $1,429", "seat depth 31in"). Be honest — borderline cases should be marked BORDERLINE, not stretched to JUST_RIGHT.

After assessing all 8, identify the **top 1–3 picks** ranked by fit for this customer:
- Rank 1 is the best overall. Prefer JUST_RIGHT over BORDERLINE. Among ties, prefer seat height closest to the center of the range, then lowest price.
- Rank 2 (if a meaningful runner-up exists): the second-best option, with an explicit tradeoff vs rank 1 (e.g. "$450 cheaper but the depth is 2 inches deeper — forces forward perch").
- Rank 3 (if a third candidate is genuinely viable): the third-best, with its tradeoff vs rank 2.

Be honest. If only one sofa truly fits, only return one in top_picks. Don't pad. A short, honest list beats a long, hedged one.

Draft a 3-sentence reply to the customer **by name**. Calm, specific, respectful. Never patronizing. Acknowledge what fits, briefly mention one key spec, close with confidence about delivery.

## Output

Return strict JSON matching the provided schema. No prose outside the JSON. No markdown.`;
}

/**
 * Stream Goldilocks reasoning for a specific persona. Returns a streamObject
 * result whose object shape matches GoldilocksOutputSchema. Each assessment
 * surfaces in the stream as TIM emits it.
 *
 * If `customPersona` is provided, it overrides the preset lookup.
 */
export function streamGoldilocks(
  userQuery: string,
  personaId: string = "maya",
  customPersona?: Persona,
) {
  const persona =
    customPersona ?? personasById[personaId] ?? mayaPersona;
  return streamObject({
    model: subconsciousModel,
    schema: GoldilocksOutputSchema,
    system: buildSystemPrompt(persona),
    prompt:
      userQuery ||
      `Find ${persona.name} their just-right sofa from the corpus. Show your reasoning for every option.`,
  });
}
