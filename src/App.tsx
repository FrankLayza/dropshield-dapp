import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useLocation } from "react-router-dom";
import { ReactLenis, useLenis } from "lenis/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Landing } from "@/pages/Landing";
import { Wordmark } from "@/components/Wordmark";

/* *
 * Everything web3 (wagmi/RainbowKit/MetaMask/WalletConnect + Zama FHE) is
 * isolated in AppSection and loaded lazily, so the marketing landing `/` ships
 * none of it. See plans/reflective-purring-cray.md. */
const AppSection = lazy(() => import("@/AppSection"));

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function App() {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const isApp =
    pathname.startsWith("/admin") || pathname.startsWith("/claim");

  const content = (
    <div className="min-h-full bg-bg text-ink noise-overlay mesh-gradient-bg">
      <SpeedInsights />

      {isApp ? (
        <Suspense fallback={<AppLoading />}>
          <AppSection />
        </Suspense>
      ) : (
        <>
          <MarketingNav />
          <main>
            <Landing />
          </main>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return content;
  }

  return (
    <ReactLenis
      root
      options={{ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 }}
    >
      {content}
    </ReactLenis>
  );
}

function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span
        className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-edge border-t-violet"
        aria-label="Loading"
      />
    </div>
  );
}

/* ── Marketing nav (landing only) ──────────────────────────────────────────
   Wordmark left · anchor links center · "Open App" pill right. No wallet.
   Transparent at the top, frosts to glass once the hero is scrolled past.
   Anchor links smooth-scroll via Lenis (bare #hash won't animate under Lenis). */
const SECTIONS = [
  { id: "how-it-works", label: "How it works" },
  { id: "use-cases", label: "Use cases" },
  { id: "security", label: "Security" },
];

function MarketingNav() {
  const lenis = useLenis();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 80;
      setScrolled(isScrolled);
      if (isScrolled) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goTo = (id: string) => {
    setMenuOpen(false);
    const offset = id === "how-it-works" ? 0 : -72;
    if (lenis) {
      lenis.scrollTo(`#${id}`, { offset });
    } else {
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 pointer-events-none flex justify-center">
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: scrolled ? "1.25rem" : "0",
          width: scrolled ? "300px" : "100%",
          maxWidth: scrolled ? "300px" : "72rem",
          borderRadius: scrolled ? "9999px" : "0px",
          padding: scrolled ? "0.45rem 0.5rem 0.45rem 1.25rem" : "1.25rem 1.5rem",
          background: scrolled ? "rgba(255, 255, 255, 0.72)" : "transparent",
          border: scrolled ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
          boxShadow: scrolled ? "0 12px 30px -10px rgba(0, 0, 0, 0.12), 0 4px 12px -5px rgba(0, 0, 0, 0.05)" : "none",
          transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: "auto",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <Wordmark light={!scrolled} />
        </div>

        <nav
          className="hidden md:flex items-center justify-center overflow-hidden"
          style={{
            flex: scrolled ? 0 : 1,
            opacity: scrolled ? 0 : 1,
            width: scrolled ? "0" : "auto",
            transform: scrolled ? "scale(0.95)" : "scale(1)",
            visibility: scrolled ? "hidden" : "visible",
            transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
            gap: "2rem",
          }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className="link-rise py-1 text-sm font-medium transition-colors duration-150 whitespace-nowrap"
              style={{ color: scrolled ? "var(--color-mute)" : "rgba(255, 255, 255, 0.78)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = scrolled ? "var(--color-ink)" : "#fff")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = scrolled ? "var(--color-mute)" : "rgba(255, 255, 255, 0.78)")
              }
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          <Link
            to="/admin"
            className="group inline-flex items-center gap-2 rounded-full bg-violet font-semibold text-white hover:-translate-y-0.5 hover:bg-violet-hover whitespace-nowrap"
            style={{
              padding: scrolled ? "0.45rem 1.1rem" : "0.6rem 1.25rem",
              fontSize: scrolled ? "0.825rem" : "0.875rem",
              boxShadow: scrolled ? "0 4px 12px rgba(124,58,237,0.2)" : "0 8px 20px rgba(124,58,237,0.25)",
              transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            Open App
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width: scrolled ? "14px" : "16px",
                height: scrolled ? "14px" : "16px",
                transition: "width 0.5s, height 0.5s, transform 0.15s",
              }}
              className="group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>

          <div
            className="flex items-center md:hidden"
            style={{
              overflow: "hidden",
              width: scrolled ? "0" : "auto",
              opacity: scrolled ? 0 : 1,
              transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div className="ml-2">
              <button
                type="button"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm"
                style={{
                  borderColor: scrolled ? "var(--color-edge)" : "rgba(255,255,255,0.3)",
                  background: scrolled ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.12)",
                  color: scrolled ? "var(--color-ink)" : "#fff",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  {menuOpen ? (
                    <path d="M6 6l12 12M18 6L6 18" />
                  ) : (
                    <path d="M3 6h18M3 12h18M3 18h18" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {!scrolled && menuOpen && (
        <div
          className="border-t border-edge/60 bg-bg/95 backdrop-blur-md md:hidden animate-step-in"
          style={{
            position: "absolute",
            top: "4.5rem",
            left: 0,
            right: 0,
            pointerEvents: "auto",
          }}
        >
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(s.id)}
                className="py-3 text-left text-sm font-medium text-mute transition-colors hover:text-ink"
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

