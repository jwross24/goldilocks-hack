import { streamGoldilocks } from "@/lib/agents/goldilocks";
import { requireSubconsciousApiKey } from "@/lib/subconscious";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    requireSubconsciousApiKey();
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Missing Subconscious API key",
      },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const userQuery: string =
    body?.query ??
    "Find this customer their just-right sofa from the corpus.";
  const personaId: string =
    typeof body?.personaId === "string" ? body.personaId : "maya";
  const customPersona = body?.customPersona;

  const result = streamGoldilocks(userQuery, personaId, customPersona);
  return result.toTextStreamResponse();
}
