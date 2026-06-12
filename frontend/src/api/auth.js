const BASE = "/api";

// FastAPI 에러 응답 {"detail": "..."} 에서 메시지 추출
function parseError(text) {
    try {
        const json = JSON.parse(text);
        return json.detail ?? text;
    } catch {
        return text;
    }
}

// 인증 엔드포인트 전용 fetch
// apiFetch 미사용 이유: 로그인/회원가입은 401이 "자격증명 오류"를 의미하므로
// token refresh 로직을 타면 안 됨
async function authFetch(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(parseError(text));
    }
    return res.json();
}

export function signup({ name, user_id, email, password }) {
    return authFetch(`${BASE}/auth/signup`, { name, user_id, email, password });
}

export function loginApi({ user_id, password }) {
    return authFetch(`${BASE}/auth/login`, { user_id, password });
}

export async function getLinkedOAuth() {
    const res = await fetch(`${BASE}/auth/me/oauth`, { credentials: "include" });
    if (!res.ok) throw new Error("연결된 계정 조회 실패");
    return res.json();
}

export async function unlinkOAuth(provider) {
    const res = await fetch(`${BASE}/auth/unlink/${provider}`, {
        method: "DELETE",
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(parseError(text));
    }
}

export async function getMergePreview() {
    const res = await fetch(`${BASE}/auth/merge-preview`, { credentials: "include" });
    if (!res.ok) throw new Error("병합 미리보기 조회 실패");
    return res.json();
}

export async function confirmMerge() {
    const res = await fetch(`${BASE}/auth/merge-confirm`, {
        method: "POST",
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(parseError(text));
    }
    return res.json();
}

export async function cancelMerge() {
    await fetch(`${BASE}/auth/merge-cancel`, {
        method: "POST",
        credentials: "include",
    });
}
