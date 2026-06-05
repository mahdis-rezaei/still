import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useResendVerification } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

// Explore = your archive + keepsakes, shown as in-page sub-tabs (not a dropdown).
const EXPLORE_TABS = [
  { href: "/library", label: "Library" },
  { href: "/shelf", label: "Shelf" },
  { href: "/collections", label: "Collections" },
  { href: "/capsules", label: "Capsules" },
];
// Ways to view the Library — secondary, shown only while in the Library section.
const LIBRARY_VIEWS = [
  { href: "/library", label: "List" },
  { href: "/calendar", label: "Calendar" },
  { href: "/timeline", label: "Timeline" },
  { href: "/search", label: "Search" },
];

// The quiet top bar for the signed-in app. Three calm destinations by intent —
// Today (write), Look back (be visited by your past), Explore (your archive) —
// with account/settings on the right. A contextual second bar appears under
// Explore for its sub-tabs. Plus a soft "confirm your email" banner.
export function AppNav() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const resend = useResendVerification();
  const [resent, setResent] = useState(false);

  const isActive = (href: string) =>
    location === href || location.startsWith(href + "/");

  const inLibrary =
    isActive("/library") ||
    isActive("/calendar") ||
    isActive("/timeline") ||
    isActive("/search");
  const exploreActive =
    inLibrary ||
    isActive("/shelf") ||
    isActive("/collections") ||
    isActive("/capsules");
  // Returns lives under Look back (until the Look back home absorbs it).
  const lookBackActive = isActive("/look-back") || isActive("/returns");

  const navLink = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={
        "font-sans text-sm transition-colors " +
        (active ? "text-ink" : "text-soft-ink hover:text-ink")
      }
      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {label}
    </Link>
  );

  const subTab = (href: string, label: string, active: boolean) => (
    <Link
      key={href + label}
      href={href}
      className={
        "font-sans text-sm transition-colors " +
        (active ? "text-ink" : "text-soft-ink hover:text-ink")
      }
      data-testid={`subnav-${label.toLowerCase()}`}
    >
      {label}
    </Link>
  );

  async function handleResend() {
    try {
      await resend.mutateAsync();
    } finally {
      setResent(true);
    }
  }

  return (
    <>
      <nav className="w-full flex items-center justify-between px-6 md:px-8 py-5 border-b border-border/60">
        <div className="flex items-center gap-8">
          <Link
            href="/today"
            className="font-display text-xl text-deep-brown tracking-tight"
          >
            Yadegar
          </Link>
          <div className="flex items-center gap-5 md:gap-6">
            {navLink("/today", "Today", isActive("/today"))}
            {navLink("/look-back", "Look back", lookBackActive)}
            {navLink("/library", "Explore", exploreActive)}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {navLink("/settings", "Settings", isActive("/settings"))}
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

      {/* Explore sub-tabs — contextual second bar (in-page tabs, not a dropdown). */}
      {exploreActive && (
        <div className="w-full px-6 md:px-8 py-3 border-b border-border/40 bg-surface/30">
          <div className="flex items-center gap-5 md:gap-6">
            {EXPLORE_TABS.map((t) =>
              subTab(
                t.href,
                t.label,
                t.label === "Library" ? inLibrary : isActive(t.href),
              ),
            )}
          </div>
          {inLibrary && (
            <div className="flex items-center gap-4 mt-2">
              {LIBRARY_VIEWS.map((v) => (
                <Link
                  key={v.href + v.label}
                  href={v.href}
                  className={
                    "font-sans text-xs transition-colors " +
                    (isActive(v.href) ||
                    (v.label === "List" && isActive("/library"))
                      ? "text-soft-ink"
                      : "text-faint-ink hover:text-soft-ink")
                  }
                  data-testid={`subnav-view-${v.label.toLowerCase()}`}
                >
                  {v.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {user && !user.emailVerified && (
        <div className="w-full bg-[#F3EAD7] border-b border-accent-sepia/20 px-6 md:px-8 py-2.5 text-center">
          <span className="font-sans text-xs text-deep-brown/80">
            {resent ? (
              "Sent — check your inbox to confirm your email."
            ) : (
              <>
                Confirm your email to keep your pages safe.{" "}
                <button
                  onClick={handleResend}
                  className="text-accent-sepia hover:text-deep-brown underline underline-offset-2 font-medium"
                  data-testid="button-resend-verification"
                >
                  Resend link
                </button>
              </>
            )}
          </span>
        </div>
      )}
    </>
  );
}
