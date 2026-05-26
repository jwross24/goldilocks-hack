"use client";

import sofasData from "@/lib/data/sofas.json";

interface TopPick {
  rank?: number;
  sofa_id?: string;
  why_chosen?: string;
  tradeoff?: string;
}

const sofaIndex = Object.fromEntries(
  (
    sofasData.sofas as Array<{
      id: string;
      name: string;
      price_usd?: number | null;
      url?: string;
    }>
  ).map((s) => [s.id, s]),
);

export function TopPicksList({ topPicks }: { topPicks: TopPick[] | undefined }) {
  if (!topPicks || topPicks.length === 0) return null;

  return (
    <section className="mt-12 border-t border-[color:var(--rule-loud)] pt-8">
      <p className="eyebrow mb-1 text-[color:var(--ember-deep)]">
        Why this one, why not the others
      </p>
      <p className="font-display text-[1.5rem] italic leading-tight text-[color:var(--ink-soft)]">
        Ranked, with tradeoffs.
      </p>

      <ol className="mt-8 space-y-8">
        {topPicks.map((pick, i) => {
          const sofa = pick.sofa_id ? sofaIndex[pick.sofa_id] : undefined;
          const isTop = (pick.rank ?? i + 1) === 1;
          return (
            <li
              key={`${pick.sofa_id ?? i}-${i}`}
              className="grid gap-4 border-t border-[color:var(--rule-quiet)] pt-6 sm:grid-cols-[60px_1fr]"
            >
              <div>
                <p
                  className={`font-display text-[3rem] italic leading-none ${
                    isTop
                      ? "text-[color:var(--ember-deep)]"
                      : "text-[color:var(--ink-quiet)]"
                  }`}
                >
                  {pick.rank ?? i + 1}
                </p>
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-[1.0625rem] font-medium text-[color:var(--ink)]">
                    {sofa?.name ?? pick.sofa_id ?? "…"}
                  </h3>
                  {typeof sofa?.price_usd === "number" && (
                    <span className="cited-quiet tabular text-xs">
                      ${sofa.price_usd.toLocaleString()}
                    </span>
                  )}
                </div>
                {pick.why_chosen && (
                  <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-[color:var(--ink)]">
                    {pick.why_chosen}
                  </p>
                )}
                {pick.tradeoff && pick.tradeoff.toLowerCase() !== "none" && (
                  <p className="mt-2 max-w-[60ch] text-[0.875rem] italic leading-relaxed text-[color:var(--ink-quiet)]">
                    {isTop ? "Caveat: " : "Tradeoff vs. above: "}
                    {pick.tradeoff}
                  </p>
                )}
                {sofa?.url && (
                  <a
                    href={sofa.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-baseline gap-1 text-xs text-[color:var(--ink-quiet)] underline decoration-[color:var(--rule-loud)] underline-offset-4 transition hover:text-[color:var(--ember-deep)] hover:decoration-[color:var(--ember-deep)]"
                  >
                    View on Wayfair <span aria-hidden>&rarr;</span>
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
