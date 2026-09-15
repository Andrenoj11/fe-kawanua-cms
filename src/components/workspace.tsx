"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, website } from "@/lib/http";
import type { User } from "@/lib/types";
import { resources, resourceByKey } from "@/lib/resources";
import { Brand, Icon, Spinner, ErrorBox } from "./ui";
import { Dashboard } from "./dashboard";
import { ResourceList } from "./resource-list";
import { ResourceEditor } from "./resource-editor";
import { MediaLibrary } from "./media-library";
export function Workspace({ route }: { route: string[] }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const resource = resourceByKey(route[0] || "");
  const current = route[0] || "dashboard";
  const title = resource?.title || "Dashboard";
  const loadSession = useCallback(async () => {
    setError("");
    try {
      const r = await api<User>("/api/auth/session");
      if (!r.data.is_active) {
        router.replace("/login");
        return;
      }
      setUser(r.data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace("/login");
      else setError((e as Error).message);
    }
  }, [router]);
  useEffect(() => {
    void loadSession();
    const expired = () => {
      setUser(null);
      router.replace("/login");
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [loadSession, router]);
  useEffect(() => {
    setOpen(false);
  }, [current, route.length]);
  async function logout() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.replace("/login");
    } catch (e) {
      setError((e as Error).message);
      setSigningOut(false);
    }
  }
  if (!user)
    return (
      <main className="session-loading">
        <Brand />
        {error ? (
          <ErrorBox message={error} onRetry={loadSession} />
        ) : (
          <Spinner />
        )}
      </main>
    );
  const admin = user.role === "ADMIN";
  let view: React.ReactNode;
  if (!route.length) view = <Dashboard user={user} />;
  else if (!resource || route.length > 2)
    view = (
      <div className="empty">
        <h2>Halaman tidak ditemukan</h2>
        <Link className="button primary" href="/cms">
          Ke dashboard
        </Link>
      </div>
    );
  else if (resource.admin && !admin)
    view = (
      <ErrorBox message="Halaman ini hanya dapat diakses administrator." />
    );
  else if (resource.singleton || route[1])
    view = (
      <ResourceEditor
        key={route.join("/")}
        resource={resource}
        id={route[1]}
        user={user}
      />
    );
  else if (resource.key === "media") view = <MediaLibrary />;
  else
    view = (
      <ResourceList
        key={resource.key}
        resource={resource}
        currentUserID={user.id}
      />
    );
  return (
    <div className="workspace">
      {open && (
        <button
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-label="Tutup navigasi"
        />
      )}
      <aside className={"sidebar " + (open ? "open" : "")}>
        <Link href="/cms" className="brand-link">
          <Brand />
        </Link>
        <div className="workspace-label">
          <span className="workspace-dot" /> Kawanua workspace{" "}
          <span className="small-label">CMS</span>
        </div>
        <nav aria-label="Navigasi utama">
          <span className="nav-group-label">RUANG KERJA</span>
          <Link
            href="/cms"
            className={"nav-item " + (current === "dashboard" ? "active" : "")}
          >
            <Icon name="dashboard" /> Dashboard
          </Link>
          <span className="nav-group-label">KELOLA KONTEN</span>
          {resources
            .filter((r) => !r.admin)
            .map((r) => (
              <Link
                href={"/cms/" + r.key}
                key={r.key}
                className={"nav-item " + (current === r.key ? "active" : "")}
              >
                <Icon name={r.icon} />
                {r.title}
                {current === r.key && <span className="nav-active-dot" />}
              </Link>
            ))}
          {admin && (
            <>
              <span className="nav-group-label">ADMINISTRASI</span>
              {resources
                .filter((r) => r.admin)
                .map((r) => (
                  <Link
                    href={"/cms/" + r.key}
                    key={r.key}
                    className={
                      "nav-item " + (current === r.key ? "active" : "")
                    }
                  >
                    <Icon name={r.icon} />
                    {r.title}
                  </Link>
                ))}
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <a
            href={website}
            target="_blank"
            rel="noreferrer"
            className="website-card"
          >
            <span className="website-card-icon">
              <Icon name="external" />
            </span>
            <span>
              <strong>Lihat website</strong>
              <small>kawanuamedia</small>
            </span>
            <Icon name="arrow" size={16} />
          </a>
          <div className="user-card">
            <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{admin ? "Administrator" : "Editor"}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Keluar"
              title="Keluar"
              disabled={signingOut}
              onClick={logout}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              onClick={() => setOpen(!open)}
              aria-label="Buka navigasi"
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <Icon name="chevron" size={14} />
            <strong>{title}</strong>
            {route[1] && (
              <>
                <Icon name="chevron" size={14} />
                <span>{route[1] === "new" ? "Tambah" : "Detail"}</span>
              </>
            )}
          </div>
          <div className="topbar-end">
            <span className="edition-label">KAWANUA MEDIA</span>
            <span className="topbar-divider" />
            <div className="avatar small">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {error && <ErrorBox message={error} />}
          <div key={route.join("/")} className="page-enter">
            {view}
          </div>
        </main>
        <footer className="workspace-footer">
          <span>© {new Date().getFullYear()} Kawanua Media</span>
          <span>Dibuat untuk cerita yang berarti.</span>
        </footer>
      </div>
    </div>
  );
}
