import { streamObject } from "ai";
import { z } from "zod";
import { subconsciousModel } from "@/lib/subconscious";

/**
 * Extract structured constraints from a free-form customer description.
 * Uses TIM's structured-output capability to map prose → form fields.
 */

export const ExtractedPersonaSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe("The customer's name if mentioned. Null otherwise."),
  age: z
    .number()
    .nullable()
    .describe("Age as a number if mentioned, else null."),
  seat_height_min_in: z
    .number()
    .describe(
      "Inferred minimum comfortable seat height in inches based on body / mobility cues in the prose.",
    ),
  seat_height_max_in: z
    .number()
    .describe(
      "Inferred maximum comfortable seat height in inches. Must be >= min.",
    ),
  max_seat_depth_in: z
    .number()
    .describe(
      "Inferred max seat depth in inches. 22 for shallow/forward-perch needs, 28 for normal, 32 for tall/deep-back needs.",
    ),
  budget_usd: z
    .number()
    .describe("Inferred budget in USD. Default to 1000 if not specified."),
  rationale: z
    .string()
    .describe(
      "One sentence explaining what cues from the prose drove these inferences (e.g. 'Wheelchair user → 17-19 ADA transfer range').",
    ),
});

export type ExtractedPersona = z.infer<typeof ExtractedPersonaSchema>;

const SYSTEM_PROMPT = `You are a precision shopping intake agent. Read a customer's free-form description of themselves and infer the numeric constraints for furniture fit.

Guidance:
- Wheelchair self-transfer → seat height 17-19 inches (ADA), max depth 28
- Back injury / lumbar fusion → seat height 19-22 inches (easier stand-up), max depth 22
- Arthritis / elderly → seat height 18-20 inches, max depth 22, firm preferred
- Tall body (6'2"+) → seat height 19-22, max depth 32+, deeper preferred
- New parent / post-surgery → seat height 18-20, max depth 22, firm preferred
- No specific cues → 17-22 inches default range, 28 depth, 1000 budget

If the prose mentions a specific dollar amount, use it. Otherwise default to 1000.

Be honest about ambiguity in the rationale. Return strict JSON matching the schema. No prose outside the JSON.`;

export function streamPersonaExtraction(description: string) {
  return streamObject({
    model: subconsciousModel,
    schema: ExtractedPersonaSchema,
    system: SYSTEM_PROMPT,
    prompt: `Customer description:\n\n${description}\n\nExtract the constraints.`,
  });
}
