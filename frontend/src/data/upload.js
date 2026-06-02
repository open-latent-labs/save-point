import { CATEGORIES } from "./mock.js";

export const ACCEPT = ".pdf,.md,.txt,.docx,.doc";
export const MAX_BYTES = 20 * 1024 * 1024;

const EXT_OK = ["pdf", "md", "txt", "docx", "doc"];

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
  if (!EXT_OK.includes(ext)) return "지원하지 않는 형식이에요 (PDF·MD·TXT·DOCX).";
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

// ── 더미 문서 데이터 ────────────────────────────────────────
export const MOCK_DOCS = [
  // ── 개인 문서 (PRIVATE) ──
  { id: "d2",  name: "Unity_DOTS_Multithreading_Guide.md",      category: "unity",       size: 87000,   date: "2025-05-18", ext: "md",   isPublic: false },
  { id: "d3",  name: "PBR_Shader_Optimization_Techniques.pdf",  category: "shader",      size: 1820000, date: "2025-05-15", ext: "pdf",  isPublic: false },
  { id: "d5",  name: "Mobile_DrawCall_Batching_Checklist.txt",  category: "performance", size: 44000,   date: "2025-05-08", ext: "txt",  isPublic: false },
  { id: "d7",  name: "Unity_ECS_Entity_Query_Patterns.pdf",     category: "unity",       size: 960000,  date: "2025-04-28", ext: "pdf",  isPublic: false },
  { id: "d8",  name: "Gameplay_AI_BehaviorTree_Design.docx",    category: "gameplay",    size: 680000,  date: "2025-04-20", ext: "docx", isPublic: false },
  { id: "d10", name: "URP_ShaderGraph_Best_Practices.md",       category: "shader",      size: 95000,   date: "2025-04-10", ext: "md",   isPublic: false },

  // ── 공용 문서 (PUBLIC) — 공용 문서 트리와 동일 ──
  { id: "d1",  name: "UE5_Nanite_Architecture_Deep_Dive.pdf",   category: "unreal",      size: 2450000, date: "2025-05-20", ext: "pdf",  isPublic: true },
  { id: "d4",  name: "Halo_Infinite_AI_System_Postmortem.pdf",  category: "postmortem",  size: 3150000, date: "2025-05-10", ext: "pdf",  isPublic: true },
  { id: "d6",  name: "UE5_Lumen_Global_Illumination_Notes.md",  category: "rendering",   size: 125000,  date: "2025-05-05", ext: "md",   isPublic: true },
  { id: "d9",  name: "Skyrim_OpenWorld_Streaming_Analysis.pdf", category: "rendering",   size: 2100000, date: "2025-04-15", ext: "pdf",  isPublic: true },
  { id: "pub1", name: "Atlassian 제품 개요.md",                  category: "gameplay",    size: 45000,   date: "2025-03-10", ext: "md",   isPublic: true },
  { id: "pub2", name: "Atlassian Jira Software 소개.md",         category: "gameplay",    size: 38000,   date: "2025-03-08", ext: "md",   isPublic: true },
  { id: "pub3", name: "Atlassian Confluence 소개.md",            category: "gameplay",    size: 29000,   date: "2025-03-05", ext: "md",   isPublic: true },
  { id: "pub4", name: "Atlassian Cloud FAQ.pdf",                 category: "gameplay",    size: 120000,  date: "2025-02-20", ext: "pdf",  isPublic: true },
];
