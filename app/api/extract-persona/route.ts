import { streamPersonaExtraction } from "@/lib/agents/extract-persona";
import { requireSubconsciousApiKey } from "@/lib/subconscious";

export const maxDuration = 60;

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
  const description: string =
    typeof body?.description === "string" ? body.description : "";

  if (!description.trim()) {
    return Response.json(
      { error: "Missing description" },
      { status: 400 },
    );
  }

  const result = streamPersonaExtraction(description);
  return result.toTextStreamResponse();
}
