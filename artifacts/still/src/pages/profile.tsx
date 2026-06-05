import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppNav } from "@/components/app-nav";
import { useAuth } from "@/lib/auth";
import { useUpdateProfile } from "@/lib/use-profile";

export default function Profile() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  // Seed the field once the user loads.
  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  const dirty = (user?.name ?? "") !== name.trim();

  async function save() {
    setSaved(false);
    await update.mutateAsync({ name: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />
      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        <Link
          href="/settings"
          className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
        >
          ← Settings
        </Link>

        <h1 className="font-display text-4xl text-deep-brown mt-6 mb-8">
          Your profile
        </h1>

        <div className="mb-8">
          <label
            htmlFor="display-name"
            className="block font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-2"
          >
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="What should we call you?"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-body text-lg text-ink placeholder:text-faint-ink focus:outline-none focus:border-accent-sepia transition-colors"
            data-testid="input-display-name"
          />
          <p className="font-body text-sm text-faint-ink mt-2">
            Shown in the top bar and on your pages. Leave it blank to use your
            email.
          </p>
        </div>

        <div className="mb-10">
          <p className="block font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-2">
            Email
          </p>
          <p className="font-body text-lg text-soft-ink">{user?.email}</p>
          <p className="font-body text-sm text-faint-ink mt-1">
            Your sign-in identity — it can't be changed here.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={!dirty || update.isPending}
            className="rounded-full bg-deep-brown text-background px-6 py-2.5 font-sans text-sm hover:bg-ink disabled:opacity-40 disabled:cursor-default transition-colors"
            data-testid="button-save-profile"
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="font-sans text-sm text-soft-ink">Saved ✓</span>
          )}
          {update.isError && (
            <span className="font-sans text-sm text-soft-ink">
              Couldn't save — try again.
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
