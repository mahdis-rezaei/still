import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useResendVerification } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

// The quiet top bar for the signed-in app: wordmark, a couple of calm links,
// and a discreet account / sign-out on the right. Plus a soft "confirm your
// email" banner while the account is unverified (never blocking).
export function AppNav() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const resend = useResendVerification();
  const [resent, setResent] = useState(false);

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

      {user && !user.emailVerified && (
        <div className="w-full bg-surface/70 border-b border-border/60 px-6 md:px-8 py-2.5 text-center">
          <span className="font-sans text-xs text-soft-ink">
            {resent ? (
              "Sent — check your inbox to confirm your email."
            ) : (
              <>
                Confirm your email to keep your pages safe.{" "}
                <button
                  onClick={handleResend}
                  className="text-accent-sepia hover:text-deep-brown underline underline-offset-2"
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
