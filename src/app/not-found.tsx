import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone">
      <span className="eyebrow">404 · HALAMAN TIDAK DITEMUKAN</span>
      <h1>Sepertinya Anda tersesat.</h1>
      <Link className="button primary" href="/cms">
        Kembali ke dashboard
      </Link>
    </main>
  );
}
