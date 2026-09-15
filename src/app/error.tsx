"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>Halaman belum dapat ditampilkan.</h1>
      <p>Silakan muat ulang untuk mencoba lagi.</p>
      <button className="button primary" onClick={reset}>
        Coba lagi
      </button>
    </main>
  );
}
