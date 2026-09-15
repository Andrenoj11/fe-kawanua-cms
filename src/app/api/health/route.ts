import { backendURL } from "@/lib/backend";
import { NextResponse } from "next/server";
export async function GET() {
  try {
    const r = await fetch(new URL("/health", backendURL()), {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return NextResponse.json(
      { success: r.ok, data: { online: r.ok } },
      { status: r.ok ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      { success: false, data: { online: false } },
      { status: 503 },
    );
  }
}
