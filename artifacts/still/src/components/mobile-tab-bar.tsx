import { Link, useLocation } from "wouter";
import { PenLine, Clock, BookOpen, Settings as SettingsIcon } from "lucide-react";
import { haptic } from "@/lib/native";

// The native-feeling bottom navigation, shown only on small screens (phones) and
// inside the native shell. Desktop keeps the existing top bar. Mirrors the three
// calm destinations + settings.
const TABS: {
  href: string;
  label: string;
  icon: typeof PenLine;
  match: (l: string) => boolean;
}[] = [
  { href: "/today", label: "Today", icon: PenLine, match: (l) => l === "/today" },
  {
    href: "/look-back",
    label: "Look back",
    icon: Clock,
    match: (l) => l.startsWith("/look-back") || l.startsWith("/returns"),
  },
  {
    href: "/library",
    label: "Explore",
    icon: BookOpen,
    match: (l) =>
      ["/library", "/shelf", "/collections", "/capsules", "/calendar", "/timeline"].some(
        (p) => l === p || l.startsWith(p + "/"),
      ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    match: (l) => l.startsWith("/settings") || l === "/help",
  },
];

export function MobileTabBar() {
  const [location] = useLocation();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex">
        {TABS.map((t) => {
          const active = t.match(location);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => void haptic("light")}
              className={
                "flex-1 flex flex-col items-center gap-0.5 py-2 font-sans text-[10px] transition-colors " +
                (active ? "text-ink" : "text-faint-ink hover:text-soft-ink")
              }
              data-testid={`tabbar-${t.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.6} aria-hidden="true" />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
