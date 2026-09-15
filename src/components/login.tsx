"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/http";
import type { User } from "@/lib/types";
import { Brand, ErrorBox, Icon } from "./ui";
export function Login() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    api<User>("/api/auth/session", { signal: abort.signal })
      .then(() => router.replace("/cms"))
      .catch(() => {});
    return () => abort.abort();
  }, [router]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email")).trim(),
          password: form.get("password"),
        }),
      });
      router.replace("/cms");
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }
  return (
    <main className="login">
      <section className="login-story">
        <Brand light />
        <div className="login-story-copy">
          <span className="eyebrow">DARI KAWANUA, UNTUK DUNIA</span>
          <h1>
            Setiap cerita
            <br />
            layak untuk
            <br />
            <em>didengar.</em>
          </h1>
          <p>
            Ruang untuk merawat budaya, menghubungkan komunitas, dan membagikan
            cerita yang berarti.
          </p>
        </div>
        <div className="login-art">
          <div className="art-circle one" />
          <div className="art-circle two" />
          <div className="art-circle three" />
          <span>01 / RUANG REDAKSI</span>
        </div>
        <footer>
          © {new Date().getFullYear()} Kawanua Media{" "}
          <span>Berakar lokal. Berdampak luas.</span>
        </footer>
      </section>
      <section className="login-form-side">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="login-form-wrap">
          <div className="login-tag">
            <Icon name="shield" size={15} /> CONTENT MANAGEMENT SYSTEM
          </div>
          <h2>Selamat datang kembali.</h2>
          <p className="muted">Masuk dan lanjutkan cerita Anda hari ini.</p>
          <form onSubmit={submit}>
            {error && <ErrorBox message={error} />}
            <label className="field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                required
                maxLength={255}
                autoComplete="username"
                placeholder="nama@kawanuamedia.com"
                autoFocus
              />
            </label>
            <label className="field">
              <span>Kata sandi</span>
              <div className="password-input">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShow(!show)}
                  aria-label={
                    show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  <Icon name={show ? "eye-off" : "eye"} />
                </button>
              </div>
            </label>
            <button className="button primary login-submit" disabled={pending}>
              {pending ? <Icon name="loader" className="spin" /> : null}
              {pending ? "Sedang masuk…" : "Masuk ke ruang redaksi"}
              <Icon name="arrow" />
            </button>
          </form>
          <p className="login-help">
            Butuh akses? Hubungi administrator Kawanua Media.
          </p>
          <div className="login-divider" />
          <p className="session-note">
            <Icon name="shield" size={15} /> Sesi terlindungi. Khusus tim
            Kawanua Media.
          </p>
        </div>
        <footer>Terhubung dengan cerita. Digerakkan oleh komunitas.</footer>
      </section>
    </main>
  );
}
