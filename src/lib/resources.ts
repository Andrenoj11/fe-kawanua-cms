import type { RecordData, Role } from "./types";
export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "email"
  | "password"
  | "url"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "select"
  | "media"
  | "relation"
  | "json";
export type Field = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  max?: number;
  min?: number;
  hint?: string;
  options?: { value: string; label: string }[];
  resource?: string;
  default?: unknown;
  admin?: boolean;
  wide?: boolean;
  section?: string;
};
export type Resource = {
  key: string;
  title: string;
  singular: string;
  description: string;
  icon: string;
  fields: Field[];
  columns: { key: string; label: string }[];
  search?: boolean;
  status?: boolean;
  admin?: boolean;
  singleton?: boolean;
  readonly?: boolean;
};
const field = (
  name: string,
  label: string,
  extra: Partial<Field> = {},
): Field => ({ name, label, ...extra });
const title = field("title", "Judul", { required: true, max: 255, wide: true });
const name = field("name", "Nama", { required: true, max: 120 });
const slug = field("slug", "Slug", {
  max: 140,
  hint: "Kosongkan untuk membuat otomatis dari judul atau nama.",
});
const description = field("description", "Deskripsi", {
  type: "textarea",
  max: 2000,
  wide: true,
});
const active = field("is_active", "Aktif", { type: "boolean", default: true });
const order = field("sort_order", "Urutan tampil", {
  type: "number",
  default: 0,
  hint: "Angka lebih kecil ditampilkan lebih dahulu.",
});
export const statusOptions = [
  { value: "DRAFT", label: "Draf" },
  { value: "PUBLISHED", label: "Terbit" },
  { value: "ARCHIVED", label: "Arsip" },
];
export const contactOptions = [
  { value: "NEW", label: "Baru" },
  { value: "READ", label: "Dibaca" },
  { value: "REPLIED", label: "Dibalas" },
  { value: "ARCHIVED", label: "Arsip" },
];
const status = field("status", "Status publikasi", {
  type: "select",
  options: statusOptions,
  default: "DRAFT",
  admin: true,
});
const seo = [
  field("seo_title", "Judul SEO", { max: 255, section: "Optimasi pencarian" }),
  field("seo_description", "Deskripsi SEO", {
    type: "textarea",
    max: 500,
    wide: true,
    section: "Optimasi pencarian",
  }),
];
const media = (name: string, label: string): Field =>
  field(name, label, { type: "media" });
