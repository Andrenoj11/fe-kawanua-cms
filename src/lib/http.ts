import type { Envelope } from "./types";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<Envelope<T>> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
  const data = await response
    .json()
    .catch(() => ({ message: "Respons server tidak dapat dibaca." }));
  if (!response.ok || !data.success) {
    if (response.status === 401 && !path.startsWith("/api/auth/"))
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      response.status,
      errorMessage(response.status, data.message),
      data.errors,
    );
  }
  return data;
}
export function errorMessage(status: number, fallback?: string) {
  const messages: Record<number, string> = {
    400: "Permintaan tidak valid.",
    401: "Sesi berakhir atau email dan kata sandi tidak cocok.",
    403: "Anda tidak memiliki akses untuk tindakan ini.",
    404: "Data tidak ditemukan.",
    409: "Data sudah digunakan. Periksa slug, email, atau relasi yang dipilih.",
    413: "Ukuran berkas terlalu besar. Maksimum 5 MB.",
    422: "Periksa kembali isian formulir.",
    429: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
    502: "Backend belum dapat dihubungi. Pastikan API Go berjalan.",
    503: "Layanan sedang tidak tersedia.",
  };
  return (
    messages[status] ??
    (status >= 500
      ? "Terjadi kesalahan pada server. Coba lagi."
      : fallback || "Permintaan gagal.")
  );
}
export const labelOf = (v: unknown) =>
  typeof v === "string" ? v : v == null ? "" : String(v);
export const titleOf = (row: Record<string, unknown>) =>
  labelOf(
    row.title ||
      row.name ||
      row.site_name ||
      row.subject ||
      row.original_name ||
      row.label ||
      "Tanpa judul",
  );
export const dateLabel = (value: unknown) =>
  typeof value === "string" && !isNaN(Date.parse(value))
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";
export const website =
  process.env.NEXT_PUBLIC_WEBSITE_URL || "https://dev-kawanuamedia.vercel.app";
export function mediaURL(row: Record<string, unknown>) {
  const name = labelOf(row.file_name);
  return name && /^[a-zA-Z0-9._-]+$/.test(name)
    ? "/api/uploads/" + encodeURIComponent(name)
    : "";
}
