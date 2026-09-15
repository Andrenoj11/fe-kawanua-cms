"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { RecordData } from "@/lib/types";
import { api, mediaURL, labelOf, titleOf } from "@/lib/http";
import { useRemote } from "@/lib/use-remote";
import { Confirm, Empty, ErrorBox, Icon, Modal, Spinner } from "./ui";
import { Pagination } from "./resource-list";
export function UploadDialog({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(""),
    [alt, setAlt] = useState(""),
    [caption, setCaption] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function choose(list: FileList | null) {
    if (!list) return;
    const allowed: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpe?g",
      "image/webp": "webp",
    };
    const incoming = Array.from(list);
    const invalid = incoming.find(
      (f) =>
        !allowed[f.type] ||
        !new RegExp("\\." + allowed[f.type] + "$", "i").test(f.name) ||
        f.size > 5242880 ||
        !f.size,
    );
    if (invalid) {
      setError(
        "Berkas " +
          invalid.name +
          " tidak valid. Gunakan JPG, PNG, atau WebP hingga 5 MB.",
      );
      return;
    }
    setFiles(incoming);
    setError("");
  }
  async function upload() {
    if (!files.length) return;
    setBusy(true);
    setError("");
    let completed = 0;
    try {
      for (const file of files) {
        setProgress(
          "Mengunggah " + (completed + 1) + " dari " + files.length + "…",
        );
        const form = new FormData();
        form.append("file", file);
        form.append("alt_text", alt);
        form.append("caption", caption);
        await api("/api/cms/media", { method: "POST", body: form });
        completed++;
      }
      onUploaded();
      onClose();
    } catch (e) {
      setFiles((v) => v.slice(completed));
      setError(
        (e as Error).message +
          (completed
            ? " " + completed + " berkas sudah berhasil diunggah."
            : ""),
      );
      if (completed) onUploaded();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Unggah media"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="upload-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) choose(e.dataTransfer.files);
        }}
      >
        <div className="upload-icon">
          <Icon name="upload" size={25} />
        </div>
        <h3>Tarik gambar ke sini</h3>
        <p>JPG, PNG, atau WebP · Maksimal 5 MB per berkas</p>
        <input
          ref={input}
          className="sr-only"
          aria-label="Pilih berkas gambar"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          onChange={(e) => choose(e.target.files)}
          disabled={busy}
        />
        <button
          className="button secondary"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          Pilih dari perangkat
        </button>
      </div>
      {files.length > 0 && (
        <div className="selected-files">
          {files.map((f) => (
            <div key={f.name + f.size}>
              <Icon name="image" size={15} />
              <span>{f.name}</span>
              <small>{(f.size / 1024).toFixed(0)} KB</small>
            </div>
          ))}
        </div>
      )}
      <label className="field">
        <span>Teks alternatif</span>
        <input
          maxLength={255}
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Deskripsikan isi gambar"
        />
      </label>
      <label className="field">
        <span>Keterangan</span>
        <textarea
          maxLength={1000}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>
      {error && <ErrorBox message={error} />}
      <div className="form-actions">
        <button className="button secondary" onClick={onClose} disabled={busy}>
          Batal
        </button>
        <button
          className="button primary"
          disabled={busy || !files.length}
          onClick={upload}
        >
          <Icon
            name={busy ? "loader" : "upload"}
            className={busy ? "spin" : ""}
          />
          {busy ? progress : "Unggah " + (files.length || "") + " gambar"}
        </button>
      </div>
    </Modal>
  );
}
export function MediaLibrary() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState(""),
    [upload, setUpload] = useState(false),
    [deleting, setDeleting] = useState<RecordData | null>(null),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const { result, error, loading, refresh } = useRemote<RecordData[]>(
    "/api/cms/media?limit=12&page=" +
      page +
      "&search=" +
      encodeURIComponent(search),
  );
  async function remove() {
    setBusy(true);
    try {
      await api("/api/cms/media/" + deleting?.id, { method: "DELETE" });
      setDeleting(null);
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
          <div className="eyebrow">ASET VISUAL</div>
          <h1>
            Pustaka media<span className="coral-text">.</span>
          </h1>
          <p>Setiap gambar punya cerita. Simpan dan temukan di sini.</p>
        </div>
        <button className="button primary" onClick={() => setUpload(true)}>
          <Icon name="upload" />
          Unggah media
        </button>
      </div>
      <section className="panel">
        <div className="list-toolbar">
          <form
            className="search-input"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(draft);
              setPage(1);
            }}
          >
            <Icon name="search" />
            <input
              placeholder="Cari nama gambar…"
              aria-label="Cari gambar"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="search-submit">Cari</button>
          </form>
          <span className="muted">
            {result?.meta?.total ?? 0} aset tersimpan
          </span>
        </div>
        {actionError && <ErrorBox message={actionError} />}{" "}
        {error ? (
          <ErrorBox message={error} onRetry={refresh} />
        ) : loading ? (
          <div className="loading-panel">
            <Spinner />
          </div>
        ) : !result?.data.length ? (
          <Empty
            title="Pustaka Anda masih kosong"
            description="Unggah gambar untuk artikel, banner, dan galeri."
          >
            <button
              className="button secondary"
              onClick={() => setUpload(true)}
            >
              <Icon name="upload" />
              Unggah gambar pertama
            </button>
          </Empty>
        ) : (
          <div className="media-grid">
            {result.data.map((row) => (
              <article className="media-card" key={String(row.id)}>
                <Link className="media-preview" href={"/cms/media/" + row.id}>
                  <img
                    src={mediaURL(row)}
                    alt={labelOf(row.alt_text) || labelOf(row.original_name)}
                    loading="lazy"
                  />
                </Link>
                <div className="media-card-info">
                  <Link href={"/cms/media/" + row.id}>
                    <strong>{labelOf(row.original_name)}</strong>
                    <small>
                      {labelOf(row.mime_type)
                        .replace("image/", "")
                        .toUpperCase()}{" "}
                      <span>·</span> {(Number(row.file_size) / 1024).toFixed(0)}{" "}
                      KB
                    </small>
                  </Link>
                  <button
                    className="icon-button destructive"
                    aria-label={"Hapus " + titleOf(row)}
                    onClick={() => setDeleting(row)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination meta={result?.meta} page={page} onPage={setPage} />
      </section>
      {upload && (
        <UploadDialog onClose={() => setUpload(false)} onUploaded={refresh} />
      )}{" "}
      {deleting && (
        <Confirm
          title="Hapus gambar?"
          description={
            "“" +
            titleOf(deleting) +
            "” akan dihapus. Gambar yang masih dipakai konten juga akan hilang dari website; pastikan sudah diganti terlebih dahulu."
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
export function RelationPicker({
  id,
  resource,
  value,
  onChange,
  label,
  isMedia = false,
  required = false,
}: {
  id: string;
  resource: string;
  value: string;
  onChange: (id: string) => void;
  label: string;
  isMedia?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState(""),
    [upload, setUpload] = useState(false);
  const selected = useRemote<RecordData>(
    value ? "/api/cms/" + resource + "/" + value : null,
  );
  const listing = useRemote<RecordData[]>(
    open
      ? "/api/cms/" +
          resource +
          "?limit=12&page=" +
          page +
          "&search=" +
          encodeURIComponent(search)
      : null,
  );
  return (
    <div className="relation-picker">
      {value ? (
        <div className="selected-relation">
          {isMedia && selected.result && (
            <img
              src={mediaURL(selected.result.data)}
              alt={labelOf(selected.result.data.alt_text)}
            />
          )}
          <span>
            {selected.loading
              ? "Memuat…"
              : selected.result
                ? titleOf(selected.result.data)
                : "Referensi tidak tersedia"}
            <small>
              {selected.error
                ? "Pilih ulang jika data sudah dihapus."
                : isMedia
                  ? "Dipilih dari pustaka media"
                  : "Kategori terpilih"}
            </small>
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={"Hapus pilihan " + label}
            onClick={() => onChange("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="button select-media"
        id={id}
        aria-haspopup="dialog"
        aria-label={(value ? "Ganti pilihan " : "Pilih ") + label.toLowerCase()}
        onClick={() => setOpen(true)}
      >
        <Icon name={isMedia ? "image" : "tags"} />
        {value ? "Ganti pilihan" : "Pilih " + label.toLowerCase()}
        {required && <span className="coral-text">*</span>}
      </button>
      {open && (
        <Modal
          title={"Pilih " + label.toLowerCase()}
          wide
          onClose={() => setOpen(false)}
        >
          <div className="picker-toolbar">
            <div className="search-input">
              <Icon name="search" size={16} />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Cari…"
                aria-label="Cari pilihan"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setSearch(draft);
                    setPage(1);
                  }
                }}
              />
              <button
                type="button"
                className="search-submit"
                onClick={() => {
                  setSearch(draft);
                  setPage(1);
                }}
              >
                Cari
              </button>
            </div>
            {isMedia && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setUpload(true)}
              >
                <Icon name="upload" />
                Unggah
              </button>
            )}
          </div>
          {listing.error ? (
            <ErrorBox message={listing.error} onRetry={listing.refresh} />
          ) : listing.loading ? (
            <Spinner />
          ) : !listing.result?.data.length ? (
            <Empty
              title="Belum ada pilihan"
              description={
                isMedia
                  ? "Unggah gambar terlebih dahulu."
                  : "Tambahkan kategori di menu Kategori artikel."
              }
            />
          ) : (
            <div className={isMedia ? "picker-grid" : "picker-list"}>
              {listing.result.data.map((row) => (
                <button
                  type="button"
                  className={
                    "picker-item " + (row.id === value ? "selected" : "")
                  }
                  key={String(row.id)}
                  onClick={() => {
                    onChange(String(row.id));
                    setOpen(false);
                  }}
                >
                  {isMedia && (
                    <img
                      src={mediaURL(row)}
                      alt={labelOf(row.alt_text) || titleOf(row)}
                      loading="lazy"
                    />
                  )}
                  <span>{titleOf(row)}</span>
                  {row.id === value && <Icon name="check" size={16} />}
                </button>
              ))}
            </div>
          )}
          <Pagination
            meta={listing.result?.meta}
            page={page}
            onPage={setPage}
          />
        </Modal>
      )}
      {upload && (
        <UploadDialog
          onClose={() => setUpload(false)}
          onUploaded={listing.refresh}
        />
      )}
    </div>
  );
}
