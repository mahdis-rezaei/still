import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { PageHeader } from "@/components/page";

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />
      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        <PageHeader title="Settings" />


        <section className="mb-10">
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-3">
            Account
          </p>
          <div className="border border-border rounded-xl bg-surface/60 p-5">
            {user?.name && (
              <p className="font-body text-lg text-ink">{user.name}</p>
            )}
            <p className="font-body text-soft-ink">{user?.email}</p>
          </div>
        </section>

        <section className="mb-10">
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-3">
            Nudges
          </p>
          <Link
            href="/settings/notifications"
            className="block border border-border rounded-xl bg-surface/60 p-5 hover:border-accent-sepia transition-colors"
          >
            <p className="font-body text-lg text-ink">Reminders</p>
            <p className="font-body text-soft-ink text-sm mt-1">
              A gentle nudge to write, or a page brought back — your cadence, off
              by default.
            </p>
          </Link>
        </section>

        <section className="mb-10">
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-3">
            What returns
          </p>
          <Link
            href="/settings/resurfacing"
            className="block border border-border rounded-xl bg-surface/60 p-5 hover:border-accent-sepia transition-colors"
          >
            <p className="font-body text-lg text-ink">Muted periods</p>
            <p className="font-body text-soft-ink text-sm mt-1">
              Fence off a season you'd rather not have return — without deleting
              a thing.
            </p>
          </Link>
        </section>

        <section className="mb-10">
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-3">
            Your data
          </p>
          <Link
            href="/settings/privacy"
            className="block border border-border rounded-xl bg-surface/60 p-5 hover:border-accent-sepia transition-colors"
          >
            <p className="font-body text-lg text-ink">Privacy &amp; your pages</p>
            <p className="font-body text-soft-ink text-sm mt-1">
              Export everything, or delete your account — anytime.
            </p>
          </Link>
          <p className="font-body text-sm text-faint-ink mt-3 leading-relaxed">
            Your pages are private. Yadegar never shares your journals — they're
            encrypted at rest, and yours to export or delete whenever you like.
          </p>
        </section>

        <button
          onClick={async () => {
            await logout();
            setLocation("/login");
          }}
          className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
          data-testid="button-signout"
        >
          Sign out
        </button>
      </main>
    </div>
  );
}
