import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  authenticated,
  backend,
  clearTokens,
  cookieNames,
  failure,
  sameOrigin,
} from "@/lib/backend";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure(403, "Invalid origin");
  let revoked = true;
  try {
    const auth = await authenticated("/auth/me");
    const jar = await cookies();
    const refresh =
      auth.tokens?.refresh_token ?? jar.get(cookieNames.refresh)?.value;
    const access =
      auth.tokens?.access_token ?? jar.get(cookieNames.access)?.value;
    if (refresh && access) {
      const r = await backend("/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + access,
        },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      revoked = r.ok || r.status === 401;
    }
  } catch {
    revoked = false;
  }
  const response = NextResponse.json(
    { success: true, message: "Logged out", data: { revoked } },
    { headers: { "Cache-Control": "no-store" } },
  );
  clearTokens(response);
  return response;
}
