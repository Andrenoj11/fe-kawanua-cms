"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User, RecordData } from "@/lib/types";
import { buildPayload, contactOptions, initialValues } from "@/lib/resources";
import type { Resource } from "@/lib/resources";
import {
  api,
  ApiError,
  dateLabel,
  labelOf,
  mediaURL,
  titleOf,
} from "@/lib/http";
import { useRemote } from "@/lib/use-remote";
import { Badge, Confirm, ErrorBox, Icon, Spinner } from "./ui";
import { Fields } from "./fields";
import { NestedContent } from "./nested-content";
export function ResourceEditor({
  resource,
  id,
  user,
}: {
  resource: Resource;
  id?: string;
  user: User;
}) {
  const router = useRouter();
  const isNew = id === "new";
  const url = "/api/cms/" + resource.key + (resource.singleton ? "" : "/" + id);
  const remote = useRemote<RecordData>(isNew ? null : url);
  const [record, setRecord] = useState<RecordData | null>(null),
    [values, setValues] = useState<RecordData>(() =>
      initialValues(resource.fields),
    ),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [confirmation, setConfirmation] = useState<
      "delete" | "publish" | "unpublish" | null
    >(null),
    [messageStatus, setMessageStatus] = useState("");
  useEffect(() => {
    if (remote.result) {
      setRecord(remote.result.data);
      setValues(initialValues(resource.fields, remote.result.data));
      setMessageStatus(labelOf(remote.result.data.status));
      setDirty(false);
    }
  }, [remote.result, resource.fields]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setNotice("");
    setErrors((v) => ({ ...v, [key]: "" }));
  };
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    const parsed = buildPayload(resource.fields, values, user.role, isNew);
    // Backend url validators require absolute URLs for website and social settings.
    for (const f of resource.fields.filter(
      (f) =>
        f.type === "url" &&
        f.name.endsWith("_url") &&
        !["button_url"].includes(f.name),
    )) {
      if (
        parsed.payload[f.name] &&
        !/^https?:\/\//i.test(String(parsed.payload[f.name]))
      )
        parsed.errors[f.name] = "Gunakan alamat lengkap http:// atau https://.";
    }
    setErrors(parsed.errors);
    if (Object.keys(parsed.errors).length) {
      setError("Periksa kolom yang ditandai sebelum menyimpan.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<RecordData>(
        isNew ? "/api/cms/" + resource.key : url,
        {
          method: isNew ? "POST" : "PUT",
          body: JSON.stringify(parsed.payload),
        },
      );
      setRecord(result.data);
      setValues(initialValues(resource.fields, result.data));
      setDirty(false);
      setNotice("Perubahan berhasil disimpan.");
      if (isNew) router.replace("/cms/" + resource.key + "/" + result.data.id);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }
  async function action() {
    if (!confirmation) return;
    setBusy(true);
    setError("");
    try {
      if (confirmation === "delete") {
        await api(url, { method: "DELETE" });
        router.push("/cms/" + resource.key);
      } else {
        const result = await api<RecordData>(url + "/" + confirmation, {
          method: "POST",
        });
        setRecord(result.data);
        setNotice(
          confirmation === "publish"
            ? "Artikel berhasil diterbitkan."
            : "Artikel dikembalikan ke draf.",
        );
      }
      setConfirmation(null);
    } catch (e) {
      setError((e as Error).message);
      setConfirmation(null);
    } finally {
      setBusy(false);
    }
  }
  async function updateStatus() {
    setBusy(true);
    setError("");
    try {
      const r = await api<RecordData>(url + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status: messageStatus }),
      });
      setRecord(r.data);
      setNotice("Status pesan diperbarui.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!isNew && remote.loading)
    return (
      <div className="panel loading-panel">
        <Spinner />
      </div>
    );
  if (remote.error)
    return <ErrorBox message={remote.error} onRetry={remote.refresh} />;
  if (isNew && (resource.readonly || resource.key === "media"))
    return (
      <ErrorBox message="Gunakan halaman daftar untuk mengelola data ini." />
    );
  return (
    <>
      <div className="editor-breadcrumb">
        <Link href={"/cms/" + (resource.singleton ? "" : resource.key)}>
          <Icon name="back" size={15} />
          {resource.singleton ? "Dashboard" : resource.title}
        </Link>
        <span>/</span>
        <span>
          {resource.singleton ? "Pengaturan" : isNew ? "Tambah baru" : "Detail"}
        </span>
      </div>
      <div className="page-heading editor-heading">
        <div>
          <h1>
            {resource.singleton
              ? resource.title
              : isNew
                ? "Tambah " + resource.singular
                : resource.readonly
                  ? "Detail pesan"
                  : "Edit " + resource.singular}
            <span className="coral-text">.</span>
          </h1>
          <p>
            {isNew
              ? "Mulai cerita baru dan simpan ketika sudah siap."
              : record
                ? titleOf(record)
                : resource.description}
          </p>
        </div>
        <div className="editor-heading-status">
          {record?.status ? <Badge value={record.status} /> : null}
          {dirty && (
            <span className="unsaved">
              <span />
              Belum disimpan
            </span>
          )}
        </div>
      </div>
      {notice && (
        <div className="notice" role="status">
          <Icon name="success" />
          {notice}
        </div>
      )}
      {error && <ErrorBox message={error} />}
      {resource.readonly && record ? (
        <div className="editor-grid">
          <section className="panel message-detail">
            <div className="message-sender">
              <div className="avatar">
                {labelOf(record.name).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <strong>{labelOf(record.name)}</strong>
                <a href={"mailto:" + encodeURIComponent(labelOf(record.email))}>
                  {labelOf(record.email)}
                </a>
              </div>
              <span>{dateLabel(record.created_at)}</span>
            </div>
            <h2>{labelOf(record.subject)}</h2>
            <p className="message-body">{labelOf(record.message)}</p>
            {!!record.phone && (
              <p className="muted">Telepon: {labelOf(record.phone)}</p>
            )}
          </section>
          <aside className="panel editor-sidebar">
            <h3>Tindak lanjut pesan</h3>
            <p className="muted">Tandai status setelah ditangani oleh tim.</p>
            <label className="field">
              <span>Status</span>
              <select
                value={messageStatus}
                onChange={(e) => setMessageStatus(e.target.value)}
              >
                {contactOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button primary"
              disabled={busy}
              onClick={updateStatus}
            >
              <Icon name="check" />
              Perbarui status
            </button>
            <p className="field-hint">
              Balasan dikirim melalui email Anda. CMS mencatat status
              penanganannya.
            </p>
          </aside>
        </div>
      ) : (
        <form onSubmit={save} noValidate className="editor-grid">
          <section className="panel form-panel">
            {resource.key === "media" && record && (
              <div className="detail-media">
                <img
                  src={mediaURL(record)}
                  alt={
                    labelOf(record.alt_text) || labelOf(record.original_name)
                  }
                />
                <div>
                  <strong>{labelOf(record.original_name)}</strong>
                  <span>
                    {labelOf(record.mime_type)} ·{" "}
                    {(Number(record.file_size) / 1024).toFixed(0)} KB
                  </span>
                </div>
              </div>
            )}
            <div className="panel-heading">
              <div>
                <h2>
                  {resource.singleton
                    ? "Informasi website"
                    : resource.key === "media"
                      ? "Informasi media"
                      : "Informasi " + resource.singular}
                </h2>
                <p>Kolom bertanda * wajib diisi.</p>
              </div>
              <Icon name={resource.icon} />
            </div>
            <div className="form-content">
              <Fields
                fields={resource.fields}
                values={values}
                errors={errors}
                onChange={change}
                role={user.role}
                isNew={isNew}
              />
            </div>
          </section>
          <aside className="editor-side-stack">
            <section className="panel editor-sidebar">
              <h3>
                {resource.singleton ? "Simpan pengaturan" : "Simpan perubahan"}
              </h3>
              <p className="muted">
                {resource.key === "articles"
                  ? "Artikel baru akan disimpan sebagai draf sebelum diterbitkan."
                  : "Pastikan seluruh informasi sudah sesuai sebelum disimpan."}
              </p>
              <button
                className="button primary full"
                disabled={busy}
                type="submit"
              >
                <Icon
                  name={busy ? "loader" : "save"}
                  className={busy ? "spin" : ""}
                />
                {busy
                  ? "Menyimpan…"
                  : isNew
                    ? "Simpan " + resource.singular
                    : "Simpan perubahan"}
              </button>
              {resource.key === "articles" &&
                !isNew &&
                user.role === "ADMIN" && (
                  <button
                    className="button secondary full"
                    type="button"
                    disabled={busy || dirty}
                    title={
                      dirty ? "Simpan perubahan terlebih dahulu" : undefined
                    }
                    onClick={() =>
                      setConfirmation(
                        record?.status === "PUBLISHED"
                          ? "unpublish"
                          : "publish",
                      )
                    }
                  >
                    <Icon
                      name={
                        record?.status === "PUBLISHED" ? "files" : "external"
                      }
                    />
                    {record?.status === "PUBLISHED"
                      ? "Kembalikan ke draf"
                      : "Terbitkan artikel"}
                  </button>
                )}
              {resource.key === "articles" && user.role === "EDITOR" && (
                <p className="field-hint">
                  Administrator akan meninjau dan menerbitkan artikel.
                </p>
              )}
              {!isNew && !resource.singleton && (
                <>
                  <div className="sidebar-rule" />
                  <div className="record-dates">
                    <span>Dibuat</span>
                    <strong>{dateLabel(record?.created_at)}</strong>
                    <span>Diperbarui</span>
                    <strong>{dateLabel(record?.updated_at)}</strong>
                  </div>
                  <button
                    type="button"
                    className="text-button destructive"
                    disabled={
                      busy || (resource.key === "users" && id === user.id)
                    }
                    onClick={() => setConfirmation("delete")}
                  >
                    <Icon name="trash" size={15} />
                    Hapus {resource.singular}
                  </button>
                </>
              )}
            </section>
            <div className="editor-tip">
              <Icon name="book" size={19} />
              <div>
                <strong>Detail kecil, dampak besar.</strong>
                <p>
                  {resource.key === "media"
                    ? "Teks alternatif membantu semua pembaca memahami gambar Anda."
                    : "Judul yang jelas dan gambar yang relevan membuat cerita lebih mudah ditemukan."}
                </p>
              </div>
            </div>
          </aside>
        </form>
      )}
      {!isNew &&
        id &&
        ["pages", "galleries", "menus"].includes(resource.key) && (
          <NestedContent
            kind={resource.key as "pages" | "galleries" | "menus"}
            parentID={id}
            user={user}
          />
        )}
      {confirmation && (
        <Confirm
          title={
            confirmation === "delete"
              ? "Hapus " + resource.singular + "?"
              : confirmation === "publish"
                ? "Terbitkan artikel?"
                : "Kembalikan ke draf?"
          }
          description={
            confirmation === "delete"
              ? "Data akan dihapus. Periksa terlebih dahulu apakah masih digunakan konten lain."
              : confirmation === "publish"
                ? "Artikel akan tersedia untuk pengunjung website."
                : "Artikel akan disembunyikan dari API publik."
          }
          danger={confirmation === "delete"}
          busy={busy}
          onConfirm={action}
          onClose={() => setConfirmation(null)}
        />
      )}
    </>
  );
}
