const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export async function loadRooms(userId) {
  if (!userId) return [];
  try {
    const res = await fetch(`${BASE_URL}/v1/users/${userId}/sessions`);
    if (!res.ok) {
      console.error(`[loadRooms] API 오류 ${res.status}:`, await res.text().catch(() => ""));
      return [];
    }
    const data = await res.json();
    return data.map((s) => ({
      id: s.session_id,
      title: s.session_name,
      date: s.last_active_at?.slice(0, 10) ?? "",       // 표시용 (날짜만)
      lastActiveAt: s.last_active_at ?? "",              // 정렬용 (전체 타임스탬프)
      createdAt: s.created_at ?? "",                     // 정렬용 (전체 타임스탬프)
      messages: [],
    }));
  } catch (e) {
    console.error("[loadRooms] 네트워크 오류:", e);
    return [];
  }
}

export async function createRoom(userId, sessionName = "새 채팅") {
  const res = await fetch(`${BASE_URL}/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, session_name: sessionName }),
  });
  if (!res.ok) {
    throw new Error(`Session creation failed: ${res.status}`);
  }
  const data = await res.json();

  // 사이드바 목록 갱신 이벤트
  window.dispatchEvent(new Event("gamedocs:rooms"));

  return {
    id: data.session_id,
    title: data.session_name,
    date: data.created_at?.slice(0, 10) ?? "",
    messages: [],
  };
}

export async function loadMessages(sessionId) {
  try {
    const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/messages`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((m) => ({
      id: m.id,
      role: m.role === "USER" ? "user" : "ai",
      text: m.content_ko,
      sources: m.retrieved_chunk_ids ?? [],  // 출처 복원
      streaming: false,
      isLoading: false,
    }));
  } catch {
    return [];
  }
}

export async function deleteRoom(sessionId) {
  await fetch(`${BASE_URL}/v1/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function renameRoom(sessionId, name) {
  const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_name: name }),
  });
  if (!res.ok) throw new Error(`Rename failed: ${res.status}`);
  return res.json();
}