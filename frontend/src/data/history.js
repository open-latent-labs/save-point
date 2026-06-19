// 최근 검색 기록을 localStorage 에 저장/조회하는 헬퍼
const KEY = "gamedocs.history";
const MAX = 12;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function pushHistory(query) {
  const q = (query || "").trim();
  if (!q) return loadHistory();
  const prev = loadHistory().filter((x) => x !== q);
  const next = [q, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 저장 실패는 무시 */
  }
  // 다른 컴포넌트(사이드바)가 즉시 갱신되도록 이벤트 발행
  window.dispatchEvent(new Event("gamedocs:history"));
  return next;
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event("gamedocs:history"));
}
