import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { exportData, useDeleteAccount } from "@workspace/api-client-react";
import { AppNav } from "@/components/app-nav";

export default function Privacy() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const deleteAccount = useDeleteAccount();

  const [exporting, setExporting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function doExport() {
    setExporting(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `still-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await deleteAccount.mutateAsync();
      queryClient.clear();
      setLocation("/login");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />
      <main className="flex-1 w-full max-w-[640px] mx-auto px-6 py-12 md:py-16">
        <Link
          href="/settings"
          className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
        >
          ← Settings
        </Link>

        <h1 className="font-display text-4xl md:text-5xl text-deep-brown mt-8 mb-6">
          Your pages belong to you.
        </h1>

        <div className="space-y-5 font-body text-lg text-soft-ink leading-relaxed">
          <p>
            Yadegar keeps your journals so you can write, return, and reflect across
            time. They are private to your account.
          </p>
          <p>
            To find what's worth returning to, Yadegar reads your words with an AI
            model — privately, only to choose a page to bring back. Your writing is
            never used to train it, never shown to anyone else, and never sold.
          </p>
          <p>
            You can take everything with you, or remove it entirely, whenever you
            like.
          </p>
        </div>

        {/* Prototype honesty */}
        <div className="mt-8 border border-border rounded-xl bg-surface/50 p-5">
          <p className="font-body text-soft-ink text-sm leading-relaxed">
            This is an early prototype. Please don't keep your most sensitive
            pages here yet — the full privacy architecture (including encryption
            at rest) isn't finished. Sample entries are perfect for now.
          </p>
        </div>

        <p className="mt-6 font-sans text-sm text-soft-ink">
          Read our{" "}
          <Link
            href="/privacy-policy"
            className="text-accent-sepia hover:text-deep-brown underline underline-offset-2"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/terms"
            className="text-accent-sepia hover:text-deep-brown underline underline-offset-2"
          >
            Terms
          </Link>
          .
        </p>

        <div className="mt-12 space-y-8">
          <div>
            <button
              onClick={doExport}
              disabled={exporting}
              className="rounded-full bg-deep-brown text-background px-6 py-2.5 font-sans text-sm hover:bg-ink disabled:opacity-50 transition-colors"
              data-testid="button-export"
            >
              {exporting ? "Preparing…" : "Export my data"}
            </button>
            <p className="font-sans text-xs text-faint-ink mt-2">
              Downloads everything you've written and been returned, as a JSON
              file.
            </p>
          </div>

          <div className="pt-8 border-t border-border/60">
            {confirm ? (
              <div className="space-y-3">
                <p className="font-body text-ink">
                  This permanently deletes your account and every page,
                  reflection, and returned memory. It cannot be undone.
                </p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={doDelete}
                    disabled={deleting}
                    className="rounded-full bg-red-700 text-background px-6 py-2.5 font-sans text-sm hover:bg-red-800 disabled:opacity-50 transition-colors"
                    data-testid="button-delete-confirm"
                  >
                    {deleting ? "Deleting…" : "Yes, delete everything"}
                  </button>
                  <button
                    onClick={() => setConfirm(false)}
                    className="font-sans text-sm text-soft-ink hover:text-ink"
                  >
                    Keep my account
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setConfirm(true)}
                  className="font-sans text-sm text-red-700 hover:underline"
                  data-testid="button-delete"
                >
                  Delete my account
                </button>
                <p className="font-sans text-xs text-faint-ink mt-2">
                  Removes everything, permanently.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
