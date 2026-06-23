/**
 * 타임스탬프 → 상대 시간 또는 MM-DD
 * - 24시간 이내: "N분 전" / "N시간 전"
 * - 24시간 초과: "MM-DD"
 */
export function formatRelativeDate(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const t = new Date(timestamp).getTime();
  const diffMs = now - t;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  // 24시간 초과 → MM-DD
  const d = new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}