const dates = [{ key: "updated_at", label: "Diperbarui" }];
export const resources: Resource[] = [
  {
    key: "articles",
    title: "Artikel & berita",
    singular: "artikel",
    icon: "newspaper",
    description: "Kelola cerita, berita, dan suara dari tanah Kawanua.",
    search: true,
    status: true,
    fields: [
      title,
      { ...slug, max: 280 },
      field("category_id", "Kategori", {
        type: "relation",
        resource: "article-categories",
      }),
      field("excerpt", "Ringkasan", {
        type: "textarea",
        max: 1000,
        wide: true,
      }),
      field("content", "Isi artikel", {
        type: "markdown",
        required: true,
        wide: true,
      }),
      media("thumbnail_media_id", "Gambar utama"),
      field("is_featured", "Artikel unggulan", {
        type: "boolean",
        hint: "Tampilkan artikel pada pilihan unggulan.",
      }),
      ...seo,
    ],
    columns: [
      { key: "title", label: "Artikel" },
      { key: "status", label: "Status" },
      { key: "is_featured", label: "Unggulan" },
      ...dates,
    ],
  },
  {
    key: "article-categories",
    title: "Kategori artikel",
    singular: "kategori",
    icon: "tags",
    description: "Rapikan artikel ke dalam topik yang mudah ditemukan.",
    search: true,
    fields: [name, slug, description, order, active],
    columns: [
      { key: "name", label: "Kategori" },
      { key: "slug", label: "Slug" },
      { key: "is_active", label: "Status" },
      { key: "sort_order", label: "Urutan" },
    ],
  },
  {
    key: "banners",
    title: "Hero & banner",
    singular: "banner",
    icon: "panels",
    description: "Buat kesan pertama yang kuat di halaman utama.",
    fields: [
      title,
      field("subtitle", "Subjudul", { max: 500, wide: true }),
      media("desktop_media_id", "Gambar desktop"),
      media("mobile_media_id", "Gambar mobile"),
      field("button_text", "Teks tombol", { max: 100 }),
      field("button_url", "Tautan tombol", {
        type: "url",
        hint: "Alamat https:// atau jalur internal seperti /tentang.",
      }),
      order,
      active,
      field("starts_at", "Mulai tampil", { type: "datetime" }),
      field("ends_at", "Selesai tampil", { type: "datetime" }),
    ],
    columns: [
      { key: "title", label: "Banner" },
      { key: "is_active", label: "Status" },
      { key: "sort_order", label: "Urutan" },
      { key: "ends_at", label: "Selesai" },
    ],
  },
  {
    key: "pages",
    title: "Halaman",
    singular: "halaman",
    icon: "files",
    description: "Atur halaman website dan susun setiap bagiannya.",
    fields: [name, slug, title, status, ...seo],
    columns: [
      { key: "name", label: "Halaman" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
      ...dates,
    ],
  },
  {
    key: "media",
    title: "Pustaka media",
    singular: "media",
    icon: "image",
    description: "Semua gambar dan aset visual, dalam satu ruang.",
    search: true,
    fields: [
      field("alt_text", "Teks alternatif", {
        max: 255,
        hint: "Deskripsikan isi gambar untuk aksesibilitas.",
      }),
      field("caption", "Keterangan", {
        type: "textarea",
        max: 1000,
        wide: true,
      }),
    ],
    columns: [
      { key: "original_name", label: "Nama berkas" },
      { key: "mime_type", label: "Jenis" },
      { key: "file_size", label: "Ukuran" },
      ...dates,
    ],
  },
  {
    key: "galleries",
    title: "Galeri",
    singular: "galeri",
    icon: "gallery",
    description: "Abadikan kegiatan dan cerita komunitas dalam gambar.",
    fields: [
      title,
      { ...slug, max: 280 },
      { ...description, max: 3000 },
      media("cover_media_id", "Sampul galeri"),
      status,
      field("event_date", "Tanggal kegiatan", { type: "date" }),
    ],
    columns: [
      { key: "title", label: "Galeri" },
      { key: "status", label: "Status" },
      { key: "event_date", label: "Kegiatan" },
      ...dates,
    ],
  },
  {
    key: "partners",
    title: "Mitra & sponsor",
    singular: "mitra",
    icon: "handshake",
    description: "Tampilkan kolaborasi yang mendukung Kawanua Media.",
    fields: [
      { ...name, max: 255 },
      media("logo_media_id", "Logo mitra"),
      field("website_url", "Website", {
        type: "url",
        hint: "Gunakan alamat lengkap https://.",
      }),
      description,
      order,
      active,
    ],
    columns: [
      { key: "name", label: "Mitra" },
      { key: "is_active", label: "Status" },
      { key: "sort_order", label: "Urutan" },
      ...dates,
    ],
  },
  {
    key: "menus",
    title: "Navigasi",
    singular: "menu",
    icon: "navigation",
    description: "Bantu pembaca menemukan jalan ke setiap cerita.",
    fields: [
      name,
      field("location", "Lokasi", {
        required: true,
        max: 80,
        hint: "Contoh: MAIN atau FOOTER.",
      }),
    ],
    columns: [
      { key: "name", label: "Menu" },
      { key: "location", label: "Lokasi" },
      ...dates,
    ],
  },
  {
    key: "contact-messages",
    title: "Kotak masuk",
    singular: "pesan",
    icon: "inbox",
    description: "Dengarkan pertanyaan dan masukan dari pembaca.",
    status: true,
    readonly: true,
    fields: [],
    columns: [
      { key: "subject", label: "Pesan" },
      { key: "name", label: "Pengirim" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Diterima" },
    ],
  },
  {
    key: "users",
    title: "Tim redaksi",
    singular: "pengguna",
    icon: "users",
    description: "Kelola anggota tim dan hak akses ruang redaksi.",
    admin: true,
    search: true,
    fields: [
      { ...name, min: 2 },
      field("email", "Email", { type: "email", required: true, max: 255 }),
      field("password", "Kata sandi", {
        type: "password",
        min: 10,
        max: 72,
        hint: "Minimal 10 karakter. Saat mengedit, kosongkan untuk mempertahankan kata sandi.",
      }),
      field("role", "Peran", {
        type: "select",
        required: true,
        default: "EDITOR",
        options: [
          { value: "ADMIN", label: "Administrator" },
          { value: "EDITOR", label: "Editor" },
        ],
      }),
      active,
    ],
    columns: [
      { key: "name", label: "Anggota" },
      { key: "email", label: "Email" },
      { key: "role", label: "Peran" },
      { key: "is_active", label: "Status" },
    ],
  },
  {
    key: "settings",
    title: "Pengaturan website",
    singular: "pengaturan",
    icon: "settings",
    description: "Identitas, kontak, dan informasi utama Kawanua Media.",
    admin: true,
    singleton: true,
    fields: [
      field("site_name", "Nama website", {
        required: true,
        max: 255,
        section: "Identitas website",
      }),
      field("site_tagline", "Tagline", {
        max: 500,
        section: "Identitas website",
      }),
      media("logo_media_id", "Logo website"),
      media("favicon_media_id", "Favicon"),
      field("contact_email", "Email kontak", {
        type: "email",
        max: 255,
        section: "Kontak & alamat",
      }),
      field("contact_phone", "Telepon", {
        max: 100,
        section: "Kontak & alamat",
      }),
      field("whatsapp", "WhatsApp", { max: 100 }),
      field("address", "Alamat", { type: "textarea", max: 2000, wide: true }),
      ...["facebook", "instagram", "youtube", "tiktok", "linkedin"].map((s) =>
        field(s + "_url", s[0].toUpperCase() + s.slice(1), {
          type: "url",
          section: "Media sosial",
        }),
      ),
      field("footer_text", "Teks footer", {
        type: "textarea",
        max: 2000,
        wide: true,
        section: "Footer & SEO",
      }),
      field("default_seo_title", "Judul SEO default", { max: 255 }),
      field("default_seo_description", "Deskripsi SEO default", {
        type: "textarea",
        max: 500,
        wide: true,
      }),
    ],
    columns: [],
  },
];
export const resourceByKey = (key: string) =>
  resources.find((r) => r.key === key);
export const sectionFields: Field[] = [
  field("section_key", "Kunci bagian", {
    required: true,
    max: 120,
    hint: "Contoh: home_about",
  }),
  field("section_type", "Jenis bagian", {
    required: true,
    max: 120,
    hint: "Contoh: content, statistics, atau features",
  }),
  { ...title, required: false },
  field("subtitle", "Subjudul", { max: 500 }),
  field("content", "Konten JSON", {
    type: "json",
    required: true,
    wide: true,
    default: '{\n  "description": ""\n}',
    hint: "Objek JSON fleksibel sesuai kebutuhan komponen website.",
  }),
  order,
  active,
];
export const galleryItemFields: Field[] = [
  { ...media("media_id", "Gambar"), required: true },
  field("caption", "Keterangan", { type: "textarea", max: 1000 }),
  order,
];
export const menuItemFields: Field[] = [
  field("label", "Label", { required: true, max: 120 }),
  field("url", "Tautan", { required: true, type: "url" }),
  field("parent_id", "Induk menu", { type: "select", options: [] }),
  field("target", "Buka tautan", {
    type: "select",
    default: "_self",
    options: [
      { value: "_self", label: "Tab yang sama" },
      { value: "_blank", label: "Tab baru" },
    ],
  }),
  order,
  active,
];

export function initialValues(
  fields: Field[],
  record: RecordData = {},
): RecordData {
  return Object.fromEntries(
    fields.map((f) => {
      let value =
        record[f.name] ??
        f.default ??
        (f.type === "boolean" ? false : f.type === "number" ? 0 : "");
      if (f.type === "json" && typeof value !== "string")
        value = JSON.stringify(value, null, 2);
      if (f.type === "date" && value) value = String(value).slice(0, 10);
      if (f.type === "datetime" && value) {
        const date = new Date(String(value));
        if (!isNaN(date.valueOf())) {
          const local = new Date(
            date.valueOf() - date.getTimezoneOffset() * 60000,
          ).toISOString();
          value = local.slice(0, 16);
        }
      }
      if (f.type === "password") value = "";
      return [f.name, value];
    }),
  );
}
export function buildPayload(
  fields: Field[],
  values: RecordData,
  role: Role,
  isNew = false,
) {
  const payload: RecordData = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.admin && role !== "ADMIN") continue;
    let value = values[f.name];
    const required = f.required || (f.type === "password" && isNew);
    if (
      required &&
      (value == null || (typeof value === "string" && !value.trim()))
    )
      errors[f.name] = "Kolom ini wajib diisi.";
    if (
      typeof value === "string" &&
      f.type !== "password" &&
      f.type !== "markdown"
    )
      value = value.trim();
    if (typeof value === "string" && value) {
      if (f.max && value.length > f.max)
        errors[f.name] = `Maksimum ${f.max} karakter.`;
      if (f.min && value.length < f.min)
        errors[f.name] = `Minimal ${f.min} karakter.`;
      if (f.type === "password" && new TextEncoder().encode(value).length > 72)
        errors[f.name] = "Kata sandi maksimal 72 byte.";
      if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        errors[f.name] = "Masukkan email yang valid.";
      if (
        f.type === "url" &&
        !/^(https?:\/\/|\/(?!\/)|mailto:|tel:|#)/i.test(value)
      )
        errors[f.name] =
          "Gunakan https://, /jalur-internal, mailto:, atau tel:.";
    }
    if (f.type === "json") {
      try {
        value = JSON.parse(String(value));
        if (!value || typeof value !== "object" || Array.isArray(value))
          throw Error();
      } catch {
        errors[f.name] = "Konten harus berupa objek JSON yang valid.";
        continue;
      }
    } else if (f.type === "number") {
      value = Number(value || 0);
      if (!Number.isSafeInteger(value))
        errors[f.name] = "Masukkan bilangan bulat yang valid.";
    } else if (f.type === "boolean") value = !!value;
    else if (f.type === "date" || f.type === "datetime") {
      const date = value ? new Date(String(value)) : null;
      value = date && !isNaN(date.valueOf()) ? date.toISOString() : null;
    } else if (
      f.type === "media" ||
      f.type === "relation" ||
      f.name === "parent_id"
    )
      value = value || null;
    else if (f.type === "password" && !value) continue;
    else value = value ?? "";
    payload[f.name] = value;
  }
  if (
    payload.starts_at &&
    payload.ends_at &&
    String(payload.ends_at) < String(payload.starts_at)
  )
    errors.ends_at = "Tanggal selesai harus setelah tanggal mulai.";
  return { payload, errors };
}
