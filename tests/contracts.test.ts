import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPayload,
  initialValues,
  resourceByKey,
  sectionFields,
} from "../src/lib/resources";
import { allowedRoute } from "../src/lib/proxy-policy";
test("gallery event date preserves calendar date independent of timezone", () => {
  const fields = resourceByKey("galleries")!.fields;
  const values = initialValues(fields, { event_date: "2026-09-15T00:00:00Z" });
  assert.equal(values.event_date, "2026-09-15");
  assert.equal(
    buildPayload(fields, { ...values, title: "Kegiatan" }, "ADMIN").payload
      .event_date,
    "2026-09-15T00:00:00.000Z",
  );
});
test("editor payload never sends a publication status", () => {
  const fields = resourceByKey("pages")!.fields;
  const result = buildPayload(
    fields,
    { name: "Home", title: "Beranda", status: "PUBLISHED" },
    "EDITOR",
  );
  assert.equal(result.payload.status, undefined);
  const admin = buildPayload(
    fields,
    { name: "Home", title: "Beranda", status: "PUBLISHED" },
    "ADMIN",
  );
  assert.equal(admin.payload.status, "PUBLISHED");
});
test("relations use null, booleans and sort numbers match Go DTOs", () => {
  const fields = resourceByKey("banners")!.fields;
  const result = buildPayload(
    fields,
    {
      title: "Judul",
      desktop_media_id: "",
      mobile_media_id: "",
      sort_order: "3",
      is_active: false,
      starts_at: "",
      ends_at: "",
    },
    "ADMIN",
  );
  assert.equal(result.payload.desktop_media_id, null);
  assert.equal(result.payload.sort_order, 3);
  assert.equal(result.payload.is_active, false);
  assert.equal(result.payload.starts_at, null);
});
test("section content must be a JSON object, not null or an array", () => {
  for (const content of ["null", "[]", "bad JSON"]) {
    const result = buildPayload(
      sectionFields,
      { section_key: "home", section_type: "content", content },
      "ADMIN",
    );
    assert.ok(result.errors.content);
  }
  const result = buildPayload(
    sectionFields,
    { section_key: "home", section_type: "content", content: '{"items":[]}' },
    "ADMIN",
  );
  assert.deepEqual(result.payload.content, { items: [] });
});
test("editing user preserves password unless explicitly changed", () => {
  const fields = resourceByKey("users")!.fields;
  const values = initialValues(fields, {
    name: "Admin",
    email: "admin@example.com",
    role: "ADMIN",
    is_active: true,
  });
  const updated = buildPayload(fields, values, "ADMIN");
  assert.equal(updated.payload.password, undefined);
  assert.ok(buildPayload(fields, values, "ADMIN", true).errors.password);
  assert.ok(
    buildPayload(fields, { ...values, password: "é".repeat(40) }, "ADMIN")
      .errors.password,
  );
});
test("scheduled banner cannot end before start", () => {
  const result = buildPayload(
    resourceByKey("banners")!.fields,
    { title: "X", starts_at: "2026-09-16T09:00", ends_at: "2026-09-15T09:00" },
    "ADMIN",
  );
  assert.ok(result.errors.ends_at);
});
test("the API proxy allows only implemented admin route/method combinations", () => {
  const id = "12345678-1234-4234-8234-123456789abc";
  assert.equal(allowedRoute("articles", "POST"), true);
  assert.equal(allowedRoute("articles/" + id + "/publish", "POST"), true);
  assert.equal(allowedRoute("settings", "PUT"), true);
  assert.equal(allowedRoute("galleries/" + id + "/items", "POST"), true);
  assert.equal(
    allowedRoute("galleries/" + id + "/items/" + id, "DELETE"),
    false,
  );
  for (const path of [
    "../auth/login",
    "auth/login",
    "public/settings",
    "users/" + id + "/anything",
    "https://example.com",
  ])
    assert.equal(allowedRoute(path, "GET"), false);
  assert.equal(allowedRoute("settings", "DELETE"), false);
  assert.equal(allowedRoute("contact-messages", "POST"), false);
});
test("JavaScript URLs and protocol-relative URLs are rejected", () => {
  const fields = resourceByKey("banners")!.fields;
  for (const button_url of ["javascript:alert(1)", "//evil.example"])
    assert.ok(
      buildPayload(fields, { title: "X", button_url }, "ADMIN").errors
        .button_url,
    );
  assert.equal(
    buildPayload(fields, { title: "X", button_url: "/tentang" }, "ADMIN").errors
      .button_url,
    undefined,
  );
});
