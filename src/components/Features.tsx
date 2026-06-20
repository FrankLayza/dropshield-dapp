import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ── Feature data ─────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    title: "Salary privacy, on-chain",
    body: "Contributors can't see each other's pay. Every amount is an FHE ciphertext on-chain — unreadable to everyone.",
    illustration: "/illustrations/salary-privacy.png",
    illustrationScale: 1,
    bg: "#DFD1F4",
    accent: "var(--color-violet)",
    accentTint: "var(--color-violet-tint)",
  },
  {
    title: "Verify before you claim",
    body: "Each recipient decrypts their own allocation and confirms it before signing the claim. No trust required; the math is the proof.",
    illustration: "/illustrations/verify-before-claim.png",
    illustrationScale: 1.5,
    bg: "#DFC9C0",
    accent: "var(--color-gold)",
    accentTint: "var(--color-gold-tint)",
  },
  {
    title: "No roster on-chain",
    body: "Only contributors who choose to claim reveal themselves. Your full payroll list never touches the blockchain.",
    illustration: "/illustrations/no-roster.png",
    illustrationScale: 1.15,
    bg: "#DFF3F6",
    accent: "#0891b2",
    accentTint: "#e0f7fa",
  },
];

/* ── Features Section ─────────────────────────────────────────────────────── */
export function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 768px)",
          isMobile: "(max-width: 767px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { reduceMotion, isDesktop } = context.conditions!;
          if (reduceMotion) return;

          /* ── Card stagger entrance ── */
          const grid = sectionRef.current?.querySelector(".features-grid");
          const cards = gsap.utils.toArray<HTMLElement>(".js-feature-card");

          if (grid) {
            const gridTl = gsap.timeline({
              scrollTrigger: {
                trigger: grid,
                start: "top 82%",
                end: "bottom 20%",
                toggleActions: "play none none none",
              },
            });

            cards.forEach((card, i) => {
              const illustration = card.querySelector<HTMLElement>(".js-feature-illustration");
              const content = card.querySelector<HTMLElement>(".js-feature-content");
              const number = card.querySelector<HTMLElement>(".js-feature-number");

              // The base stagger delay for each card
              const cardDelay = i * 0.2;

              /* Card body slides up and fades in */
              gridTl.from(
                card,
                {
                  y: isDesktop ? 60 : 40,
                  autoAlpha: 0,
                  duration: 0.9,
                  ease: "power3.out",
                },
                cardDelay // starts at 0, 0.2, 0.4...
              );



            /* Number counter feel */
            if (number) {
              gridTl.from(
                number,
                {
                  y: 12,
                  autoAlpha: 0,
                  duration: 0.5,
                  ease: "power2.out",
                },
                cardDelay + 0.4
              );
            }

            /* Content stagger */
            if (content) {
              const contentChildren = content.children;
              gridTl.from(
                contentChildren,
                {
                  y: 18,
                  autoAlpha: 0,
                  duration: 0.6,
                  stagger: 0.1,
                  ease: "power2.out",
                },
                cardDelay + 0.4
              );
            }

            /* Illustration floats up separately with a slight scale pop */
            if (illustration) {
              gridTl.from(
                illustration,
                {
                  y: 30,
                  autoAlpha: 0,
                  scale: 0.92,
                  duration: 0.85,
                  ease: "back.out(1.4)",
                },
                cardDelay + 0.35
              );

              /* Gentle continuous float for illustrations */
              gsap.to(illustration, {
                y: "-=10",
                duration: 3.5 + i * 0.4,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
                delay: cardDelay + 1, // start floating after enter animation
              });
            }
            });
          }

          /* ── Parallax drift on scroll for each card (desktop only) ── */
          if (isDesktop) {
            cards.forEach((card, i) => {
              gsap.to(card, {
                y: (i % 2 === 0 ? -20 : -30),
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.2,
                },
              });
            });
          }
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="features-section" id="features">


      {/* ── Cards grid ── */}
      <div className="features-grid">
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className="js-feature-card feature-card"
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

            {/* Illustration area */}
            <div className="feature-card-illustration-wrap">
              {feature.illustration ? (
                <img
                  src={feature.illustration}
                  alt={feature.title}
                  className="js-feature-illustration feature-card-illustration"
                  style={{ transform: `scale(${feature.illustrationScale})` }}
                  loading="lazy"
                />
              ) : (
                <div className="js-feature-illustration feature-card-illustration-placeholder">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--card-accent)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.35 }}
                  >
                    {i === 1 ? (
                      /* Verify / shield-check icon */
                      <>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M9 12l2 2 4-4" />
                      </>
                    ) : (
                      /* Hidden / eye-off icon */
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    )}
                  </svg>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="js-feature-content feature-card-content">
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-body">{feature.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
