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
