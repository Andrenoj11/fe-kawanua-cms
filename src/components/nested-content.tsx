"use client";
import { useMemo, useState } from "react";
import type { RecordData, User } from "@/lib/types";
import {
  buildPayload,
  initialValues,
  sectionFields,
  galleryItemFields,
  menuItemFields,
} from "@/lib/resources";
import { api, ApiError, labelOf, titleOf, mediaURL } from "@/lib/http";
import { useRemote } from "@/lib/use-remote";
import { Fields } from "./fields";
import { Badge, Confirm, Empty, ErrorBox, Icon, Modal, Spinner } from "./ui";
type TreeRow = RecordData & { depth?: number };
function GalleryImage({ id }: { id: string }) {
  const { result, loading } = useRemote<RecordData>("/api/cms/media/" + id);
  if (!result)
    return (
      <span className="muted">
        {loading ? "Memuat gambar…" : "Media tidak tersedia"}
      </span>
    );
  return (
    <div className="gallery-image">
      <img
        src={mediaURL(result.data)}
        alt={labelOf(result.data.alt_text) || titleOf(result.data)}
        loading="lazy"
      />
      <strong>{titleOf(result.data)}</strong>
    </div>
  );
}
export function flattenMenu(rows: RecordData[], depth = 0): TreeRow[] {
  return rows.flatMap((row) => [
    { ...row, depth },
    ...flattenMenu(Array.isArray(row.children) ? row.children : [], depth + 1),
  ]);
}
export function NestedContent({
  kind,
  parentID,
  user,
}: {
  kind: "pages" | "galleries" | "menus";
  parentID: string;
  user: User;
}) {
  const isPage = kind === "pages",
    isGallery = kind === "galleries";
  const url =
    "/api/cms/" +
    kind +
    "/" +
    parentID +
    (isPage ? "/sections" : isGallery ? "" : "/items");
  const remote = useRemote<RecordData[] | RecordData>(url);
  const rows = useMemo(() => {
    const data = remote.result?.data;
    if (!data) return [];
    if (isGallery)
      return Array.isArray((data as RecordData).items)
        ? ((data as RecordData).items as RecordData[])
        : [];
    return Array.isArray(data)
      ? kind === "menus"
        ? flattenMenu(data)
        : data
      : [];
  }, [remote.result, isGallery, kind]);
  const [editing, setEditing] = useState<RecordData | null>(null),
    [values, setValues] = useState<RecordData>({}),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState<RecordData | null>(null),
    [notice, setNotice] = useState("");
  const label = isPage ? "bagian" : isGallery ? "gambar" : "tautan";
  const rawFields = isPage
    ? sectionFields
    : isGallery
      ? galleryItemFields
      : menuItemFields;
  const fields = rawFields.map((f) =>
    f.name === "parent_id"
      ? {
          ...f,
          options: rows
            .filter((row) => {
              if (row.id === editing?.id) return false;
              let parent = row.parent_id;
              const seen = new Set();
              while (parent && !seen.has(parent)) {
                if (parent === editing?.id) return false;
                seen.add(parent);
                parent = rows.find((r) => r.id === parent)?.parent_id;
              }
              return true;
            })
            .map((row) => ({
              value: String(row.id),
              label: "— ".repeat(Number(row.depth || 0)) + labelOf(row.label),
            })),
        }
      : f,
  );
  function open(row: RecordData = {}) {
    setEditing(row);
    setValues(initialValues(fields, row));
    setErrors({});
    setError("");
  }
  function itemURL(id: unknown) {
    return isPage
      ? "/api/cms/page-sections/" + id
      : "/api/cms/menus/" + parentID + "/items/" + id;
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { payload, errors: validation } = buildPayload(
      fields,
      values,
      user.role,
      !editing?.id,
    );
    setErrors(validation);
    if (Object.keys(validation).length) {
      setError("Periksa isian yang ditandai.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(
        editing?.id
          ? itemURL(editing.id)
          : "/api/cms/" +
              kind +
              "/" +
              parentID +
              (isPage ? "/sections" : "/items"),
        {
          method: editing?.id ? "PUT" : "POST",
          body: JSON.stringify(isGallery ? { items: [payload] } : payload),
        },
      );
      setEditing(null);
      setNotice("Perubahan " + label + " berhasil disimpan.");
      remote.refresh();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api(itemURL(deleting?.id), { method: "DELETE" });
      setDeleting(null);
      remote.refresh();
      setNotice(label + " berhasil dihapus.");
    } catch (e) {
      setError((e as Error).message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel nested-panel">
      <div className="panel-heading">
        <div>
          <h2>
            {isPage
              ? "Bagian halaman"
              : isGallery
                ? "Isi galeri"
                : "Struktur menu"}
          </h2>
          <p>
            {isPage
              ? "Susun konten dalam bagian yang fleksibel."
              : isGallery
                ? "Tambahkan foto kegiatan dan atur urutannya."
                : "Atur tautan dan hubungan antar menu."}
          </p>
        </div>
        <button className="button secondary" onClick={() => open()}>
          <Icon name="plus" />
          Tambah {label}
        </button>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {error && !editing && <ErrorBox message={error} />}{" "}
      {remote.error ? (
        <ErrorBox message={remote.error} onRetry={remote.refresh} />
      ) : remote.loading ? (
        <div className="loading-panel">
          <Spinner />
        </div>
      ) : !rows.length ? (
        <Empty
          title={"Belum ada " + label}
          description={
            "Tambahkan " + label + " pertama untuk melengkapi konten ini."
          }
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  {isPage ? "Bagian" : isGallery ? "Gambar" : "Label tautan"}
                </th>
                <th>{isPage ? "Jenis" : isGallery ? "Keterangan" : "URL"}</th>
                <th>Urutan</th>
                {!isGallery && (
                  <>
                    <th>Status</th>
                    <th className="cell-right">Tindakan</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  <td>
                    {isGallery ? (
                      <GalleryImage id={String(row.media_id)} />
                    ) : (
                      <div
                        className="row-title"
                        style={{ paddingLeft: Number(row.depth || 0) * 20 }}
                      >
                        <Icon
                          name={
                            isPage
                              ? "files"
                              : isGallery
                                ? "image"
                                : "navigation"
                          }
                          size={16}
                        />
                        <strong>
                          {labelOf(
                            isPage
                              ? row.section_key
                              : isGallery
                                ? row.media_id
                                : row.label,
                          )}
                        </strong>
                      </div>
                    )}
                  </td>
                  <td>
                    {labelOf(
                      isPage
                        ? row.section_type
                        : isGallery
                          ? row.caption
                          : row.url,
                    ) || "—"}
                  </td>
                  <td>{labelOf(row.sort_order)}</td>
                  {!isGallery && (
                    <>
                      <td>
                        <Badge value={row.is_active} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={"Edit " + titleOf(row)}
                            onClick={() => open(row)}
                          >
                            <Icon name="pencil" size={16} />
                          </button>
                          <button
                            className="icon-button destructive"
                            aria-label={"Hapus " + titleOf(row)}
                            onClick={() => setDeleting(row)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isGallery && (
        <p className="integration-note">
          Backend saat ini mendukung penambahan item galeri. Edit dan hapus item
          belum tersedia pada API.
        </p>
      )}
      {editing && (
        <Modal
          title={(editing.id ? "Edit " : "Tambah ") + label}
          wide
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form onSubmit={save} noValidate>
            {error && <ErrorBox message={error} />}
            <Fields
              fields={fields}
              values={values}
              errors={errors}
              onChange={(key, value) =>
                setValues((v) => ({ ...v, [key]: value }))
              }
              role={user.role}
              isNew={!editing.id}
            />
            <div className="form-actions">
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Batal
              </button>
              <button className="button primary" disabled={busy}>
                <Icon
                  name={busy ? "loader" : "save"}
                  className={busy ? "spin" : ""}
                />
                {busy ? "Menyimpan…" : "Simpan " + label}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title={"Hapus " + label + "?"}
          description="Item ini akan dihapus dari susunan konten."
          busy={busy}
          danger
          onClose={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </section>
  );
}
