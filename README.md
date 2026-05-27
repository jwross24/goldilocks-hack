# Goldilocks

> *Wayfair sells sofas. Goldilocks sells fits.*

**A shopping agent that reads furniture dimensions against your body.** Built solo in four hours for the **Beat The Clock Agent Hack** at Wayfair HQ — Boston Tech Week, May 26 2026. Track 1: Customer Agents.

---

## The problem

The dimension that decides whether you can use a sofa is missing from the product page.

A wheelchair user needs a seat between 17 and 19 inches for safe self-transfer. A 6'5″ frame needs ≥19 inches to stand up. A post-fusion lumbar patient needs the right balance of seat height *and* shallow depth so they can perch forward to rise.

Wayfair's listing shows price, color, fabric. It doesn't show whether you can stand up from it.

## The solution

Goldilocks reads every sofa in a curated corpus against a customer's actual constraints — seat height range, max seat depth, budget, mobility considerations — and returns one of five verdicts per sofa, with the **exact cited measurement** and the **gap to the comfort range**. Then it picks the just-right one.

Then a second model on a different inference provider critiques the pick. If it disagrees, the first model reconsiders publicly. The user watches the agent change its mind.

---

## What it does

Five preset customers + one custom slot. Each gets a different answer because each has a different body.

| Customer | Body | Comfort range | Budget |
|---|---|---|---|
| **Maya**, 47 | Manual wheelchair, ADA self-transfer | 17–19″ | $800 |
| **Carlos**, 52 | L4–L5 lumbar fusion, stand-up no twist | 19–22″ | $1,200 |
| **Eleanor**, 75 | Arthritis, cane, armrest-assisted stand | 18–20″ | $1,500 |
| **Sam**, 34 | 6'5″ frame, deeper preferred | 19–22″ (depth ≤32″) | $1,800 |
| **Priya**, 32 | Six weeks post-C-section | 18–20″ (depth ≤24″) | $1,000 |
| **+ You** | Describe yourself in plain English | inferred by TIM | inferred by TIM |

The corpus is 9 real Wayfair sofas — names, prices, URLs, and dimensions captured 2026-05-26.

### How it differs from a normal product page

| | Wayfair PDP | Goldilocks |
|---|---|---|
| **Shows** | Price · color · fabric · dimensions in 11pt gray | The number that decides whether you can use it |
| **Asks** | "Add to cart?" | "Whose body is this for?" |
| **Trusts** | Single source of product copy | Two models that must agree |
| **Rejects** | Nothing — every listing is "the perfect sofa" | Every rejection cites the exact gap |

---

## The multi-model loop

Three separate model calls, two vendors, three distinct roles:

```
                            ┌──────────────────────────────────┐
   POST /api/goldilocks ───►│ Subconscious  tim-qwen3.6-27b    │──► assessments[], pick, drafted_reply
                            │ streamObject + Zod schema        │
                            └──────────────────────────────────┘
                                            │
                                            ▼
                            ┌──────────────────────────────────┐
   POST /api/critique  ────►│ Baseten  openai/gpt-oss-120b     │──► verdict, reasoning, missed_consideration
                            │ INDEPENDENT review of the pick   │
                            └──────────────────────────────────┘
                                            │
                                            ▼  (only on DISAGREE / AGREE_WITH_CAVEAT)
                            ┌──────────────────────────────────┐
   POST /api/synthesize ───►│ Subconscious  tim-qwen3.6-27b    │──► decision (HOLD / CHANGE / CONCEDE),
                            │ reconciles with critic context   │    final_sofa_id, updated_reply
                            └──────────────────────────────────┘

   POST /api/extract-persona ─► TIM extracts {seat_height_min/max, max_depth, budget, ...}
                                from a free-form customer description (the +You flow).
```

### Why two models?

A single model is a single point of judgment. Cross-checking the pick on a different inference provider — different family, different training data, different blind spots — catches:

- Constraints the first model glossed over
- Hallucinated dimensions
- Edge cases where the heuristic was wrong (e.g., "fits the wheelchair user, but the cushion is too soft")

When the critic flags something real, the original model reconsiders publicly. The disagreement isn't a bug — it's the feature.

### Why `streamObject`, not native tool-calling?

The Subconscious API doesn't accept a server-side `tools` field. The canonical approach is forced structured output via `response_format: json_schema`. Every model interaction in this codebase enforces a Zod schema end-to-end. Zero parsing fragility across all four pipelines.

---

## Stack

