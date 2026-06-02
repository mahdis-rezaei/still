import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

// The quiet top bar for the signed-in app: wordmark, a couple of calm links,
// and a discreet account / sign-out on the right.
export function AppNav() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    location === href || location.startsWith(href + "/");

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={
        "font-sans text-sm transition-colors " +
        (isActive(href) ? "text-ink" : "text-soft-ink hover:text-ink")
      }
      data-testid={`nav-${label.toLowerCase()}`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="w-full flex items-center justify-between px-6 md:px-8 py-5 border-b border-border/60">
      <div className="flex items-center gap-8">
        <Link
          href="/today"
          className="font-display text-xl text-deep-brown tracking-tight"
        >
          Still
        </Link>
        <div className="flex items-center gap-6">
          {link("/today", "Today")}
          {link("/library", "Library")}
          {link("/returns", "Returns")}
          {link("/settings", "Settings")}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline font-sans text-xs text-faint-ink">
          {user?.name || user?.email}
        </span>
        <button
          onClick={async () => {
            await logout();
            setLocation("/login");
          }}
          className="font-sans text-xs text-soft-ink hover:text-ink transition-colors"
          data-testid="button-signout"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
