import { NextRequest, NextResponse } from "next/server";
import { backend, failure, sameOrigin, setTokens } from "@/lib/backend";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure(403, "Invalid origin");
  try {
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      body.email.length > 255 ||
      body.password.length > 1024
    )
      return failure(400, "Invalid credentials");
    const result = await backend("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
    const data = await result.json();
    if (!result.ok) return NextResponse.json(data, { status: result.status });
    const me = await backend("/auth/me", {
      headers: { Authorization: "Bearer " + data.data.access_token },
    });
    if (!me.ok) return failure(401, "unauthorized");
    const user = await me.json();
    const response = NextResponse.json(user, {
      headers: { "Cache-Control": "no-store" },
    });
    setTokens(response, data.data);
    return response;
  } catch {
    return failure(502, "Backend unavailable");
  }
}
