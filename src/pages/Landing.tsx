import { useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { Footer } from "@/components/Footer";
import { Features } from "@/components/Features";

/* ── Contiant-style hero, DropShield content ───────────────────────────────
   Two-column hero: left = headline / subhead / CTA + a bottom trust strip;
   right = a cluster of floating cards joined by dashed connectors telling
   DropShield's confidential-claim story (recipient → masked allocation →
   authorize → claimed). The entrance + idle float are driven by GSAP (one
   orchestrated timeline); Lenis (configured in App.tsx) carries the scroll.
   The violet accent lives in @theme as --color-violet*; global ink/gold stay. */

/* Features data is now in the Features component */

const TRUST = ["Zama Protocol", "TokenOps SDK", "ERC-7984", "FHE"];

export function Landing() {
  const heroRef = useRef<HTMLElement>(null);

  // GSAP entrance timeline + idle float, scoped to the hero. useLayoutEffect so
  // the from-state is set before paint (no flash). Honors reduced-motion.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".js-title", { y: 28, opacity: 0, duration: 0.9 })
        .from(".js-sub", { y: 20, opacity: 0, duration: 0.75 }, "-=0.6")
        .from(".js-cta", { y: 16, opacity: 0, duration: 0.6 }, "-=0.5")
        .from(
          ".js-card",
          { y: 34, opacity: 0, scale: 0.95, duration: 0.7, stagger: 0.1 },
          "-=0.55",
        )
        .add(() => {
          // Gentle, desynced idle float — each card drifts on its own clock.
          gsap.utils.toArray<HTMLElement>(".js-card").forEach((el, i) => {
            gsap.to(el, {
              y: "-=8",
              duration: 3.2 + i * 0.35,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            });
          });
        });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="grid items-center gap-12 pb-10 pt-2 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-16 lg:pt-4"
      >
        {/* Left column */}
        <div>
          <h1 className="js-title max-w-2xl font-display text-5xl font-extrabold leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[4.25rem]">
            <span className="text-violet">Private payroll</span>
            <br />
            <span className="text-ink">for </span>
            <span className="relative inline-block whitespace-nowrap text-ink">
              DAOs
              <UnderlineSquiggle />
            </span>
          </h1>

          <p className="js-sub mt-6 max-w-md text-base leading-relaxed text-mute">
            Pay your team in confidential ERC-7984 tokens — every amount encrypted on-chain.
            Contributors verify and claim only their own. Nobody else sees what anyone earns.
          </p>

          <div className="js-cta mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/admin"
              className="group inline-flex items-center gap-3 rounded-full bg-violet px-7 py-4 text-base font-semibold text-white shadow-lg shadow-violet/25 transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-hover"
            >
              Create a campaign
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-150 group-hover:translate-x-1"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              to="/claim"
              className="link-rise text-base font-semibold text-ink transition-colors duration-150 hover:text-violet-deep"
            >
              Claim your payment
            </Link>
          </div>
        </div>

        {/* Right column — floating claim-flow cluster */}
        <ClaimFlowCluster />
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-4 border-t border-edge pt-8 sm:flex-row sm:items-center sm:gap-8 lg:mt-8">
        <span className="max-w-[10rem] text-sm font-medium leading-snug text-mute">
          Confidential by design.
          <br />
          Built on audited infrastructure
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-3 sm:justify-around">
          {TRUST.map((name) => (
            <span key={name} className="font-mono text-sm text-faint">
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES — GSAP scroll-driven section ──────────────────────── */}
      <Features />

      <Footer />
    </div>
  );
}

/* ── Hand-drawn violet underline beneath the highlighted keyword ──────────── */
function UnderlineSquiggle() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      className="absolute -bottom-2 left-0 h-3 w-full"
    >
      <path
        d="M3 7 C 40 2, 80 11, 120 5 S 180 3, 197 7"
        fill="none"
        stroke="var(--color-violet)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Right-side cluster ────────────────────────────────────────────────────
   Cards float at varied offsets, joined by dashed connectors, with one
   accent-colored "claimed" card. Each card carries .js-card so the hero's
   GSAP timeline animates it in and floats it. */
function ClaimFlowCluster() {
  return (
    <div className="relative">
      {/* Mobile: a single representative card (cluster is lg-only). */}
      <div className="js-card lg:hidden">
        <AllocationCard />
      </div>

      {/* Desktop: full constellation */}
      <div className="relative hidden h-[540px] w-full lg:block">
        {/* Dashed connectors behind the cards */}
        <svg
          aria-hidden
          viewBox="0 0 520 540"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <g fill="none" stroke="var(--color-violet-line)" strokeWidth="1.5" strokeDasharray="5 6">
            <path d="M250 120 C 250 200, 150 200, 150 280" />
            <path d="M395 165 C 460 230, 360 250, 360 300" />
            <path d="M300 380 C 370 360, 330 330, 322 305" />
          </g>
        </svg>

        <div className="js-card hero-card absolute left-0 top-6 w-44">
          <RecipientCard />
        </div>
        <div className="js-card hero-card absolute left-40 top-0 w-60">
          <AllocationCard />
        </div>
        <div className="js-card hero-card absolute right-0 top-8 w-44">
          <ProofCard />
        </div>
        <div className="js-card hero-card absolute left-8 top-72 w-72">
          <AuthorizeCard />
        </div>
        <div className="js-card hero-card absolute right-0 top-[300px] w-44">
          <ClaimedCard />
        </div>
      </div>
    </div>
  );
}

/* ── Card primitives ──────────────────────────────────────────────────────── */
const CARD =
  "rounded-2xl border border-black/[0.04] bg-white shadow-[0_24px_60px_-24px_rgba(40,24,80,0.28)]";

function RecipientCard() {
  return (
    <div className={CARD + " overflow-hidden p-3"}>
      <div
        className="relative h-44 w-full overflow-hidden rounded-xl"
        style={{ background: "linear-gradient(140deg,var(--color-violet-tint),var(--color-violet-line))" }}
      >
        <img
          src="/illustrations/mara.png"
          alt="Mara, recipient"
          className="absolute inset-x-0 bottom-0 mx-auto h-[92%] w-auto object-contain object-bottom"
          loading="lazy"
        />
        <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-white/95 px-2.5 py-1 text-xs shadow-sm backdrop-blur-sm">
          <span className="block font-semibold text-ink">Mara</span>
          <span className="block text-[10px] text-mute">eng. lead</span>
        </span>
      </div>
    </div>
  );
}

function AllocationCard() {
  return (
    <div className={CARD + " p-4"}>
      <p className="text-xs font-medium text-mute">Your allocation</p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-widest text-faint select-none">
        •••••• <span className="text-sm tracking-normal">tokens</span>
      </p>
      <button
        className="mt-4 w-full rounded-full bg-ink py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
        type="button"
      >
        Decrypt &amp; verify
      </button>
    </div>
  );
}

function ProofCard() {
  return (
    <div className={CARD + " p-4"}>
      <p className="text-center text-xs font-medium text-mute">On-chain ciphertext</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className="flex h-7 items-center justify-center rounded-md bg-violet-tint/50 font-mono text-[10px] text-violet-deep/70"
          >
            {["a9", "f3", "0c", "7d", "e1", "4b", "2f", "c8", "5a"][i]}
          </span>
        ))}
      </div>
    </div>
  );
}

function AuthorizeCard() {
  return (
    <div className={CARD + " p-5"}>
      <p className="text-sm font-semibold text-ink">Authorize claim</p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row label="Amount" value="•••• " />
        <Row label="Recipient" value="Mara" />
        <Row label="Campaign" value="Q2 Payroll" />
        <Row label="Sig (EIP-712)" value="0x9f…c8" mono />
      </dl>
      <button
        type="button"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Confirm claim
      </button>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-mute">{label}</dt>
      <dd className={(mono ? "font-mono " : "") + "font-medium text-ink"}>{value}</dd>
    </div>
  );
}

function ClaimedCard() {
  return (
    <div
      className="rounded-2xl p-5 shadow-[0_24px_60px_-24px_rgba(80,40,180,0.45)]"
      style={{ background: "linear-gradient(160deg,var(--color-violet-tint),var(--color-violet-edge))" }}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet text-white">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <p className="mt-3 text-sm font-semibold leading-snug text-violet-ink">
        Allocation
        <br />
        claimed
      </p>
    </div>
  );
}
