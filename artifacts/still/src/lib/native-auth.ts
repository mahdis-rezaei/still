import type { AuthUser } from "@workspace/api-client-react";
import { apiBaseUrl, getStoredToken, setStoredToken } from "./native";

// Native auth path. Web continues to use the cookie-based generated hooks; native
// can't rely on cross-origin cookies, so it talks to the same endpoints directly,
// declares itself with the X-Yadegar-Client header (which makes the server include
// the opaque session token in the JSON body), stores that token, and from then on
// every request carries it as a Bearer header (wired in native-init.ts).

const CLIENT_HEADER = { "X-Yadegar-Client": "mobile" } as const;

type AuthResult = AuthUser & { token?: string };

async function authPost(
  path: string,
  body?: unknown,
  withAuth = false,
): Promise<Response> {
  const headers: Record<string, string> = { ...CLIENT_HEADER };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (withAuth) {
    const t = await getStoredToken();
    if (t) headers["authorization"] = `Bearer ${t}`;
  }
  return fetch(`${apiBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function stripToken(data: AuthResult): AuthUser {
  const { token: _token, ...user } = data;
  void _token;
  return user as AuthUser;
}

export async function nativeLogin(
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await authPost("/api/auth/login", { email, password });
  if (!res.ok) throw new Error("Incorrect email or password");
  const data = (await res.json()) as AuthResult;
  if (data.token) await setStoredToken(data.token);
  return stripToken(data);
}

export async function nativeRegister(
  email: string,
  password: string,
  name?: string,
): Promise<AuthUser> {
  const res = await authPost("/api/auth/register", {
    email,
    password,
    ...(name ? { name } : {}),
  });
  if (!res.ok) {
    const msg =
      res.status === 409
        ? "That email is already registered"
        : "Couldn't create your account";
    throw new Error(msg);
  }
  const data = (await res.json()) as AuthResult;
  if (data.token) await setStoredToken(data.token);
  return stripToken(data);
}

export async function nativeLogout(): Promise<void> {
  try {
    await authPost("/api/auth/logout", undefined, true);
  } finally {
    await setStoredToken(null);
  }
}
