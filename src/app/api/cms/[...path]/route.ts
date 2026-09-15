import { NextRequest } from "next/server";
import { authenticated, failure, forward, sameOrigin } from "@/lib/backend";
import { allowedRoute } from "@/lib/proxy-policy";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: NextRequest, context: Context) {
  const path = (await context.params).path.join("/");
  if (!allowedRoute(path, request.method))
    return failure(404, "Route not found");
  if (request.method !== "GET" && !sameOrigin(request))
    return failure(403, "Invalid origin");
  try {
    const type = request.headers.get("content-type") || "";
    const headers: Record<string, string> = {};
    let body: BodyInit | undefined;
    if (request.method !== "GET" && request.method !== "DELETE") {
      if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
        return failure(413, "Payload too large");
      const raw = await request.arrayBuffer();
      if (raw.byteLength > 6 * 1024 * 1024)
        return failure(413, "Payload too large");
      if (raw.byteLength) {
        body = raw;
        headers["Content-Type"] = type;
      }
    }
    return await forward(
      await authenticated("/admin/" + path + request.nextUrl.search, {
        method: request.method,
        headers,
        body,
      }),
    );
  } catch {
    return failure(502, "Backend unavailable");
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
