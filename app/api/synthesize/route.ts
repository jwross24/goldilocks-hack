import { streamSynthesis } from "@/lib/agents/synthesize";
import { requireSubconsciousApiKey } from "@/lib/subconscious";

export const maxDuration = 120;

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

  const personaId: string =
    typeof body?.personaId === "string" ? body.personaId : "maya";
  const customPersona = body?.customPersona;
  const initialPickId: string =
    typeof body?.initialPickId === "string" ? body.initialPickId : "";
  const initialReply: string =
    typeof body?.initialReply === "string" ? body.initialReply : "";
  const criticVerdict = body?.criticVerdict;
  const criticReasoning: string =
    typeof body?.criticReasoning === "string" ? body.criticReasoning : "";
  const criticMissed: string | null =
    typeof body?.criticMissed === "string" ? body.criticMissed : null;

  if (!initialPickId || !criticVerdict) {
    return Response.json(
      { error: "Missing initialPickId or criticVerdict" },
      { status: 400 },
    );
  }

  const result = streamSynthesis({
    personaId,
    initialPickId,
    initialReply,
    criticVerdict,
    criticReasoning,
    criticMissed,
    customPersona,
  });
  return result.toTextStreamResponse();
}
