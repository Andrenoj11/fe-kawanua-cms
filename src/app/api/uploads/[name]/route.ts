import { NextRequest } from "next/server";
import { backendURL, failure } from "@/lib/backend";
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  if (!/^[a-zA-Z0-9._-]+\.(png|jpe?g|webp)$/i.test(name))
    return failure(404, "Not found");
  try {
    const url = new URL("/uploads/" + encodeURIComponent(name), backendURL());
    const r = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return failure(r.status, "Not found");
    const mime = r.headers.get("content-type") || "";
    if (!/^image\/(png|jpeg|webp)/.test(mime)) return failure(404, "Not found");
    return new Response(r.body, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return failure(502, "Backend unavailable");
  }
}
