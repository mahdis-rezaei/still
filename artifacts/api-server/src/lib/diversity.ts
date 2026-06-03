// Engine V2 — diversity / rotation (deterministic, app-side; never touches the
// calibrated selection prompt). Given the candidate pool and the user's recent
// returns, decide which entry IDs the engine may choose among, so we avoid:
//   - re-surfacing the SAME page within ~6 months ("never twice in 6 months"), and
//   - repeating a THEME shown in the last ~90 days (the "no Grief Retrieval
//     Machine" rule) — a life is larger than its hardest chapter.
// It always relaxes before starving the engine: theme mute first, then entry
// exclusion, so a non-empty pool in → a non-empty pool out.

export interface RecentReturn {
  journalEntryId: string | null;
  theme: string | null;
  createdAt: Date;
}

export interface PoolEntry {
  id: string;
  theme: string | null;
}

const DAY = 86_400_000;
const REPEAT_PAGE_DAYS = 180; // don't re-surface the same page within 6 months
const REPEAT_THEME_DAYS = 90; // don't repeat a theme within 90 days

export function diversifiedPoolIds(
  pool: PoolEntry[],
  recent: RecentReturn[],
  now: Date = new Date(),
): string[] {
  const t = now.getTime();
  const excludedEntries = new Set(
    recent
      .filter((r) => r.journalEntryId && t - r.createdAt.getTime() <= REPEAT_PAGE_DAYS * DAY)
      .map((r) => r.journalEntryId as string),
  );
  const mutedThemes = new Set(
    recent
      .filter((r) => r.theme && t - r.createdAt.getTime() <= REPEAT_THEME_DAYS * DAY)
      .map((r) => r.theme as string),
  );

  const noRepeatPage = pool.filter((p) => !excludedEntries.has(p.id));
  const noRepeatThemeOrPage = noRepeatPage.filter(
    (p) => !p.theme || !mutedThemes.has(p.theme),
  );

  // Relax in order so diversity never empties the pool.
  if (noRepeatThemeOrPage.length > 0) return noRepeatThemeOrPage.map((p) => p.id);
  if (noRepeatPage.length > 0) return noRepeatPage.map((p) => p.id);
  return pool.map((p) => p.id);
}
