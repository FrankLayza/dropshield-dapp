import { Link } from "react-router-dom";

export function Wordmark({ light }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-1.5 hover:opacity-80"
      style={{
        color: light ? "#fff" : "var(--color-ink)",
        transition:
          "color 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.15s ease",
      }}
    >
      <img
        src="/illustrations/enveil-logo-2.svg"
        alt="Enveil Logo"
        className="h-5 w-auto"
      />
      <span className="font-wordmark text-base lowercase tracking-wider sm:text-lg">
        enveil
      </span>
    </Link>
  );
}
