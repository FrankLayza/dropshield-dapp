import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { ReactLenis, useLenis } from "lenis/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Landing } from "@/pages/Landing";
import { Dashboard } from "@/pages/Dashboard";
import { CampaignWizard } from "@/pages/CampaignWizard";
import { CampaignDetail } from "@/pages/CampaignDetail";
import { Claim } from "@/pages/Claim";
import { ConnectButton } from "@/components/ConnectButton";
import { Shield } from "@/components/Shield";

export function App() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  return (
    <ReactLenis root options={{ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 }}>
      <div className="min-h-full bg-bg text-ink noise-overlay mesh-gradient-bg">
        <SpeedInsights />

        {isLanding ? <MarketingNav /> : <AppNav pathname={pathname} />}

        <main className={isLanding ? "" : "mx-auto max-w-6xl px-4 pb-16 pt-3 sm:px-6"}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/new" element={<CampaignWizard />} />
            <Route path="/admin/c/:address" element={<CampaignDetail />} />
            <Route path="/claim" element={<Claim />} />
            <Route path="/claim/:address" element={<Claim />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </main>
      </div>
    </ReactLenis>
  );
}

/* ── Brand wordmark (shared by both navs) ─────────────────────────────────── */
function Wordmark({ light }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 transition-opacity duration-150 hover:opacity-80"
    >
      <Shield size={20} />
      <span
        className="font-wordmark text-base lowercase tracking-wider sm:text-lg"
        style={{ color: light ? "#fff" : "var(--color-ink)" }}
      >
        enveil
      </span>
    </Link>
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

  useLenis(({ scroll }: { scroll: number }) => setScrolled(scroll > 80));

  const goTo = (id: string) => {
    setMenuOpen(false);
    lenis?.scrollTo(`#${id}`, { offset: -72 });
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        transition: "background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease",
        borderBottom: scrolled ? "1px solid var(--color-edge)" : "1px solid transparent",
        background: scrolled ? "rgba(226,226,223,0.75)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Wordmark light={!scrolled} />

        {/* Center anchor links (desktop) */}
        <nav className="hidden items-center gap-8 md:flex">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className="link-rise py-1 text-sm font-medium transition-colors duration-150"
              style={{ color: scrolled ? "var(--color-mute)" : "rgba(255,255,255,0.78)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = scrolled ? "var(--color-ink)" : "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = scrolled ? "var(--color-mute)" : "rgba(255,255,255,0.78)")}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Right action (desktop) */}
        <div className="hidden items-center md:flex">
          <Link
            to="/admin"
            className="group inline-flex items-center gap-2 rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet/25 transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-hover"
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
              className="transition-transform duration-150 group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        {/* Mobile: Open App + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            to="/admin"
            className="inline-flex items-center rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet/25"
          >
            Open App
          </Link>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div className="border-t border-edge/60 bg-bg/95 backdrop-blur-md md:hidden">
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

/* ── App nav (create / claim / dashboard) ──────────────────────────────────
   Minimal app shell: wordmark left, wallet right. Always opaque, no marketing
   links — the chrome stays out of the way of the product. */
function AppNav({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-edge/60 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-4 sm:gap-5">
          <NavLink to="/admin" active={pathname.startsWith("/admin")}>
            Create
          </NavLink>
          <NavLink to="/claim" active={pathname.startsWith("/claim")}>
            Claim
          </NavLink>
          <span className="hidden h-5 w-px bg-edge sm:block" aria-hidden />
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}

/** App-nav text link — slant-underline hover; active route keeps it drawn
    (see `.link-rise[aria-current]` in index.css). */
function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={
        "link-rise py-1 text-sm font-medium transition-colors duration-150 " +
        (active ? "text-violet-deep" : "text-mute hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}
