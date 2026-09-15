import { authenticated, failure, forward } from "@/lib/backend";
export async function GET() {
  try {
    return await forward(await authenticated("/auth/me"));
  } catch {
    return failure(502, "Backend unavailable");
  }
}
