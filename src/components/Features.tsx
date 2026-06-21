import { useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ── Feature data ─────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    title: "Salary privacy, on-chain",
    body: "Contributors can't see each other's pay. Every amount is an FHE ciphertext on-chain — unreadable to everyone, including the issuer's other recipients.",
    illustration: "/illustrations/salary-privacy.png",
    bg: "#DFD1F4",
    accent: "var(--color-violet)",
    accentTint: "var(--color-violet-tint)",
  },
  {
    title: "Verify before you claim",
    body: "Each recipient decrypts their own allocation and confirms it before signing. No trust required; the math is the proof.",
    illustration: "/illustrations/verify-before-claim.png",
    bg: "#DFC9C0",
    accent: "var(--color-gold)",
    accentTint: "var(--color-gold-tint)",
  },
  {
    title: "No roster on-chain",
    body: "Only contributors who choose to claim reveal themselves. Your full payroll list never touches the blockchain.",
    illustration: "/illustrations/no-roster.png",
    bg: "#DFF3F6",
    accent: "#0891b2",
    accentTint: "#e0f7fa",
  },
];

/* ── Features Section ─────────────────────────────────────────────────────── */
export function Features({ revealMode = false }: { revealMode?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  // Sync Lenis' smooth scroll position into ScrollTrigger on every frame, so the
  // scrub-driven parallax tracks the eased scroll instead of the native one.
  useLenis(() => ScrollTrigger.update());

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 768px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { reduceMotion, isDesktop } = context.conditions!;
          if (reduceMotion) return;

          // On the landing page (desktop), this section is the rising panel of a
          // wipe-up reveal — the wipe IS its entrance. Its own scroll-triggered
          // reveals/parallax would fight the panel's transform, so skip them and
          // let the content render static inside the moving sheet. (Mobile keeps
          // the normal entrance animations since the wipe is disabled there.)
          if (revealMode && isDesktop) return;

          /* Header: eyebrow → title → subtitle rise in on enter. */
          gsap.from(".js-features-header > *", {
            scrollTrigger: { trigger: ".js-features-header", start: "top 85%" },
            y: 24,
            autoAlpha: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: "power3.out",
          });

          /* Bento cards stagger up as the grid enters. */
          gsap.from(".js-feature-card", {
            scrollTrigger: { trigger: ".features-grid", start: "top 80%" },
            y: 56,
            autoAlpha: 0,
            duration: 0.9,
            stagger: 0.14,
            ease: "power3.out",
          });

          /* CTA band rises in last. */
          gsap.from(".js-features-cta", {
            scrollTrigger: { trigger: ".js-features-cta", start: "top 88%" },
            y: 30,
            autoAlpha: 0,
            duration: 0.8,
            ease: "power3.out",
          });

          /* Scroll-driven parallax on each illustration (desktop only). Driven by
             scrub → smoothed by the Lenis ↔ ScrollTrigger sync above. */
          if (isDesktop) {
            gsap.utils.toArray<HTMLElement>(".js-feature-illustration").forEach((el, i) => {
              gsap.to(el, {
                yPercent: i % 2 === 0 ? -10 : -16,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1,
                },
              });
            });
          }
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="features-section" id="features">
      <div className="features-inner">
        {/* ── Heading ── */}
        <div className="features-heading js-features-header">
          <span className="features-label">How it works</span>
          <h2 className="features-title">
            Privacy that holds at{" "}
            <span className="features-title-accent">every step</span>
          </h2>
          <p className="features-subtitle">
            From funding to claim, no one sees what anyone earns — not other
            contributors, not the public chain.
          </p>
        </div>

        {/* ── Bento cards ── */}
        <div className="features-grid">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={
                "js-feature-card feature-card" +
                (i === 0 ? " feature-card--featured" : "")
              }
              style={
                {
                  "--card-bg": feature.bg,
                  "--card-accent": feature.accent,
                  "--card-accent-tint": feature.accentTint,
                } as React.CSSProperties
              }
            >
              {/* Number */}
              <span className="js-feature-number feature-card-number">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Illustration */}
              <div className="feature-card-illustration-wrap">
                <img
                  src={feature.illustration}
                  alt={feature.title}
                  className="js-feature-illustration feature-card-illustration"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="js-feature-content feature-card-content">
                <h3 className="feature-card-title">{feature.title}</h3>
                <p className="feature-card-body">{feature.body}</p>
              </div>

              {/* Featured card fills its extra height with an on-chain cipher cue. */}
              {i === 0 && (
                <div className="feature-card-cipher">
                  <p className="feature-card-cipher-label">Allocation · encrypted on-chain</p>
                  <div className="feature-card-cipher-row">
                    {["a9", "f3", "0c", "7d", "e1", "4b", "2f", "c8"].map((h) => (
                      <span key={h} className="feature-card-cipher-chip">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Closing CTA ── */}
        <div className="features-cta js-features-cta">
          <div>
            <p className="features-cta-title">Run your first private payroll</p>
            <p className="features-cta-sub">
              Set recipients, fund the pool, and share claim links. Amounts stay
              encrypted end-to-end.
            </p>
          </div>
          <Link
            to="/admin"
            className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-violet px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet/25 transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-hover"
          >
            Create a campaign
            <svg
              width="18"
              height="18"
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
        </div>
      </div>
    </section>
  );
}
