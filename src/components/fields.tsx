"use client";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Field } from "@/lib/resources";
import type { RecordData, Role } from "@/lib/types";
import { labelOf } from "@/lib/http";
import { RelationPicker } from "./media-library";
import { Icon } from "./ui";
function MarkdownEditor({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  const [preview, setPreview] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  function insert(before: string, after = "") {
    const el = input.current;
    if (!el) return;
    const start = el.selectionStart,
      end = el.selectionEnd;
    onChange(
      value.slice(0, start) +
        before +
        value.slice(start, end) +
        after +
        value.slice(end),
    );
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  }
  return (
    <div className="markdown-editor">
      <div className="editor-toolbar">
        <div>
          <button
            type="button"
            aria-label="Tebalkan teks"
            disabled={preview}
            onClick={() => insert("**", "**")}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            aria-label="Miringkan teks"
            disabled={preview}
            onClick={() => insert("*", "*")}
          >
            <i>I</i>
          </button>
          <button
            type="button"
            aria-label="Tambah judul"
            disabled={preview}
            onClick={() => insert("\n## ")}
          >
            H2
          </button>
          <button
            type="button"
            aria-label="Tambah daftar"
            disabled={preview}
            onClick={() => insert("\n- ")}
          >
            Daftar
          </button>
          <button
            type="button"
            aria-label="Tambah tautan"
            disabled={preview}
            onClick={() => insert("[", "](https://)")}
          >
            Tautan
          </button>
        </div>
        <button
          type="button"
          className={preview ? "selected" : ""}
          onClick={() => setPreview(!preview)}
        >
          <Icon name={preview ? "pencil" : "eye"} size={15} />
          {preview ? "Tulis" : "Pratinjau"}
        </button>
      </div>
      {preview ? (
        <div className="markdown-preview">
          <ReactMarkdown>{value || "*Belum ada isi artikel.*"}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          ref={input}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Mulai tulis cerita Anda di sini…"
          rows={15}
        />
      )}
      <div className="editor-footer">
        <span>Markdown didukung · HTML ditampilkan sebagai teks</span>
        <span>{value.trim() ? value.trim().split(/\s+/).length : 0} kata</span>
      </div>
    </div>
  );
}
export function Fields({
  fields,
  values,
  onChange,
  errors,
  role,
  isNew = false,
}: {
  fields: Field[];
  values: RecordData;
  onChange: (name: string, value: unknown) => void;
  errors: Record<string, string>;
  role: Role;
  isNew?: boolean;
}) {
  return (
    <div className="fields-grid">
      {fields
        .filter((f) => !f.admin || role === "ADMIN")
        .map((f) => {
          const id = "field-" + f.name;
          const value = values[f.name];
          const type = f.type || "text";
          const required = f.required || (type === "password" && isNew);
          if (type === "boolean")
            return (
              <div className="field checkbox-field" key={f.name}>
                <label htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => onChange(f.name, e.target.checked)}
                  />
                  <span>
                    <strong>{f.label}</strong>
                    {f.hint && <small>{f.hint}</small>}
                  </span>
                </label>
              </div>
            );
          return (
            <div
              className={"field " + (f.wide ? "field-wide" : "")}
              key={f.name}
            >
              <label htmlFor={id}>
                {f.label}
                {required && <span className="required"> *</span>}
                {f.section && (
                  <small className="field-section">{f.section}</small>
                )}
              </label>
              {type === "markdown" ? (
                <MarkdownEditor
                  value={labelOf(value)}
                  id={id}
                  onChange={(v) => onChange(f.name, v)}
                />
              ) : type === "media" || type === "relation" ? (
                <RelationPicker
                  id={id}
                  label={f.label}
                  resource={f.resource || "media"}
                  isMedia={type === "media"}
                  value={labelOf(value)}
                  required={required}
                  onChange={(v) => onChange(f.name, v)}
                />
              ) : type === "textarea" || type === "json" ? (
                <>
                  <textarea
                    id={id}
                    className={type === "json" ? "code-input" : ""}
                    rows={type === "json" ? 10 : 4}
                    value={labelOf(value)}
                    maxLength={f.max}
                    onChange={(e) => onChange(f.name, e.target.value)}
                    aria-invalid={!!errors[f.name]}
                    aria-describedby={
                      errors[f.name] ? id + "-error" : undefined
                    }
                  />
                  {type === "json" && (
                    <button
                      className="text-button json-format"
                      type="button"
                      onClick={() => {
                        try {
                          onChange(
                            f.name,
                            JSON.stringify(JSON.parse(labelOf(value)), null, 2),
                          );
                        } catch {
                          /* Kept as typed; validation reports malformed JSON on save. */
                        }
                      }}
                    >
                      Rapikan JSON
                    </button>
                  )}
                </>
              ) : type === "select" ? (
                <select
                  id={id}
                  value={labelOf(value)}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  aria-invalid={!!errors[f.name]}
                >
                  {!required && <option value="">— Tidak ada —</option>}
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={
                    type === "datetime"
                      ? "datetime-local"
                      : type === "url"
                        ? "text"
                        : type
                  }
                  value={labelOf(value)}
                  maxLength={f.max}
                  minLength={type === "password" ? f.min : undefined}
                  autoComplete={type === "password" ? "new-password" : "off"}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  aria-invalid={!!errors[f.name]}
                  aria-describedby={errors[f.name] ? id + "-error" : undefined}
                />
              )}
              {f.hint && <small className="field-hint">{f.hint}</small>}
              {errors[f.name] && (
                <small className="field-error" id={id + "-error"}>
                  {errors[f.name]}
                </small>
              )}
            </div>
          );
        })}
    </div>
  );
}
