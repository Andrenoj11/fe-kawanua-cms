import assert from "node:assert/strict";
const base = process.env.CMS_TEST_URL || "http://127.0.0.1:3000";
const email = process.env.CMS_TEST_EMAIL;
const password = process.env.CMS_TEST_PASSWORD;
if (!email || !password)
  throw new Error(
    "Set CMS_TEST_EMAIL dan CMS_TEST_PASSWORD ke akun ADMIN untuk tes integrasi.",
  );
let jar = new Map();
function cookies(response) {
  for (const line of response.headers.getSetCookie()) {
    const first = line.split(";")[0];
    const idx = first.indexOf("=");
    const key = first.slice(0, idx),
      value = first.slice(idx + 1);
    if (value) jar.set(key, value);
    else jar.delete(key);
  }
}
async function request(path, method = "GET", body, auth = true) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      ...(auth
        ? { Cookie: [...jar].map(([k, v]) => k + "=" + v).join("; ") }
        : {}),
      ...(body instanceof FormData
        ? {}
        : body
          ? { "Content-Type": "application/json" }
          : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  cookies(response);
  const data = await response.json();
  return { status: response.status, data, response };
}
const cleanup = [];
const stamp = Date.now();
async function create(key, body) {
  const r = await request("/api/cms/" + key, "POST", body);
  assert.equal(r.status, 201, key + " create: " + JSON.stringify(r.data));
  cleanup.push("/api/cms/" + key + "/" + r.data.data.id);
  return r.data.data;
}
try {
  let r = await request("/api/cms/articles", "GET", undefined, false);
  assert.equal(r.status, 401);
  r = await request("/api/auth/login", "POST", { email, password });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.data.role, "ADMIN");
  assert.equal(r.data.data.password_hash, undefined);
  assert.equal(r.data.data.access_token, undefined);
  const setCookies = r.response.headers.getSetCookie();
  assert.ok(setCookies.some((c) => c.includes("HttpOnly")));
  assert.ok(setCookies.some((c) => c.includes("SameSite=lax")));
  r = await request("/api/auth/session");
  assert.equal(r.status, 200);
  assert.equal(r.data.data.email, email);
  // Simulate expired access while keeping the valid refresh cookie. Concurrent
  // browser requests must share one rotation, including across route handlers.
  jar.delete("kawanua_access");
  jar.set("kawanua_expiry", "0");
  const expiredCookies = [...jar].map(([k, v]) => k + "=" + v).join("; ");
  const rotated = await Promise.all(
    ["/api/auth/session", "/api/cms/articles", "/api/cms/media"].map((path) =>
      fetch(base + path, { headers: { Cookie: expiredCookies } }),
    ),
  );
  const refreshValues = new Set();
  for (const response of rotated) {
    assert.equal(response.status, 200, "concurrent refresh must succeed");
    const line = response.headers
      .getSetCookie()
      .find((c) => c.startsWith("kawanua_refresh="));
    assert.ok(line);
    refreshValues.add(line.split(";")[0]);
    cookies(response);
    await response.json();
  }
  assert.equal(
    refreshValues.size,
    1,
    "concurrent routes must return the same rotated session",
  );
  r = await request("/api/auth/session");
  assert.equal(r.status, 200);
  console.log(
    "PASS: automatic access-token renewal and concurrent refresh across session/content routes.",
  );
  const blocked = await fetch(base + "/api/cms/articles", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      Cookie: [...jar].map(([k, v]) => k + "=" + v).join("; "),
      "Content-Type": "application/json",
    },
    body: '{"title":"Blocked"}',
  });
  assert.equal(blocked.status, 403);
  const category = await create("article-categories", {
    name: "CMS Test " + stamp,
    sort_order: 0,
    is_active: true,
  });
  const article = await create("articles", {
    title: "CMS integration " + stamp,
    content: "Isi artikel integrasi",
    category_id: category.id,
    is_featured: true,
  });
  assert.equal(article.status, "DRAFT");
  r = await request("/api/cms/articles/" + article.id, "PUT", {
    title: article.title,
    slug: article.slug,
    content: "Isi yang diperbarui",
    category_id: category.id,
    is_featured: false,
  });
  assert.equal(r.status, 200);
  r = await request("/api/cms/articles/" + article.id + "/publish", "POST");
  assert.equal(r.status, 200);
  assert.equal(r.data.data.status, "PUBLISHED");
  r = await request("/api/cms/articles/" + article.id + "/unpublish", "POST");
  assert.equal(r.status, 200);
  assert.equal(r.data.data.status, "DRAFT");
  const page = await create("pages", {
    name: "CMS page " + stamp,
    title: "Halaman uji",
    status: "DRAFT",
  });
  r = await request("/api/cms/pages/" + page.id + "/sections", "POST", {
    section_key: "test",
    section_type: "content",
    title: "Bagian uji",
    content: { description: "Hello" },
    sort_order: 0,
    is_active: true,
  });
  assert.equal(r.status, 201);
  cleanup.push("/api/cms/page-sections/" + r.data.data.id);
  r = await request("/api/cms/pages/" + page.id + "/sections");
  assert.equal(r.data.data.length, 1);
  const gallery = await create("galleries", {
    title: "CMS gallery " + stamp,
    status: "DRAFT",
  });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jStcAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = new FormData();
  upload.append("file", new Blob([png], { type: "image/png" }), "cms-test.png");
  upload.append("alt_text", "Integration test");
  r = await request("/api/cms/media", "POST", upload);
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const media = r.data.data;
  cleanup.push("/api/cms/media/" + media.id);
  r = await request("/api/cms/media/" + media.id, "PUT", {
    alt_text: "Alt updated",
    caption: "CMS test",
  });
  assert.equal(r.status, 200);
  const image = await fetch(
    base + "/api/uploads/" + encodeURIComponent(media.file_name),
  );
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type"), /image\/png/);
  r = await request("/api/cms/galleries/" + gallery.id + "/items", "POST", {
    items: [{ media_id: media.id, caption: "Test", sort_order: 0 }],
  });
  assert.equal(r.status, 201);
  await create("banners", {
    title: "CMS banner " + stamp,
    desktop_media_id: media.id,
    is_active: false,
    sort_order: 0,
  });
  await create("partners", {
    name: "CMS partner " + stamp,
    website_url: "https://example.com",
    is_active: false,
    sort_order: 0,
  });
  const menu = await create("menus", {
    name: "CMS menu " + stamp,
    location: "TEST_" + stamp,
  });
  r = await request("/api/cms/menus/" + menu.id + "/items", "POST", {
    label: "Link",
    url: "/test",
    target: "_self",
    sort_order: 0,
    is_active: true,
  });
  assert.equal(r.status, 201);
  cleanup.push("/api/cms/menus/" + menu.id + "/items/" + r.data.data.id);
  for (const key of [
    "articles",
    "article-categories",
    "banners",
    "pages",
    "media",
    "galleries",
    "partners",
    "menus",
    "contact-messages",
    "users",
    "settings",
  ]) {
    r = await request("/api/cms/" + key);
    assert.equal(r.status, 200, key + " list");
  }
  console.log(
    "PASS: login HttpOnly, session, CSRF, all lists, article CRUD/publish, sections, gallery, media upload/preview, partners and menus.",
  );
  const editorEmail = `cms-test-${stamp}@example.com`;
  const editorPassword = "CMS-local-test-" + stamp;
  await create("users", {
    name: "CMS Test Editor",
    email: editorEmail,
    password: editorPassword,
    role: "EDITOR",
    is_active: true,
  });
  const adminJar = jar;
  jar = new Map();
  try {
    r = await request("/api/auth/login", "POST", {
      email: editorEmail,
      password: editorPassword,
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.data.role, "EDITOR");
    for (const path of ["/api/cms/users", "/api/cms/settings"]) {
      r = await request(path);
      assert.equal(r.status, 403, "editor must not access " + path);
    }
    r = await request("/api/cms/articles/" + article.id + "/publish", "POST");
    assert.equal(r.status, 403, "editor cannot publish");
    r = await request("/api/cms/articles/" + article.id, "PUT", {
      title: article.title,
      slug: article.slug,
      content: "Editor update",
      category_id: category.id,
      is_featured: false,
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.data.status, "DRAFT");
    console.log(
      "PASS: EDITOR can edit drafts but cannot publish, manage users, or change settings.",
    );
  } finally {
    await request("/api/auth/logout", "POST").catch(() => {});
    jar = adminJar;
  }
} finally {
  for (const path of cleanup.reverse()) {
    const result = await request(path, "DELETE").catch(() => null);
    if (result && result.status !== 200)
      console.error("Cleanup requires attention:", path, result.status);
  }
  await request("/api/auth/logout", "POST");
  const after = await request("/api/auth/session");
  assert.equal(after.status, 401);
  console.log(
    "PASS: logout clears the session. Only test records were removed.",
  );
}
