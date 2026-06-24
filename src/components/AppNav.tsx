import { Link } from "react-router-dom";
import { ConnectButton } from "@/components/ConnectButton";
import { Wordmark } from "@/components/Wordmark";

export function AppNav({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-edge/60 bg-bg/85 backdrop-blur-md">
      {/* Desktop Header */}
      <div className="mx-auto hidden max-w-6xl items-center justify-between px-4 py-3.5 sm:flex sm:px-6">
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

      {/* Mobile Header (two rows to prevent cramping) */}
      <div className="flex flex-col gap-2.5 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <Wordmark />
          <ConnectButton />
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel-2 p-1 border border-edge/40">
          <Link
            to="/admin"
            className={
              "flex items-center justify-center rounded-lg py-2 text-xs font-semibold transition-all duration-150 " +
              (pathname.startsWith("/admin")
                ? "bg-panel text-violet-deep shadow-xs"
                : "text-mute hover:text-ink")
            }
          >
            Create
          </Link>
          <Link
            to="/claim"
            className={
              "flex items-center justify-center rounded-lg py-2 text-xs font-semibold transition-all duration-150 " +
              (pathname.startsWith("/claim")
                ? "bg-panel text-violet-deep shadow-xs"
                : "text-mute hover:text-ink")
            }
          >
            Claim
          </Link>
        </div>
      </div>
    </header>
  );
}

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
