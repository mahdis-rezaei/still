import { api, getToken, API_ORIGIN } from "./api";

// Settings: notification cadence, memory sensitivity, profile name, data export,
// and account deletion — all on existing backend endpoints.

export type NudgeFreq = "off" | "weekly" | "monthly";
export type MemorySensitivity = "open" | "gentle" | "protected";

export interface NotificationPrefs {
  writingFrequency: NudgeFreq;
  memoryFrequency: NudgeFreq;
}

export const getNotifications = () => api<NotificationPrefs>("/notifications");

export const updateNotifications = (patch: Partial<NotificationPrefs>) =>
  api<NotificationPrefs>("/notifications", { method: "PATCH", body: patch });

export const getPreferences = () =>
  api<{ memorySensitivity: MemorySensitivity }>("/preferences");

export const updatePreferences = (memorySensitivity: MemorySensitivity) =>
  api<{ memorySensitivity: MemorySensitivity }>("/preferences", {
    method: "PATCH",
    body: { memorySensitivity },
  });

// Muted periods (/resurface-mutes): a date range whose pages never resurface —
// the "don't bring back this season" control for a grief window or a hard year.
export interface ResurfaceMute {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: string;
}

export const listMutes = () => api<ResurfaceMute[]>("/resurface-mutes");

export const addMute = (startDate: string, endDate: string) =>
  api<ResurfaceMute>("/resurface-mutes", {
    method: "POST",
    body: { startDate, endDate },
  });

export const deleteMute = (id: string) =>
  api(`/resurface-mutes/${id}`, { method: "DELETE" });

// Per-page resurfacing preference (PATCH /entries/:id). "never" keeps a single
// page from ever returning unbidden; "more_often" invites it back more.
export type ResurfacingPreference = "normal" | "more_often" | "never";

export const updateEntryResurfacing = (
  entryId: string,
  resurfacingPreference: ResurfacingPreference,
) =>
  api(`/entries/${entryId}`, {
    method: "PATCH",
    body: { resurfacingPreference },
  });

// PATCH /auth/me — edit the display name.
export const updateProfileName = (name: string) =>
  api("/auth/me", { method: "PATCH", body: { name } });

// DELETE /privacy/account — permanent; cascades to all the user's data.
export const deleteAccount = () =>
  api("/privacy/account", { method: "DELETE" });

// GET /privacy/export/text — the readable, portable export. Not JSON, so we fetch
// it as raw text (the shared api() helper JSON-parses) and let the caller share it.
export async function exportText(): Promise<string> {
  const token = await getToken();
  const res = await fetch(`${API_ORIGIN}/api/privacy/export/text`, {
    headers: {
      "X-Yadegar-Client": "mobile",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.text();
}
