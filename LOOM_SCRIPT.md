# Loom voiceover script — Goldilocks

**60-second target. Calm, measured pace. Don't rush.**

## The arc

| Beat | What's on screen | What you say |
|---|---|---|
| **0:00-0:08** (8s) | Empty state, "The dimension your spec sheet didn't list." headline visible | "Every body has a comfort zone. Spec sheets hide the dimension that decides the purchase." |
| **0:08-0:18** (10s) | Click **Maya** in the nav. Her persona card on the left. Click **Run for Maya**. | "Meet Maya. Forty-seven. Wheelchair user. Her transfer range is seventeen to nineteen inches. Watch." |
| **0:18-0:32** (14s) | Assessment cards streaming in. Read the verdicts as they appear. | "Fifteen-point-seven, too low. Fifteen, too low. Twenty, too high. Eighteen-point-five — just right. Red Barrel Lourdez, two-seventy on Wayfair." |
| **0:32-0:42** (10s) | Drafted reply with drop cap appears on left. Baseten critic fires. | "Goldilocks drafts the reply. Then a second model — Baseten — reviews it independently. Disagrees. Flags a vacuum-packed cushion the first model missed." |
| **0:42-0:52** (10s) | Synthesis card appears: "Goldilocks reconsiders." | "Goldilocks reconsiders. Reads the critique. Holds, concedes, or changes. The drafted reply rewrites itself." |
| **0:52-0:58** (6s) | Click **+ You**. Show form. Type "I'm six-two with a back injury" in the prose box. Hit Measure. | "And it's not five customers. It's anyone. Type your body. Goldilocks does the math." |
| **0:58-1:00** (2s) | Footer line: "Wayfair sells sofas. Goldilocks sells fits." | "Wayfair sells sofas. Goldilocks sells fits." |

## Pre-flight checklist

Before recording:
- [ ] Refresh `localhost:3001` — confirm Maya is selected by default
- [ ] Close Chrome devtools, notifications, browser extensions
- [ ] Maximize the window. Hide bookmark bar.
- [ ] System sound off (no notification dings during record)
- [ ] Mic working — do a 3-second test in Loom
- [ ] Have the prose snippet ready to paste: *"I'm 6'2" with a back injury, prone to lumbar strain"*

## Recording notes

- **Pause for the JUST RIGHT card.** When the green card lands and "Maya, this one." appears in serif italic, give it a full second of silence. The brand is silence-as-tool.
- **Don't read the screen verbatim.** The viewer can read; you're narrating *over* what they see.
- **Verbalize the verdicts on stream.** Saying "fifteen-point-seven, too low" while the card appears with the same data feels like the agent is talking to Maya.
- **Pace your tempo to the streaming.** If the agent is slower than expected, fill with: "It's reading dimensions, materials, reviews — by the inch."

## Backup lines if something stalls

- If Subconscious hangs >15 seconds: "While it measures, the thesis: Wayfair has twenty-two million customers. Millions don't fit the median spec."
- If Baseten doesn't return: "Two models, two opinions, one answer."
- If synthesis doesn't fire (critic agreed): "When the models agree, Goldilocks ships. When they disagree, it reconsiders."

## Submission form pre-fill

| Field | Answer |
|---|---|
| Project name | **Goldilocks** |
| Team lead | Jon Ross |
| Team emails | jonathanwross24@gmail.com |
| Challenge / track | **Track 1: Agents for Customers** |
| One-sentence pitch | *Goldilocks is a multi-model AI shopping agent that reads furniture dimensions against a customer's body — by the inch — then reconsiders when a second opinion disagrees.* |
| Loom URL | [paste after recording] |
| Other supporting links | https://github.com/[your-username]/goldilocks-hack |
| Subconscious feedback | *TIM held three concurrent reasoning passes for us — sofa assessments (structured output over 9 candidates), critic synthesis (reconciliation across multi-model disagreement), and free-form persona extraction (prose to constraints). The structured-output JSON schema enforcement was the killer feature; zero parsing fragility across all three pipelines. Pairing TIM with Baseten GPT-OSS-120B as an independent critic produced genuinely better recommendations — the critic caught a vacuum-packed cushion caveat our first pass missed. The "different model, different blind spots" multi-vendor architecture is the move. Suggestion: a streaming-thoughts endpoint exposing TIM's intermediate reasoning would make the reject/match beats render even more cinematically in real-time UI.* |
