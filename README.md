# Goldilocks

> Furniture that fits — by the inch.

An AI shopping agent that finds furniture that's *just right* for each customer's specific body, budget, and home. Built solo for the **Beat The Clock Agent Hack** at Wayfair HQ — Boston Tech Week, May 26 2026.

> *Wayfair sells sofas. Goldilocks sells fits.*

## The problem

Most furniture is designed for the median customer. Sixty-one million Americans live with a disability, and millions more have bodies that don't fit median assumptions — back-injury shoppers, the elderly, tall and plus-size customers, new parents. Spec sheets bury the dimensions that actually decide the purchase in 11pt gray text on page three of the PDP.

Goldilocks reads those dimensions and tells the truth, by the inch.

## Three multi-model beats

This isn't a one-shot LLM wrapper. The product runs **three separate model calls** — two vendors, three distinct roles:

1. **Goldilocks (Subconscious TIM)** assesses the corpus against the customer's constraints. Streams a structured verdict per sofa (`TOO_LOW` / `TOO_HIGH` / `OVER_BUDGET` / `BORDERLINE` / `JUST_RIGHT`) with the exact cited number. Drafts the customer-facing reply.
2. **Critic (Baseten `gpt-oss-120b`)** runs a fully independent second-opinion review of the rank-1 pick. Same problem, different model, different blind spots. Returns `AGREE` / `AGREE_WITH_CAVEAT` / `DISAGREE` with reasoning and a "what the first model missed" field.
3. **Synthesis (Subconscious TIM again)** fires only when the critic disagrees or flags a real caveat. Goldilocks reads the critique, then `HOLD`s its original pick, `CHANGE`s to a different sofa from the corpus, or `CONCEDE`s the caveat in a re-drafted customer reply.

The disagreement isn't a bug — it's the feature. Watch the agent change its mind when the data says it should.

## Five customers and one custom slot

- **Maya, 47** — manual wheelchair. ADA transfer range 17-19″.
- **Carlos, 52** — L4-L5 lumbar fusion. Stand-up range 19-22″.
- **Eleanor, 75** — arthritis + cane. Armrest-assisted stand 18-20″.
- **Sam, 34** — 6'5″ tall frame. 19-22″, max depth 32″.
- **Priya, 32** — six weeks post-C-section. 18-20″, max depth 24″.
- **+ You** — describe yourself in plain English; TIM extracts the numeric constraints and assesses against the same nine sofas.

## Architecture

```
                            ┌─────────────────────────────────┐
   POST /api/goldilocks ───►│ Subconscious TIM-Qwen3.6-27b    │──► assessments[], pick, drafted_reply
                            │ streamObject + Zod schema       │
                            └─────────────────────────────────┘
                                            │
                                            ▼
                            ┌─────────────────────────────────┐
   POST /api/critique  ────►│ Baseten gpt-oss-120b            │──► verdict, reasoning, missed_consideration
                            │ INDEPENDENT review of the pick  │
                            └─────────────────────────────────┘
                                            │
                                            ▼  (only if DISAGREE / AGREE_WITH_CAVEAT)
                            ┌─────────────────────────────────┐
   POST /api/synthesize ───►│ Subconscious TIM-Qwen3.6-27b    │──► decision (HOLD/CHANGE/CONCEDE),
                            │ reconciles with critic context  │    final_sofa_id, updated_reply
                            └─────────────────────────────────┘

   POST /api/extract-persona ─► TIM extracts {seat_height_in, max_depth, budget, ...}
                                from a free-form customer description (the +You flow).
```

**Why `streamObject` and not native tool-calling?** Subconscious's API doesn't accept a server-side `tools` field; the schema-forced structured-output pattern (`response_format: json_schema`) is the canonical Subconscious approach. Every model interaction in this codebase enforces a Zod schema. Zero parsing fragility across all four pipelines.

## Stack

- **Reasoning + extraction + synthesis**: [Subconscious](https://subconscious.dev) `tim-qwen3.6-27b` via Vercel AI SDK
- **Independent critic**: [Baseten](https://baseten.co) `openai/gpt-oss-120b`
- **App**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind v4 with OKLCH design tokens; Source Serif 4 (display) · Manrope (body) · JetBrains Mono (data only)
- **Streaming UI**: `experimental_useObject` from `@ai-sdk/react`

## Design philosophy

Numbers are the brand. The seat-height value isn't a spec — it's the headline. Every assessment shows the **exact gap** to the customer's comfort range (e.g. `15.74″ — 1.26″ below range`), not a vague verdict pill. The interface is editorial register, not dashboard register. Light warm-cream paper. No dark-AI-dashboard. No glassmorphism. No skeleton shimmer.

Read [`.impeccable.md`](./.impeccable.md) for the full design context document and [`.agents/product-marketing.md`](./.agents/product-marketing.md) for positioning.

## Run locally

```bash
pnpm install
cp .env.example .env.local
# Add SUBCONSCIOUS_API_KEY=sky_... (https://subconscious.dev/platform)
# Add BASETEN_API_KEY=...           (https://baseten.co)
pnpm dev
# Open http://localhost:3000
```

## The team

Solo build. Sponsored by Wayfair, Subconscious, and Baseten.
