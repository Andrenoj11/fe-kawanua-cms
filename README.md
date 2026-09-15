# Kawanua Media CMS

CMS Next.js untuk backend Go **be-kawanua**. Antarmuka berbahasa Indonesia, responsif, dan menggunakan data backend sebenarnya.

## Menjalankan lokal

Diperlukan Node.js 22 LTS atau lebih baru dan backend Go pada port 8080.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka **http://127.0.0.1:3000**. Login memakai akun dari seed backend. Kredensial tidak ditanamkan dalam source frontend.

`BACKEND_API_URL=http://127.0.0.1:8080/api/v1` hanya tersedia di server Next.js. `NEXT_PUBLIC_WEBSITE_URL` mengatur tombol Lihat website.

Backend dapat dijalankan dari repo be-kawanua menggunakan instruksi README backend (`make docker-up`, `make migrate-up`, `make seed`, `make run`). Jalankan keduanya sebagai proses terpisah.

## Modul

- Dashboard: jumlah artikel/draf, media, pesan baru, dan artikel terbaru dari API.
- Artikel: CRUD, kategori, gambar utama, unggulan, SEO, editor Markdown dan pratinjau aman, publish/unpublish khusus ADMIN.
- Kategori, banner responsif dengan jadwal, halaman dan bagian JSON, mitra.
- Pustaka media: unggah satu/beberapa berkas, pencarian, pagination, teks alternatif, caption, pemilih gambar, hapus dengan konfirmasi.
- Galeri: metadata dan penambahan item. Backend belum menyediakan edit/hapus item galeri sehingga UI tidak menawarkan tindakan tersebut.
- Navigasi: menu, tautan bertingkat, pengaturan urutan, edit/hapus item, mencegah pemilihan keturunan sebagai induk.
- Kotak masuk: baca pesan dan ubah status. Balasan dikirim melalui email di luar CMS.
- Tim redaksi dan pengaturan website khusus ADMIN.

Filter yang dikirim mengikuti kemampuan backend: pencarian untuk artikel/kategori/media/pengguna; status untuk artikel/pesan; urutan dan unggulan untuk artikel. Daftar lain menggunakan urutan bawaan API.

## Arsitektur

```text
Browser → Next.js Route Handlers → REST API Go → PostgreSQL
```

- `src/app`: App Router, halaman, route API, stylesheet.
- `src/components`: shell, dashboard, list/editor, media, isi halaman/galeri/menu.
- `src/lib/resources.ts`: konfigurasi formulir sesuai DTO backend; tidak menyimpan entitas.
- `src/lib/backend.ts`: koneksi server, cookie HttpOnly, refresh rotation.
- `src/lib/proxy-policy.ts`: allowlist endpoint dan metode backend.
- `tests`: validasi kontrak dan batas proxy.
- `scripts/integration.mjs`: tes integrasi dengan backend aktif.
- `scripts/browser-smoke.mjs`: tes antarmuka desktop/mobile memakai browser terisolasi.

Access/refresh token disimpan sebagai cookie HttpOnly, SameSite=Lax, dan Secure pada production; token tidak dikirim dalam payload JavaScript atau localStorage. Mutasi memeriksa Origin yang sama. Server Next.js meneruskan Bearer token ke Go, memperbarui token yang akan habis, dan menggabungkan refresh serentak dalam satu proses agar rotasi tidak saling membatalkan.

UI menyesuaikan role, tetapi **backend tetap otoritas izin**. Semua API CMS tetap membutuhkan sesi. Aset /uploads mengikuti sifat publik media pada backend. No indexing (robots), frame protection, nosniff, dan font di-host sendiri.

## Konten dan batas integrasi

Isi artikel disimpan sebagai string Markdown dalam kolom `content` backend. Pratinjau tidak mengeksekusi HTML. Frontend publik perlu memakai renderer Markdown yang aman agar format tampil sama. Konten HTML lama tetap tersimpan saat diedit, tetapi ditampilkan sebagai teks di pratinjau.

`PUT` mengirim seluruh field DTO agar field yang tidak berubah tetap terjaga. ID relasi kosong menjadi `null`, angka dan boolean dikirim dengan tipe asli, tanggal dikonversi ke RFC3339, JSON bagian harus berupa objek. Penghapusan media mengikuti backend: gambar yang masih direferensikan juga bisa hilang; selalu ganti referensi sebelum menghapus.

Slug unik dibuat backend. Konflik konkurensi ditampilkan ke pengguna sebagai error 409 untuk dicoba ulang. Perubahan data nyata tidak disimulasikan dan tidak ada data contoh yang dimasukkan otomatis.

## Verifikasi

```bash
npm run lint
npm run typecheck
npm test
npm run build
# Backend dan frontend harus sudah berjalan; gunakan akun ADMIN pengujian.
CMS_TEST_EMAIL=... CMS_TEST_PASSWORD=... npm run test:integration
# Memakai Chrome terpasang di macOS, atau Chromium Playwright di platform lain.
CMS_TEST_EMAIL=... CMS_TEST_PASSWORD=... npm run test:browser
```

Tes integrasi mencakup rotasi sesi serentak dan pembatasan role. Tes browser memeriksa formulir, publish/unpublish, pratinjau, bagian halaman, upload/pemilih gambar, dan navigasi mobile. Kedua tes membuat record berlabel test, lalu menghapus hanya record tersebut. Jangan gunakan database produksi untuk tes. Screenshot browser disimpan di `/tmp/kawanua-cms-*.png`.

Jika Chrome tidak tersedia, jalankan `npx playwright install chromium` sekali atau tentukan `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Gunakan `npm run format` untuk merapikan source dan `npm run format:check` untuk pemeriksaan saja.

## Production

```bash
npm ci
npm run build
npm start
```

Deploy sebagai server Node.js (bukan static export). Gunakan HTTPS agar cookie Secure bekerja; arahkan `BACKEND_API_URL` ke backend. Semua mutasi dari browser lewat origin Next.js sehingga tidak perlu membuka CORS browser langsung ke Go.

Refresh single-flight berlaku per proses; untuk multi-replica dengan trafik serentak, gunakan affinity sesi atau koordinasi refresh terdistribusi. Backend saat ini masih memakai limiter in-memory per IP; karena proxy Next.js berpusat di satu host, login bersama bisa mencapai batas per-IP backend. Atur limiter di backend/gateway sesuai topologi sebelum produksi multi-pengguna.

Referensi: [Route Handlers Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Cookie API](https://nextjs.org/docs/app/api-reference/functions/cookies).
