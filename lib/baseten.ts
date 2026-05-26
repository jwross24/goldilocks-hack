import { createOpenAI } from "@ai-sdk/openai";

/**
 * Baseten provides OpenAI-compatible chat completions at:
 *   https://inference.baseten.co/v1
 *
 * We use a *different model than Subconscious* to get a genuine
 * second opinion on Goldilocks's pick — not a self-confirmation loop.
 */

const BASETEN_BASE_URL = "https://inference.baseten.co/v1";

/** Fast, cheap, strong tool-following model on Baseten. */
export const BASETEN_MODEL_ID = "openai/gpt-oss-120b";

const baseten = createOpenAI({
  baseURL: BASETEN_BASE_URL,
  apiKey: process.env.BASETEN_API_KEY,
});

export const basetenModel = baseten.chat(BASETEN_MODEL_ID);

export function requireBasetenApiKey() {
  const apiKey = process.env.BASETEN_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing BASETEN_API_KEY. Get one at https://www.baseten.co/",
    );
  }
  return apiKey;
}
