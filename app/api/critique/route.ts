import { streamCritique } from "@/lib/agents/critic";
import { requireBasetenApiKey } from "@/lib/baseten";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    requireBasetenApiKey();
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Missing Baseten API key",
      },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const personaId: string =
    typeof body?.personaId === "string" ? body.personaId : "maya";
  const pickedSofaId: string =
    typeof body?.pickedSofaId === "string" ? body.pickedSofaId : "";
  const customPersona = body?.customPersona;

  if (!pickedSofaId) {
    return Response.json(
      { error: "Missing pickedSofaId in request body" },
      { status: 400 },
    );
  }

  const result = streamCritique(personaId, pickedSofaId, customPersona);
  return result.toTextStreamResponse();
}
