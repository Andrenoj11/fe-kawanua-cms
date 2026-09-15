import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { TokenPair } from "./types";

export const backendURL = () =>
  (process.env.BACKEND_API_URL || "http://127.0.0.1:8080/api/v1").replace(
    /\/$/,
    "",
  );
export const cookieNames = {
  access: "kawanua_access",
  refresh: "kawanua_refresh",
  expiry: "kawanua_expiry",
};
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export async function backend(path: string, init: RequestInit = {}) {
  return fetch(backendURL() + path, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
}
export function failure(status: number, message: string) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const supplied = new URL(origin);
    const host = request.headers.get("host");
    return (
      ["http:", "https:"].includes(supplied.protocol) &&
      supplied.host === host &&
      (process.env.NODE_ENV !== "production" || supplied.protocol === "https:")
    );
  } catch {
    return false;
  }
}
export function setTokens(response: NextResponse, tokens: TokenPair) {
  response.cookies.set(cookieNames.access, tokens.access_token, {
    ...options,
    maxAge: Math.max(
      1,
      tokens.access_expires_at - Math.floor(Date.now() / 1000),
    ),
  });
  response.cookies.set(cookieNames.refresh, tokens.refresh_token, {
    ...options,
    maxAge: Math.max(
      1,
      tokens.refresh_expires_at - Math.floor(Date.now() / 1000),
    ),
  });
  response.cookies.set(cookieNames.expiry, String(tokens.access_expires_at), {
    ...options,
    maxAge: Math.max(
      1,
      tokens.refresh_expires_at - Math.floor(Date.now() / 1000),
    ),
  });
}
export function clearTokens(response: NextResponse) {
  for (const name of Object.values(cookieNames))
    response.cookies.set(name, "", { ...options, maxAge: 0 });
}
const rotations = new Map<string, Promise<TokenPair | null>>();
async function rotate(refresh: string): Promise<TokenPair | null> {
  const key = createHash("sha256").update(refresh).digest("hex");
  let pending = rotations.get(key);
  if (!pending) {
    pending = (async () => {
      const r = await backend("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (r.status === 401) return null;
      if (!r.ok) throw new Error("Refresh service unavailable");
      const result = await r.json();
      return result.data as TokenPair;
    })();
    rotations.set(key, pending);
    void pending
      .finally(() => {
        setTimeout(() => rotations.delete(key), 5000).unref();
      })
      .catch(() => {});
  }
  return pending;
}
export async function authenticated(
  path: string,
  init: RequestInit = {},
): Promise<{ response: Response; tokens: TokenPair | null }> {
  const jar = await cookies();
  let access = jar.get(cookieNames.access)?.value;
  const refresh = jar.get(cookieNames.refresh)?.value;
  let tokens: TokenPair | null = null;
  if (
    refresh &&
    (!access ||
      Number(jar.get(cookieNames.expiry)?.value || 0) < Date.now() / 1000 + 20)
  ) {
    tokens = await rotate(refresh);
    if (!tokens)
      return {
        response: Response.json(
          { success: false, message: "unauthorized" },
          { status: 401 },
        ),
        tokens: null,
      };
    access = tokens.access_token;
  }
  if (!access)
    return {
      response: Response.json(
        { success: false, message: "unauthorized" },
        { status: 401 },
      ),
      tokens: null,
    };
  const send = (token: string) =>
    backend(path, {
      ...init,
      headers: { ...init.headers, Authorization: "Bearer " + token },
    });
  let response = await send(access);
  if (response.status === 401 && refresh && !tokens) {
    tokens = await rotate(refresh);
    if (tokens) response = await send(tokens.access_token);
  }
  return { response, tokens };
}
export async function forward(
  result: Awaited<ReturnType<typeof authenticated>>,
) {
  const { response: upstream, tokens } = result;
  const data = await upstream
    .json()
    .catch(() => ({ success: false, message: "Invalid upstream response" }));
  const response = NextResponse.json(data, {
    status: upstream.status,
    headers: { "Cache-Control": "no-store" },
  });
  if (tokens) setTokens(response, tokens);
  if (upstream.status === 401) clearTokens(response);
  return response;
}
