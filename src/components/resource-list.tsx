"use client";
import { useState } from "react";
import Link from "next/link";
import type { RecordData, Meta } from "@/lib/types";
import type { Resource } from "@/lib/resources";
import { contactOptions, statusOptions } from "@/lib/resources";
import { api, dateLabel, labelOf, titleOf } from "@/lib/http";
import { useRemote } from "@/lib/use-remote";
import { Badge, Confirm, Empty, ErrorBox, Icon, Spinner } from "./ui";
export function Pagination({
  meta,
  page,
  onPage,
}: {
  meta?: Meta;
  page: number;
  onPage: (p: number) => void;
}) {
  if (!meta) return null;
  const total = meta.total;
  return (
    <div className="pagination">
      <span>
        {total
          ? (page - 1) * meta.limit +
            1 +
            "–" +
            Math.min(page * meta.limit, total)
          : 0}{" "}
        dari {total} data
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <Icon name="left" size={17} />
        </button>
        <span>
          Halaman {page} / {Math.max(1, meta.total_pages)}
        </span>
        <button
          className="icon-button"
          aria-label="Halaman berikutnya"
          disabled={page >= meta.total_pages}
          onClick={() => onPage(page + 1)}
        >
          <Icon name="right" size={17} />
        </button>
      </div>
    </div>
  );
}
export function Cell({ row, column }: { row: RecordData; column: string }) {
  const value = row[column];
  if (["status", "is_active", "role"].includes(column))
    return <Badge value={value} />;
  if (column === "is_featured")
    return value ? (
      <span className="featured">
        <Icon name="sparkles" size={13} /> Unggulan
      </span>
    ) : (
      <span className="cell-muted">—</span>
    );
  if (column.endsWith("_at") || column === "event_date")
    return <span className="cell-muted">{dateLabel(value)}</span>;
  if (column === "file_size")
    return <span>{(Number(value) / 1024).toFixed(0)} KB</span>;
  return <span>{labelOf(value) || "—"}</span>;
}
export function ResourceList({
  resource,
  currentUserID,
}: {
  resource: Resource;
  currentUserID: string;
}) {
  const [page, setPage] = useState(1),
    [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("latest"),
    [featured, setFeatured] = useState("");
  const [deleting, setDeleting] = useState<RecordData | null>(null),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState("");
  const params = new URLSearchParams({ page: String(page), limit: "10" });
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (resource.key === "articles") {
    params.set("sort", sort);
    if (featured) params.set("featured", featured);
  }
  const { result, error, loading, refresh } = useRemote<RecordData[]>(
    "/api/cms/" + resource.key + "?" + params,
  );
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setActionError("");
    try {
      await api("/api/cms/" + resource.key + "/" + deleting.id, {
        method: "DELETE",
      });
      setDeleting(null);
      setNotice("Data berhasil dihapus.");
      if (result?.data.length === 1 && page > 1) setPage(page - 1);
      else refresh();
    } catch (e) {
      setActionError((e as Error).message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">KELOLA KONTEN</div>
          <h1>
            {resource.title}
            <span className="coral-text">.</span>
          </h1>
          <p>{resource.description}</p>
        </div>
        {!resource.readonly && (
          <Link
            className="button primary"
            href={"/cms/" + resource.key + "/new"}
          >
            <Icon name="plus" />
            Tambah {resource.singular}
          </Link>
        )}
      </div>
      {notice && (
        <div className="notice" role="status">
          <Icon name="success" />
          {notice}
          <button
            className="icon-button"
            aria-label="Tutup pemberitahuan"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {actionError && <ErrorBox message={actionError} />}
      <section className="panel">
        <div className="list-toolbar">
          <div className="toolbar-start">
            {resource.search ? (
              <form
                className="search-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(input);
                  setPage(1);
                }}
              >
                <Icon name="search" size={17} />
                <input
                  aria-label={"Cari " + resource.singular}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={"Cari " + resource.singular + "…"}
                />
                <button type="submit" className="search-submit">
                  Cari
                </button>
              </form>
            ) : (
              <h2>Semua {resource.singular}</h2>
            )}
            {resource.status && (
              <select
                aria-label="Filter status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua status</option>
                {(resource.key === "contact-messages"
                  ? contactOptions
                  : statusOptions
                ).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="toolbar-end">
            {resource.key === "articles" && (
              <>
                <select
                  aria-label="Filter unggulan"
                  value={featured}
                  onChange={(e) => {
                    setFeatured(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua artikel</option>
                  <option value="true">Unggulan</option>
                  <option value="false">Bukan unggulan</option>
                </select>
                <select
                  aria-label="Urutkan artikel"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="latest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="title">Judul A–Z</option>
                </select>
              </>
            )}
            <button
              className="icon-button"
              title="Muat ulang"
              aria-label="Muat ulang data"
              onClick={refresh}
            >
              <Icon name="refresh" size={17} />
            </button>
          </div>
        </div>
        {error ? (
          <ErrorBox message={error} onRetry={refresh} />
        ) : loading ? (
          <div className="loading-panel">
            <Spinner />
          </div>
        ) : !result?.data.length ? (
          <Empty
            title={
              search || status
                ? "Tidak ada hasil yang cocok"
                : "Belum ada " + resource.singular
            }
            description={
              search || status
                ? "Coba kata kunci atau filter yang berbeda."
                : "Mulai tambahkan " +
                  resource.singular +
                  " untuk website Kawanua Media."
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {resource.columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th className="cell-right">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((row) => (
                  <tr key={String(row.id)}>
                    {resource.columns.map((c, i) => (
                      <td key={c.key}>
                        {i === 0 ? (
                          <Link
                            href={"/cms/" + resource.key + "/" + row.id}
                            className="row-title"
                          >
                            <span className="row-symbol">
                              <Icon name={resource.icon} size={17} />
                            </span>
                            <span>
                              <strong>
                                {labelOf(row[c.key]) || "Tanpa judul"}
                              </strong>
                              {resource.key === "articles" && (
                                <small>{labelOf(row.slug)}</small>
                              )}
                            </span>
                          </Link>
                        ) : (
                          <Cell row={row} column={c.key} />
                        )}
                      </td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <Link
                          className="icon-button"
                          href={"/cms/" + resource.key + "/" + row.id}
                          aria-label={
                            (resource.readonly ? "Baca " : "Edit ") +
                            titleOf(row)
                          }
                        >
                          <Icon
                            name={resource.readonly ? "eye" : "pencil"}
                            size={16}
                          />
                        </Link>
                        {!resource.readonly && (
                          <button
                            className="icon-button destructive"
                            aria-label={"Hapus " + titleOf(row)}
                            disabled={
                              resource.key === "users" &&
                              row.id === currentUserID
                            }
                            onClick={() => setDeleting(row)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={result?.meta} page={page} onPage={setPage} />
      </section>
      {deleting && (
        <Confirm
          title={"Hapus " + resource.singular + "?"}
          description={
            "Data “" + titleOf(deleting) + "” akan dihapus dari CMS."
          }
          danger
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
