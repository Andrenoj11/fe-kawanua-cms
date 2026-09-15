"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { User, RecordData } from "@/lib/types";
import { api, dateLabel, titleOf } from "@/lib/http";
import { Badge, Empty, ErrorBox, Icon, Spinner } from "./ui";
type Overview = {
  total: number;
  published: number;
  drafts: number;
  media: number;
  pages: number;
  messages: number;
  recent: RecordData[];
  online: boolean;
};
export function Dashboard({ user }: { user: User }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    const get = <T,>(path: string) =>
      api<T>(path, { signal: controller.signal });
    Promise.all([
      get<RecordData[]>("/api/cms/articles?limit=5&sort=latest"),
      get<RecordData[]>("/api/cms/articles?limit=1&status=PUBLISHED"),
      get<RecordData[]>("/api/cms/articles?limit=1&status=DRAFT"),
      get<RecordData[]>("/api/cms/media?limit=1"),
      get<RecordData[]>("/api/cms/pages?limit=1"),
      get<RecordData[]>("/api/cms/contact-messages?limit=1&status=NEW"),
      get<{ online: boolean }>("/api/health"),
    ])
      .then(([a, b, c, d, e, f, g]) => {
        if (!controller.signal.aborted)
          setData({
            total: a.meta?.total || 0,
            published: b.meta?.total || 0,
            drafts: c.meta?.total || 0,
            media: d.meta?.total || 0,
            pages: e.meta?.total || 0,
            messages: f.meta?.total || 0,
            recent: a.data,
            online: g.data.online,
          });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [revision]);
  const date = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">RUANG REDAKSI ANDA</div>
          <h1>
            Selamat datang, {user.name.split(" ")[0]}
            <span className="coral-text">.</span>
          </h1>
          <p>Hari yang baik untuk membagikan cerita baru.</p>
        </div>
        <span className="date-chip">
          <Icon name="clock" size={15} />
          {date}
        </span>
      </div>
      <section className="welcome-banner">
        <div>
          <span className="banner-eyebrow">
            <span /> SUARA LOKAL, CERITA BERMAKNA
          </span>
          <h2>
            Cerita dari Kawanua.
            <br />
            <span>Terhubung ke mana saja.</span>
          </h2>
          <p>Mulai dari satu ide. Jadikan cerita yang menginspirasi.</p>
          <Link className="button dark" href="/cms/articles/new">
            <Icon name="plus" size={17} /> Tulis artikel baru{" "}
            <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="editorial-label">
            <Icon name="newspaper" size={23} />
            <span>
              LOCAL STORIES.
              <br />
              <strong>LASTING IMPACT.</strong>
            </span>
          </div>
          <div className="orbit-dot" />
        </div>
        <span className="banner-number" aria-hidden="true">
          KW / 01
        </span>
      </section>
      {error ? (
        <ErrorBox message={error} onRetry={() => setRevision((v) => v + 1)} />
      ) : !data ? (
        <div className="panel loading-panel">
          <Spinner />
        </div>
      ) : (
        <>
          <section className="stats-grid" aria-label="Ringkasan konten">
            {[
              {
                label: "Total artikel",
                value: data.total,
                icon: "newspaper",
                note: data.published + " sudah diterbitkan",
                color: "coral",
                link: "articles",
              },
              {
                label: "Dalam draf",
                value: data.drafts,
                icon: "files",
                note: "Cerita yang menunggu tayang",
                color: "amber",
                link: "articles",
              },
              {
                label: "Pustaka media",
                value: data.media,
                icon: "image",
                note: "Aset visual tersimpan",
                color: "green",
                link: "media",
              },
              {
                label: "Pesan baru",
                value: data.messages,
                icon: "inbox",
                note: "Dari pembaca & komunitas",
                color: "blue",
                link: "contact-messages",
              },
            ].map((s) => (
              <Link href={"/cms/" + s.link} className="stat-card" key={s.label}>
                <div className="stat-top">
                  <span>{s.label}</span>
                  <div className={"stat-icon " + s.color}>
                    <Icon name={s.icon} />
                  </div>
                </div>
                <strong>{s.value.toLocaleString("id-ID")}</strong>
                <div className="stat-note">
                  {s.note}
                  <Icon name="arrow" size={15} />
                </div>
              </Link>
            ))}
          </section>
          <div className="dashboard-grid">
            <section className="panel recent-panel">
              <div className="panel-heading">
                <div>
                  <h2>Artikel terbaru</h2>
                  <p>Cerita terakhir dari meja redaksi.</p>
                </div>
                <Link className="text-button" href="/cms/articles">
                  Lihat semua <Icon name="arrow" size={15} />
                </Link>
              </div>
              {data.recent.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>JUDUL ARTIKEL</th>
                        <th>STATUS</th>
                        <th>DIPERBARUI</th>
                        <th>
                          <span className="sr-only">Buka</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((row, i) => (
                        <tr key={String(row.id)}>
                          <td>
                            <Link
                              className="article-title"
                              href={"/cms/articles/" + row.id}
                            >
                              <span className={"article-thumb thumb-" + i}>
                                <Icon name="newspaper" size={22} />
                              </span>
                              <span>
                                <strong>{titleOf(row)}</strong>
                                <small>{String(row.slug)}</small>
                              </span>
                            </Link>
                          </td>
                          <td>
                            <Badge value={row.status} />
                          </td>
                          <td className="cell-muted">
                            {dateLabel(row.updated_at)}
                          </td>
                          <td>
                            <Link
                              className="icon-button"
                              href={"/cms/articles/" + row.id}
                              aria-label={"Buka " + titleOf(row)}
                            >
                              <Icon name="chevron" size={16} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="Cerita pertama dimulai di sini"
                  description="Tulis artikel, simpan sebagai draf, lalu terbitkan ketika sudah siap."
                >
                  <Link className="button secondary" href="/cms/articles/new">
                    <Icon name="plus" />
                    Tulis artikel
                  </Link>
                </Empty>
              )}
            </section>
            <aside className="dashboard-aside">
              <section className="panel quick-actions">
                <div className="panel-heading">
                  <h2>Akses cepat</h2>
                  <Icon name="sparkles" size={17} />
                </div>
                {[
                  {
                    name: "Unggah media",
                    note: "Tambah gambar ke pustaka",
                    icon: "upload",
                    path: "media",
                  },
                  {
                    name: "Atur halaman",
                    note: "Susun isi website Anda",
                    icon: "files",
                    path: "pages",
                  },
                  {
                    name: "Baca pesan",
                    note: "Terhubung dengan pembaca",
                    icon: "inbox",
                    path: "contact-messages",
                  },
                ].map((a) => (
                  <Link
                    key={a.path}
                    href={"/cms/" + a.path}
                    className="quick-action"
                  >
                    <span className="quick-icon">
                      <Icon name={a.icon} />
                    </span>
                    <span>
                      <strong>{a.name}</strong>
                      <small>{a.note}</small>
                    </span>
                    <Icon name="chevron" size={16} />
                  </Link>
                ))}
              </section>
              <section className="publication-card">
                <div className="publication-heading">
                  <Icon name="book" />
                  <h3>Ringkasan publikasi</h3>
                </div>
                <div className="publication-total">
                  <strong>{data.published}</strong>
                  <span>artikel telah terbit</span>
                </div>
                <div className="progress-track">
                  <span
                    style={{
                      width:
                        (data.total ? (data.published / data.total) * 100 : 0) +
                        "%",
                    }}
                  />
                </div>
                <div className="publication-legend">
                  <span>
                    <i /> {data.drafts} draf
                  </span>
                  <span>{data.pages} halaman</span>
                </div>
                <div className="connection">
                  <span className={data.online ? "online-dot" : ""} />
                  {data.online ? "Backend terhubung" : "Backend tidak tersedia"}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
