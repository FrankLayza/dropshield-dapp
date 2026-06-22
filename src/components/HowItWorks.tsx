import { Reveal } from "@/components/Reveal";

/* ── How It Works ───────────────────────────────────────────────────────────
   Three-step flow that answers "what actually happens when I use this?" for a
   sender evaluating the product. Horizontal on desktop (joined by a dashed
   rail), vertical stack on mobile. Copy speaks to the sender. */

const STEPS = [
  {
    title: "Upload your list",
    body: "Add contributors or grantees with their amounts. No minimum, and no wallet needed to start.",
    icon: UploadIcon,
  },
  {
    title: "Amounts encrypted in-browser",
    body: "FHE encrypts each allocation before it ever leaves your browser. On-chain: ciphertext only. Nobody reads it.",
    icon: LockIcon,
  },
  {
    title: "Recipients claim privately",
    body: "Each person opens their private link, verifies their own amount, and claims. On-chain: only that a claim happened.",
    icon: ShieldCheckIcon,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-violet-tint px-3.5 py-1.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-violet">
            How it works
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-[1.08] tracking-[-0.025em] text-ink sm:text-[2.75rem]">
            Private in three steps
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-mute">
            From your spreadsheet to an on-chain claim — the amounts never become
            readable at any point along the way.
          </p>
        </Reveal>

        <Reveal.Stagger className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Dashed rail joining the three steps (desktop only) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden border-t-2 border-dashed border-violet-line/70 md:block"
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal.Item key={step.title} className="relative">
                <div className="flex flex-col items-start">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-edge bg-white text-violet shadow-[0_12px_30px_-12px_rgba(80,40,180,0.35)]">
                    <Icon />
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet font-mono text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold tracking-[-0.015em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-mute">{step.body}</p>
                </div>
              </Reveal.Item>
            );
          })}
        </Reveal.Stagger>
      </div>
    </section>
  );
}

/* ── Icons (inline, currentColor) ─────────────────────────────────────────── */
function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 5.5v5c0 4.2 2.9 6.9 7 8 4.1-1.1 7-3.8 7-8v-5L12 3Z" />
      <path d="m9 11.5 2 2 4-4" />
    </svg>
  );
}
