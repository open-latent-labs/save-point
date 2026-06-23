import { CATEGORIES } from "./mock.js";

export const ACCEPT = ".pdf,.pptx";
export const MAX_BYTES = 20 * 1024 * 1024;

const EXT_OK = ["pdf", "pptx"];

export function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "";
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateFile(file) {
  const ext = extOf(file.name);
  if (!EXT_OK.includes(ext)) return "지원하지 않는 형식이에요 (PDF·PPTX).";
  if (file.size > MAX_BYTES) return "파일이 너무 커요 (최대 20MB).";
  if (file.size === 0) return "빈 파일은 업로드할 수 없어요.";
  return null;
}

export function guessCategory(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("shader") || n.includes("셰이더")) return "shader";
  if (n.includes("unity")) return "unity";
  if (n.includes("unreal") || n.includes("ue5")) return "unreal";
  if (n.includes("render") || n.includes("렌더")) return "rendering";
  if (n.includes("perf") || n.includes("최적화")) return "performance";
  if (n.includes("postmortem") || n.includes("포스트모템")) return "postmortem";
  return "gameplay";
}

export const CATEGORY_OPTIONS = CATEGORIES;

// ── 즐겨찾기 localStorage 유틸 ──────────────────────────────
export const loadFavs = () => {
  try { return JSON.parse(localStorage.getItem("gamedocs_favs") || "[]"); }
  catch { return []; }
};
export const saveFavs = (ids) =>
  localStorage.setItem("gamedocs_favs", JSON.stringify(ids));

// ── 고정핀 localStorage 유틸 ────────────────────────────────
export const loadPins = () => {
  try { return JSON.parse(localStorage.getItem("gamedocs_pins") || "[]"); }
  catch { return []; }
};
export const savePins = (ids) => {
  localStorage.setItem("gamedocs_pins", JSON.stringify(ids));
  window.dispatchEvent(new Event("gamedocs:pins"));
};

// ── 승인 대기 localStorage 유틸 ─────────────────────────────
const PENDING_DEFAULT = [];
export const loadPending = () => {
  try {
    const raw = localStorage.getItem("gamedocs_pending");
    return raw ? JSON.parse(raw) : PENDING_DEFAULT;
  } catch { return PENDING_DEFAULT; }
};
export const savePending = (ids) => {
  localStorage.setItem("gamedocs_pending", JSON.stringify(ids));
  window.dispatchEvent(new Event("gamedocs:pending"));
};

// ── 승인 거절 localStorage 유틸 ─────────────────────────────
export const loadRejected = () => {
  try { return JSON.parse(localStorage.getItem("gamedocs_rejected") || "[]"); }
  catch { return []; }
};
export const saveRejected = (ids) => {
  localStorage.setItem("gamedocs_rejected", JSON.stringify(ids));
  window.dispatchEvent(new Event("gamedocs:rejected"));
};

// ── 승인 완료 localStorage 유틸 ─────────────────────────────
export const loadApproved = () => {
  try { return JSON.parse(localStorage.getItem("gamedocs_approved") || "[]"); }
  catch { return []; }
};
export const saveApproved = (ids) => {
  localStorage.setItem("gamedocs_approved", JSON.stringify(ids));
  window.dispatchEvent(new Event("gamedocs:approved"));
};

