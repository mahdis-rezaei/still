import { useCallback, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getContinuity,
  listAllEntries,
  setFavorite,
  bulkDeleteEntries,
  clearSampleEntries,
  sourceKind,
  SOURCE_LABELS,
  type Continuity,
  type LibraryEntry,
  type SourceKind,
} from "../../lib/library";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

function firstLines(body: string, max = 2): string {
  return body
    .trim()
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, max)
    .join(" ");
}

// A native dropdown for an inline filter token: the iOS action sheet (the native
// equivalent of a <select>), with an Alert fallback off-iOS.
function chooseOption(
  title: string,
  options: { label: string; value: string }[],
  onSelect: (value: string) => void,
) {
  const labels = options.map((o) => o.label);
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [...labels, "Cancel"], cancelButtonIndex: labels.length },
      (i) => {
        if (i != null && i < options.length) onSelect(options[i].value);
      },
    );
  } else {
    Alert.alert(title, undefined, [
      ...options.map((o) => ({ text: o.label, onPress: () => onSelect(o.value) })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }
}

// One underlined inline "select" token, like the web filter line.
function FilterToken({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="border-b border-border">
      <Text className="text-ink" style={{ fontSize: 13 }}>
        {label} ⌄
      </Text>
    </Pressable>
  );
}

function ContinuityCard({ c }: { c: Continuity | null }) {
  if (!c || c.pageCount === 0) return null;
  const stats: string[] = [plural(c.pageCount, "page")];
  if (c.spanYears && c.spanYears >= 1) stats.push(`spanning ${plural(c.spanYears, "year")}`);
  if (c.oldestPageAgeYears && c.oldestPageAgeYears >= 1)
    stats.push(`your oldest page is ${plural(c.oldestPageAgeYears, "year")} old`);
  if (c.reflectionCount >= 1) stats.push(plural(c.reflectionCount, "reflection"));

  return (
    <View className="mt-6 rounded-2xl border border-border bg-surface px-5 py-4">
      {c.writingSinceYear ? (
        <Text className="text-lg text-deep-brown">
          You've been writing here since {c.writingSinceYear}.
        </Text>
      ) : null}
      <Text className="text-soft-ink text-sm mt-1 leading-relaxed">
        {stats.join(" · ")}
      </Text>
      {c.oldestImportedAgeYears && c.oldestImportedAgeYears >= 1 ? (
        <Text className="text-accent-sepia text-sm mt-3">
          Your first imported journal is now {plural(c.oldestImportedAgeYears, "year")} old.
        </Text>
      ) : null}
    </View>
  );
}

// The Library, matching the web: continuity stats, List/Calendar/Timeline views,
// search + favorites, year/month/source filters, year-grouped pages, and a Select
// mode for bulk delete. Used by the Explore tab and the standalone /library route.
export default function LibraryView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [cont, setCont] = useState<Continuity | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "timeline">("list");
  const [query, setQuery] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | SourceKind>("all");

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [rows, c] = await Promise.all([
        listAllEntries(),
        getContinuity().catch(() => null),
      ]);
      setEntries(rows);
      setCont(c);
    } catch {
      setError("Could not load your library. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const y = e.entryDate?.slice(0, 4);
      if (y) set.add(y);
    }
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [entries]);

  const sourceKinds = useMemo(() => {
    const set = new Set<SourceKind>();
    for (const e of entries) set.add(sourceKind(e.source));
    return set;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (favOnly && !e.favorite) return false;
      if (yearFilter !== "all" && e.entryDate?.slice(0, 4) !== yearFilter) return false;
      if (monthFilter !== "all" && e.entryDate?.slice(5, 7) !== monthFilter) return false;
      if (sourceFilter !== "all" && sourceKind(e.source) !== sourceFilter) return false;
      if (!q) return true;
      return (
        e.body.toLowerCase().includes(q) ||
        (e.entryDate ?? "").toLowerCase().includes(q) ||
        (e.title ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, query, favOnly, yearFilter, monthFilter, sourceFilter]);

  const yearGroups = useMemo(() => {
    const map = new Map<string, LibraryEntry[]>();
    for (const e of filtered) {
      const year = e.entryDate?.slice(0, 4) || "Undated";
      const arr = map.get(year);
      if (arr) arr.push(e);
      else map.set(year, [e]);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "Undated") return 1;
      if (b[0] === "Undated") return -1;
      return a[0] < b[0] ? 1 : -1;
    });
  }, [filtered]);

  const filtersActive =
    yearFilter !== "all" || monthFilter !== "all" || sourceFilter !== "all";

  // Inline-dropdown options + current labels (mirrors the web's filter sentence).
  const sourceOptions = useMemo(() => {
    const opts = [{ label: "all pages", value: "all" }];
    if (sourceKinds.has("written")) opts.push({ label: "written here", value: "written" });
    if (sourceKinds.has("imported")) opts.push({ label: "imported", value: "imported" });
    if (sourceKinds.has("sample")) opts.push({ label: "samples", value: "sample" });
    return opts;
  }, [sourceKinds]);
  const yearOptions = useMemo(
    () => [
      { label: "any year", value: "all" },
      ...years.map((y) => ({ label: y, value: y })),
    ],
    [years],
  );
  const monthOptions = useMemo(
    () => [
      { label: "any month", value: "all" },
      ...MONTHS.map((m, i) => ({ label: m, value: String(i + 1).padStart(2, "0") })),
    ],
    [],
  );
  const sourceLabel =
    sourceOptions.find((o) => o.value === sourceFilter)?.label ?? "all pages";
  const yearLabel = yearFilter === "all" ? "any year" : yearFilter;
  const monthLabel = monthFilter === "all" ? "any month" : MONTHS[Number(monthFilter) - 1];

  async function toggleFavorite(e: LibraryEntry) {
    const next = !e.favorite;
    setEntries((list) => list.map((x) => (x.id === e.id ? { ...x, favorite: next } : x)));
    try {
      await setFavorite(e.id, next);
    } catch {
      setEntries((list) => list.map((x) => (x.id === e.id ? { ...x, favorite: e.favorite } : x)));
    }
  }

  const filteredIds = filtered.map((e) => e.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  function exitSelect() {
    setSelecting(false);
    setSelected(new Set());
    setConfirmDelete(false);
  }
  function toggleSelect(id: string) {
    setConfirmDelete(false);
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  async function deleteSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    const ids = [...selected];
    try {
      await bulkDeleteEntries(ids);
      setEntries((list) => list.filter((e) => !selected.has(e.id)));
      exitSelect();
    } catch {
      // leave as-is
    } finally {
      setBusy(false);
    }
  }

  const hasSamples = entries.some((e) => e.source === "sample");
  async function removeSamples() {
    setBusy(true);
    try {
      await clearSampleEntries();
      setEntries((list) => list.filter((e) => e.source !== "sample"));
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  function renderRow(entry: LibraryEntry) {
    return (
      <View key={entry.id} className="flex-row items-start gap-3 py-4 border-b border-border/70">
        {selecting ? (
          <Pressable onPress={() => toggleSelect(entry.id)} hitSlop={6} className="mt-1">
            <Text className={selected.has(entry.id) ? "text-accent-sepia text-lg" : "text-faint-ink text-lg"}>
              {selected.has(entry.id) ? "☑" : "☐"}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => void toggleFavorite(entry)} hitSlop={6} className="mt-0.5">
            <Text className={entry.favorite ? "text-accent-sepia text-lg" : "text-faint-ink text-lg"}>
              {entry.favorite ? "★" : "☆"}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() =>
            selecting
              ? toggleSelect(entry.id)
              : router.push({ pathname: "/(app)/entries/[id]", params: { id: entry.id } })
          }
          className="flex-1"
        >
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="text-xs text-faint-ink">{entry.entryDate ?? "Undated"}</Text>
            {SOURCE_LABELS[entry.source] ? (
              <Text className="text-[10px] uppercase tracking-wider text-faint-ink">
                {SOURCE_LABELS[entry.source]}
              </Text>
            ) : null}
          </View>
          <Text className="text-base text-soft-ink leading-snug mt-0.5" numberOfLines={1}>
            {entry.title || firstLines(entry.body)}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load({ refresh: true })} />
      }
      contentContainerStyle={{
        paddingTop: 16,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-4xl text-deep-brown">Library</Text>
          <Text className="text-soft-ink mt-1">
            {entries.length > 0
              ? `${plural(entries.length, "page")} kept`
              : "Every page you write or bring in lives here."}
          </Text>
        </View>
        <View className="items-end gap-2 mt-2">
          {entries.length > 0 ? (
            <Pressable onPress={() => (selecting ? exitSelect() : setSelecting(true))} hitSlop={8}>
              <Text className="text-soft-ink" style={{ fontSize: 13 }}>
                {selecting ? "Done" : "Select"}
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push("/(app)/import")} hitSlop={8}>
            <Text className="text-accent-sepia" style={{ fontSize: 13 }}>
              Bring old journals →
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="min-h-80 items-center justify-center">
          <ActivityIndicator color="#3A2F25" />
        </View>
      ) : error ? (
        <View className="mt-10 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-ink">{error}</Text>
          <Pressable onPress={() => void load()} className="mt-4">
            <Text className="text-deep-brown">Try again</Text>
          </Pressable>
        </View>
      ) : entries.length === 0 ? (
        <View className="mt-10 rounded-3xl border border-border bg-surface p-6">
          <Text className="text-lg text-ink">Your pages will live here.</Text>
          <Text className="mt-2 text-soft-ink leading-relaxed">
            Write today or bring old journals into Yadegar.
          </Text>
          <View className="flex-row gap-3 mt-5">
            <Pressable onPress={() => router.push("/(app)/today")} className="rounded-full bg-deep-brown px-5 py-2.5">
              <Text className="text-background" style={{ fontSize: 13 }}>Write today</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(app)/import")} className="rounded-full border border-border bg-surface px-5 py-2.5">
              <Text className="text-ink" style={{ fontSize: 13 }}>Bring old journals</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <ContinuityCard c={cont} />

          {/* View tabs. */}
          <View className="mt-6 flex-row gap-5">
            <Pressable onPress={() => setView("list")}>
              <Text className={view === "list" ? "text-ink" : "text-soft-ink"} style={{ fontSize: 14 }}>List</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(app)/calendar")}>
              <Text className="text-soft-ink" style={{ fontSize: 14 }}>Calendar</Text>
            </Pressable>
            <Pressable onPress={() => setView("timeline")}>
              <Text className={view === "timeline" ? "text-ink" : "text-soft-ink"} style={{ fontSize: 14 }}>Timeline</Text>
            </Pressable>
          </View>

          {hasSamples ? (
            <View className="mt-5 flex-row items-center justify-between gap-3 rounded-xl border border-accent-sepia/30 bg-surface px-4 py-3">
              <Text className="text-deep-brown text-sm flex-1 leading-relaxed">
                These are sample pages, here to show you how Yadegar feels.
              </Text>
              <Pressable onPress={() => void removeSamples()} disabled={busy} hitSlop={6}>
                <Text className="text-accent-sepia" style={{ fontSize: 13 }}>Remove them</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Search + favorites. */}
          <View className="mt-6 flex-row gap-2">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by word or date…"
              placeholderTextColor="#A59B8D"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-ink"
              style={{ fontSize: 14 }}
            />
            <Pressable
              onPress={() => setFavOnly((v) => !v)}
              className={
                "rounded-lg border px-3 py-2.5 " +
                (favOnly ? "border-accent-sepia bg-surface" : "border-border bg-surface")
              }
            >
              <Text className={favOnly ? "text-ink" : "text-soft-ink"} style={{ fontSize: 13 }}>
                ★ Favorites
              </Text>
            </Pressable>
          </View>

          {/* Filters. */}
          <View className="mt-5 flex-row flex-wrap items-center gap-x-2 gap-y-2">
            <Text className="text-faint-ink" style={{ fontSize: 13 }}>Showing</Text>
            <FilterToken
              label={sourceLabel}
              onPress={() =>
                chooseOption("Show", sourceOptions, (v) =>
                  setSourceFilter(v as "all" | SourceKind),
                )
              }
            />
            <Text className="text-faint-ink" style={{ fontSize: 13 }}>from</Text>
            <FilterToken
              label={yearLabel}
              onPress={() => chooseOption("Year", yearOptions, setYearFilter)}
            />
            <FilterToken
              label={monthLabel}
              onPress={() => chooseOption("Month", monthOptions, setMonthFilter)}
            />
            {filtersActive ? (
              <Pressable
                onPress={() => {
                  setYearFilter("all");
                  setMonthFilter("all");
                  setSourceFilter("all");
                }}
                hitSlop={6}
              >
                <Text className="text-faint-ink" style={{ fontSize: 13 }}>clear</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Select-mode action bar. */}
          {selecting ? (
            <View className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 gap-2">
              <View className="flex-row items-center gap-4">
                <Pressable onPress={() => setSelected(allSelected ? new Set() : new Set(filteredIds))}>
                  <Text className="text-ink" style={{ fontSize: 13 }}>
                    {allSelected ? "Clear all" : "Select all"}
                  </Text>
                </Pressable>
                <Text className="text-faint-ink" style={{ fontSize: 13 }}>{selected.size} selected</Text>
              </View>
              {confirmDelete ? (
                <View className="flex-row items-center gap-4">
                  <Text className="text-soft-ink flex-1" style={{ fontSize: 13 }}>
                    Delete {selected.size} {selected.size === 1 ? "page" : "pages"}? This can't be undone.
                  </Text>
                  <Pressable onPress={() => void deleteSelected()} disabled={busy}>
                    <Text style={{ color: "#B4453A", fontSize: 13 }}>{busy ? "Deleting…" : "Yes, delete"}</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmDelete(false)}>
                    <Text className="text-soft-ink" style={{ fontSize: 13 }}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmDelete(true)} disabled={selected.size === 0} className="self-start">
                  <Text style={{ color: selected.size ? "#B4453A" : "#A59B8D", fontSize: 13 }}>
                    Delete {selected.size > 0 ? `${selected.size} ` : ""}
                    {selected.size === 1 ? "page" : "pages"}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {filtered.length === 0 ? (
            <Text className="text-soft-ink leading-relaxed mt-8">
              {query.trim()
                ? `No pages match “${query.trim()}”.`
                : "No pages here yet — try widening the filters."}
            </Text>
          ) : view === "timeline" ? (
            <View className="mt-6">{filtered.map((e) => renderRow(e))}</View>
          ) : (
            yearGroups.map(([year, items]) => (
              <View key={year} className="mt-8">
                <View className="flex-row items-center gap-4 mb-1">
                  <Text className="text-xs uppercase tracking-widest text-faint-ink">{year}</Text>
                  <View className="flex-1 h-px bg-border/60" />
                </View>
                {items.map((e) => renderRow(e))}
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}
