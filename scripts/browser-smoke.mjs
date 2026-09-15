import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = process.env.CMS_TEST_URL || "http://127.0.0.1:3000";
const email = process.env.CMS_TEST_EMAIL;
const password = process.env.CMS_TEST_PASSWORD;
if (!email || !password)
  throw new Error(
    "Set CMS_TEST_EMAIL dan CMS_TEST_PASSWORD ke akun ADMIN lokal.",
  );
const macChrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync(macChrome) ? macChrome : undefined);
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  baseURL: base,
});
const page = await context.newPage();
const failures = [];
const cleanup = [];
const stamp = Date.now();
page.on("pageerror", (error) => failures.push(error.message));
async function screenshot(name) {
  await page.screenshot({
    path: `/tmp/kawanua-cms-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
async function savedResource(module, saveLabel) {
  const responsePromise = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/cms/${module}`) && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: saveLabel, exact: true }).click();
  const response = await responsePromise;
  const payload = await response.json();
  assert.equal(response.status(), 201, JSON.stringify(payload));
  cleanup.push(`/api/cms/${module}/${payload.data.id}`);
  await expect(page).toHaveURL(new RegExp(`/cms/${module}/[a-f0-9-]+$`));
  return payload.data;
}
try {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali." }),
  ).toBeVisible();
  await screenshot("login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk ke ruang redaksi" }).click();
  await expect(page).toHaveURL(/\/cms$/);
  await expect(
    page.getByRole("link", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Memuat data…")).toHaveCount(0);
  await screenshot("dashboard");

  await page.goto("/cms/articles/new");
  await page
    .getByRole("button", { name: "Simpan artikel", exact: true })
    .click();
  await expect(page.locator(".error-box")).toContainText("Periksa kolom");
  await page
    .getByLabel("Judul", { exact: false })
    .first()
    .fill("Cerita browser " + stamp);
  await page
    .getByLabel("Isi artikel")
    .fill("## Cerita Kawanua\n\nMerawat **budaya** dan kebersamaan.");
  await page.getByRole("button", { name: "Pratinjau", exact: true }).click();
  await expect(page.locator(".markdown-preview strong")).toHaveText("budaya");
  await screenshot("article");
  await savedResource("articles", "Simpan artikel");
  await page
    .getByRole("button", { name: "Terbitkan artikel", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ya, lanjutkan" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Artikel berhasil diterbitkan",
  );
  await page
    .getByRole("button", { name: "Kembalikan ke draf", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ya, lanjutkan" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Artikel dikembalikan ke draf",
  );

  await page.goto("/cms/pages/new");
  await page.getByLabel("Nama", { exact: false }).fill("Browser page " + stamp);
  await page.locator("#field-title").fill("Halaman browser");
  const createdPage = await savedResource("pages", "Simpan halaman");
  await page
    .getByRole("button", { name: "Tambah bagian", exact: true })
    .click();
  const section = page.getByRole("dialog", { name: "Tambah bagian" });
  await section.getByLabel("Kunci bagian").fill("test_section");
  await section.getByLabel("Jenis bagian").fill("content");
  await section
    .getByLabel("Konten JSON")
    .fill('{"description":"Konten dari browser"}');
  const sectionResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/cms/pages/${createdPage.id}/sections`) &&
      r.request().method() === "POST",
  );
  await section.getByRole("button", { name: "Simpan bagian" }).click();
  const createdSection = await (await sectionResponse).json();
  assert.ok(createdSection.success, JSON.stringify(createdSection));
  cleanup.push(`/api/cms/page-sections/${createdSection.data.id}`);
  await expect(section).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "test_section" })).toBeVisible();

  await page.goto("/cms/media");
  await page.getByRole("button", { name: "Unggah media", exact: true }).click();
  const upload = page.getByRole("dialog", { name: "Unggah media" });
  await upload.getByLabel("Pilih berkas gambar").setInputFiles({
    name: `browser-test-${stamp}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jStcAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await upload.getByLabel("Teks alternatif").fill("Gambar uji browser");
  const mediaResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/cms/media") && r.request().method() === "POST",
  );
  await upload.getByRole("button", { name: "Unggah 1 gambar" }).click();
  const media = await (await mediaResponse).json();
  assert.ok(media.success, JSON.stringify(media));
  cleanup.push(`/api/cms/media/${media.data.id}`);
  await expect(upload).toHaveCount(0);
  const uploadedImage = page.getByRole("img", {
    name: "Gambar uji browser",
    exact: true,
  });
  await expect(uploadedImage).toBeVisible();
  await expect
    .poll(() =>
      uploadedImage.evaluate((el) => el.complete && el.naturalWidth > 0),
    )
    .toBe(true);

  // Nested image picker + upload dialog must not submit the surrounding form.
  await page.goto("/cms/articles/new");
  await page.getByRole("button", { name: "Pilih gambar utama" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Unggah", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Unggah media" })
    .getByRole("button", { name: "Batal" })
    .click();
  const picker = page.getByRole("dialog", { name: "Pilih gambar utama" });
  await expect(picker).toBeVisible();
  await picker
    .getByRole("button", { name: `browser-test-${stamp}.png` })
    .click();
  await expect(picker).toHaveCount(0);
  await expect(page.locator(".selected-relation")).toContainText(
    `browser-test-${stamp}.png`,
  );
  await expect(page.locator(".error-box")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cms");
  await expect(
    page.getByRole("button", { name: "Buka navigasi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await page
    .getByRole("link", { name: "Artikel & berita", exact: true })
    .click();
  await expect(page).toHaveURL(/\/cms\/articles$/);
  await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "No mobile horizontal overflow",
  );
  await screenshot("mobile");
  assert.deepEqual(failures, [], "No uncaught browser exceptions");
  console.log(
    "PASS: desktop/mobile login, article validation/preview/save/publish, nested page sections, image upload/selection, modal focus and responsive navigation.",
  );
} finally {
  for (const path of cleanup.reverse()) {
    const response = await context.request.delete(base + path, {
      headers: { Origin: base },
    });
    if (response.status() !== 200)
      console.error("Cleanup requires attention:", path, response.status());
  }
  await context.request.post(base + "/api/auth/logout", {
    headers: { Origin: base },
  });
  await browser.close();
}
