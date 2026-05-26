# Goldilocks

> Furniture that fits — by the inch.

An AI shopping agent that finds furniture that's *just right* for a customer's specific body, budget, and home. Built for the **Beat The Clock Agent Hack** at Wayfair HQ — Boston Tech Week, May 26 2026.

## The problem

Most furniture is designed for the median customer. Sixty-one million Americans live with a disability, and millions more have bodies that don't fit median assumptions — back-injury shoppers, the elderly, tall and plus-size customers, new parents. Furniture spec sheets bury the dimensions that matter in 11pt gray text on page three of the PDP.

Goldilocks reads those dimensions and tells the truth, by the inch.

## How it works

1. Customer profile (constraints like wheelchair transfer range, budget, delivery needs) feeds into the system prompt.
2. A product corpus (8 real Wayfair sofas with real seat heights, depths, prices, and reviews) feeds into the same prompt.
3. The Subconscious TIM model reasons over all 8 candidates in a **single** structured-output call (via Vercel AI SDK `streamObject` with a Zod schema).
4. Each sofa returns a verdict — `TOO_LOW`, `TOO_HIGH`, `OVER_BUDGET`, `BORDERLINE`, or `JUST_RIGHT` — with the **exact cited number** that drove the decision.
5. The single best match earns an editorial pull-quote moment: *"Maya, this one."*

## Architecture

```
User query  ──▶  /api/goldilocks (Next.js route)
                      │
                      ▼
            streamObject(model, schema, prompt)
                      │
                      ▼
          Subconscious TIM-Qwen3.6-27b
        (OpenAI-compat, response_format: json_schema)
                      │
                      ▼
       { assessments[], pick, drafted_reply }
                      │
                      ▼
        experimental_useObject (streaming UI)
```

**Why streamObject and not tool-calling?** Subconscious's API doesn't accept a server-side `tools` field. The schema-forced structured-output pattern (`response_format: json_schema`) is the canonical Subconscious approach — borrowed from their `hack-cli-starter` agent loop.

## Stack

- **Reasoning**: [Subconscious](https://subconscious.dev) (`tim-qwen3.6-27b`) via Vercel AI SDK
- **App**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind v4 with custom OKLCH design tokens
- **Typography**: Source Serif 4 (display) · Manrope (body) · JetBrains Mono (data only)
- **Critic**: [Baseten](https://baseten.co) (`gpt-oss-120b`) second-opinion validation

## Design philosophy

Numbers are the brand. The seat-height value isn't a spec — it's the headline. Every assessment shows the **exact gap** to the customer's transfer range, not a vague verdict pill. The interface is editorial register, not dashboard register. Read [`.impeccable.md`](./.impeccable.md) for the full design context.

## Run locally

```bash
pnpm install
cp .env.example .env.local
# Add your SUBCONSCIOUS_API_KEY from https://subconscious.dev/platform
pnpm dev
# Open http://localhost:3000
```

## The team

Solo build. Sponsored by Wayfair, Subconscious, and Baseten.
