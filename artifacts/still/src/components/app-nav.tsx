import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useResendVerification } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

// Ways to revisit the archive — grouped under one calm "Explore" menu rather
// than crowding the top bar with a link each.
const EXPLORE_ITEMS = [
  { href: "/search", label: "Search" },
  { href: "/timeline", label: "Timeline" },
  { href: "/look-back", label: "Look back" },
  { href: "/calendar", label: "Calendar" },
  { href: "/shelf", label: "Shelf" },
  { href: "/collections", label: "Collections" },
  { href: "/capsules", label: "Capsules" },
];

// The quiet top bar for the signed-in app: wordmark, a couple of calm links,
// and a discreet account / sign-out on the right. Plus a soft "confirm your
// email" banner while the account is unverified (never blocking).
export function AppNav() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const resend = useResendVerification();
  const [resent, setResent] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  const isActive = (href: string) =>
    location === href || location.startsWith(href + "/");
  const exploreActive = EXPLORE_ITEMS.some((i) => isActive(i.href));

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
            {link("/today", "Today")}
            {link("/library", "Library")}

            {/* Explore — a calm dropdown of ways to revisit the archive. */}
            <div className="relative">
              <button
                onClick={() => setExploreOpen((v) => !v)}
                className={
                  "font-sans text-sm transition-colors flex items-center gap-1 " +
                  (exploreActive ? "text-ink" : "text-soft-ink hover:text-ink")
                }
                aria-haspopup="true"
                aria-expanded={exploreOpen}
                data-testid="nav-explore"
              >
                Explore
                <span className="text-[10px] leading-none mt-0.5">▾</span>
              </button>
              {exploreOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setExploreOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 z-50 min-w-[160px] rounded-xl border border-border bg-surface shadow-sm py-1.5">
                    {EXPLORE_ITEMS.map((i) => (
                      <Link
                        key={i.href}
                        href={i.href}
                        onClick={() => setExploreOpen(false)}
                        className={
                          "block px-4 py-2 font-sans text-sm transition-colors " +
                          (isActive(i.href)
                            ? "text-ink bg-background/60"
                            : "text-soft-ink hover:text-ink hover:bg-background/40")
                        }
                        data-testid={`nav-explore-${i.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {i.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

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
