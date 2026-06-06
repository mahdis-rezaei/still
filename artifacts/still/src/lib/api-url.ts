import { isNativeApp, apiBaseUrl } from "./native";

// For *direct* asset URLs that bypass the API client's customFetch (e.g. an
// <img src="/api/attachments/…">). On web these stay relative; on native they
// must point at the real API origin. customFetch() handles its own base URL via
// setBaseUrl(), so only use this for raw element src/href values.
export function apiUrl(path: string): string {
  if (isNativeApp() && path.startsWith("/")) {
    return `${apiBaseUrl()}${path}`;
  }
  return path;
}