- **Reasoning + extraction + synthesis**: [Subconscious](https://subconscious.dev) `tim-qwen3.6-27b` via the Vercel AI SDK
- **Independent critic**: [Baseten](https://baseten.co) `openai/gpt-oss-120b`
- **App**: Next.js 16 + React 19 + TypeScript
- **Streaming UI**: `experimental_useObject` from `@ai-sdk/react`
- **Styling**: Tailwind v4 with OKLCH design tokens — Source Serif 4 (display) · Manrope (body) · JetBrains Mono (data)

---

## Design philosophy

1. **Numbers are the brand.** Measurements get display-typography treatment. A seat-height value is not a spec — it's the headline.
2. **Show the gap, not just the verdict.** Every rejected sofa cites how far off it is — `15.74″ · 1.26″ below range`. Specificity is respect.
3. **Editorial register, not dashboard register.** Warm off-white paper. Tinted neutrals. No glassmorphism. No skeleton shimmer. No bouncy easing.
4. **Honesty over polish.** When the critic disagrees, the user sees it. The drafted reply rewrites itself rather than hide the dissent.

See [`.impeccable.md`](./.impeccable.md) for the full design brief.

---

## Run locally

```bash
git clone https://github.com/jwross24/goldilocks-hack
cd goldilocks-hack

bun install                            # pnpm install or npm install also work

# Create .env.local with two keys:
#   SUBCONSCIOUS_API_KEY=sky_...       https://subconscious.dev/platform
#   BASETEN_API_KEY=...                https://baseten.co

bun dev                                # http://localhost:3000
```

The app expects both keys at runtime — the critic falls back gracefully if `BASETEN_API_KEY` is missing, but the primary flow needs `SUBCONSCIOUS_API_KEY` to do anything.

---

## What this is NOT

- **Not connected to live inventory.** The corpus is 9 hand-curated sofas captured 2026-05-26.
- **Not an evaluation framework.** It demonstrates the multi-model loop; it doesn't measure pickup accuracy at scale.
- **Not a production product.** The personas, the corpus, the UI copy — all hand-tuned for the demo. The reasoning loop and architecture would generalize; the surface would need its own work.
- **Not magic.** Subconscious TIM leaks JSON field names and chain-of-thought into prose occasionally. The client has a defensive scrub layer (see `scrubProse`, `normalizeCited`, `sanitizeReply`) that catches the observed failure modes. It is not exhaustive.

---

## FAQ

**Why two model providers instead of one?**
Single-model judgment is a single point of failure. Different providers train on different data and hit different edge cases. Cross-checking on Baseten + gpt-oss-120b catches constraint violations that TIM glosses over.

**Why is the corpus only 9 sofas?**
Captured manually inside the four-hour build window. The architecture scales linearly; the data collection didn't.

**Why Subconscious for the primary reasoning?**
TIM is genuinely good at constraint-satisfaction reasoning when you give it structured output to fill. The "verdict + cited value + primary reason" pattern is its sweet spot, and the streaming UX hides the inference latency.

**Could this be a real product?**
The reasoning loop is real. The surface would need production work. The hard problem is upstream: many sofa PDPs don't publish seat height at all. Goldilocks would need that data to exist before it could measure against it.

**Does the critic ever actually disagree?**
Yes — most visibly on borderline budgets and depth/height tradeoffs. The disagreement-then-synthesis path is fired on `DISAGREE` and `AGREE_WITH_CAVEAT`; you'll see it land on roughly 1 in 4 runs across the five preset personas.

---

## Credits

Built for **Beat The Clock Agent Hack** at Wayfair HQ, Boston Tech Week — May 26 2026.

Powered by [Subconscious](https://subconscious.dev) and [Baseten](https://baseten.co). The Vercel AI SDK does the heavy lifting on streaming structured output.

The submission commit is tagged [`hackathon-submission`](https://github.com/jwross24/goldilocks-hack/releases/tag/hackathon-submission).

---

## About Contributions

*Please don't take this the wrong way, but I do not accept outside contributions for any of my projects. I simply don't have the mental bandwidth to review anything, and it's my name on the thing, so I'm responsible for any problems it causes; thus, the risk-reward is highly asymmetric from my perspective. I'd also have to worry about other "stakeholders," which seems unwise for tools I mostly make for myself for free. Feel free to submit issues, and even PRs if you want to illustrate a proposed fix, but know I won't merge them directly. Instead, I'll have Claude or Codex review submissions via `gh` and independently decide whether and how to address them. Bug reports in particular are welcome. Sorry if this offends, but I want to avoid wasted time and hurt feelings. I understand this isn't in sync with the prevailing open-source ethos that seeks community contributions, but it's the only way I can move at this velocity and keep my sanity.*

This repo is also an archived hackathon submission — the `hackathon-submission` tag is the point-in-time record of what was submitted.
