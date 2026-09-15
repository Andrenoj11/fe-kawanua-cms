"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Files,
  FolderOpen,
  GalleryHorizontalEnd,
  Handshake,
  Image,
  Inbox,
  LayoutDashboard,
  LayoutPanelTop,
  LoaderCircle,
  LogOut,
  Menu,
  Navigation,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Trash2,
  Upload,
  Users,
  X,
  Pencil,
  Save,
  AlertCircle,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  newspaper: Newspaper,
  tags: Tags,
  panels: LayoutPanelTop,
  files: Files,
  image: Image,
  gallery: GalleryHorizontalEnd,
  handshake: Handshake,
  navigation: Navigation,
  inbox: Inbox,
  users: Users,
  settings: Settings,
  plus: Plus,
  search: Search,
  close: X,
  logout: LogOut,
  menu: Menu,
  external: ExternalLink,
  arrow: ArrowRight,
  back: ArrowLeft,
  chevron: ChevronRight,
  down: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
  refresh: RefreshCw,
  loader: LoaderCircle,
  check: Check,
  success: CheckCircle2,
  clock: Clock,
  eye: Eye,
  "eye-off": EyeOff,
  upload: Upload,
  download: ArrowDownToLine,
  trash: Trash2,
  pencil: Pencil,
  save: Save,
  alert: AlertCircle,
  folder: FolderOpen,
  book: BookOpen,
  shield: ShieldCheck,
  sparkles: Sparkles,
  more: MoreHorizontal,
};
export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Component = icons[name] || FileText;
  return (
    <Component
      size={size}
      strokeWidth={1.7}
      className={className}
      aria-hidden="true"
    />
  );
}
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={"brand " + (light ? "light" : "")}>
      <div className="brand-mark">
        k<span>.</span>
      </div>
      <div>
        <strong>
          kawanua<span>media</span>
        </strong>
        <small>RUANG REDAKSI</small>
      </div>
    </div>
  );
}
const statuses: Record<string, [string, string]> = {
  DRAFT: ["Draf", "amber"],
  PUBLISHED: ["Terbit", "green"],
  ARCHIVED: ["Arsip", "gray"],
  NEW: ["Baru", "coral"],
  READ: ["Dibaca", "blue"],
  REPLIED: ["Dibalas", "green"],
  ADMIN: ["Admin", "violet"],
  EDITOR: ["Editor", "blue"],
};
export function Badge({ value }: { value: unknown }) {
  const [text, color] =
    typeof value === "boolean"
      ? value
        ? ["Aktif", "green"]
        : ["Nonaktif", "gray"]
      : statuses[String(value)] || [String(value ?? "—"), "gray"];
  return (
    <span className={"badge " + color}>
      <i />
      {text}
    </span>
  );
}
export function Spinner() {
  return (
    <span className="spinner">
      <Icon name="loader" className="spin" /> Memuat data…
    </span>
  );
}
export function Empty({
  title = "Belum ada konten",
  description = "Konten yang Anda tambahkan akan muncul di sini.",
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name="folder" size={26} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <Icon name="alert" />
      <span>{message}</span>
      {onRetry && (
        <button className="text-button" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      closeRef.current();
    };
    node?.addEventListener("cancel", cancel);
    return () => {
      node?.removeEventListener("cancel", cancel);
      node?.close();
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={dialog}
      className={"modal " + (wide ? "wide" : "")}
      aria-label={title}
      onClick={(e) => {
        if (e.target === dialog.current) {
          const box = dialog.current.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Tutup dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>,
    document.body,
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
  busy = false,
  danger = false,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="confirm-copy">{description}</p>
      <div className="form-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Batal
        </button>
        <button
          className={"button " + (danger ? "danger" : "primary")}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? (
            <Icon name="loader" className="spin" />
          ) : (
            <Icon name={danger ? "trash" : "check"} />
          )}{" "}
          {busy ? "Memproses…" : "Ya, lanjutkan"}
        </button>
      </div>
    </Modal>
  );
}
