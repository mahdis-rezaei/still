import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

// One date-based memory: a past page from the same calendar day in a prior year.
// Shape mirrors GET /memories/on-this-day. Hand-written (rather than codegen'd)
// because this returns a view-model rather than a stored entity; once
// `pnpm --filter @workspace/api-spec run codegen` is run, the generated
// `useGetOnThisDay` hook can replace this.
export interface OnThisDayMemory {
  entryId: string;
  title: string | null;
  excerpt: string;
  entryDate: string;
  favorite: boolean;
  yearsAgo: number;
  onThisExactDay: boolean;
}

function localTodayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function useOnThisDay() {
  const date = localTodayISO();
  return useQuery({
    queryKey: ["on-this-day", date],
    queryFn: () =>
      customFetch<OnThisDayMemory[]>(
        `/api/memories/on-this-day?date=${date}`,
        { responseType: "json" },
      ),
    // The calendar day only changes daily; don't refetch on every focus.
    staleTime: 60 * 60 * 1000,
  });
}
