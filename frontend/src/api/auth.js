const BASE = "/api";

// FastAPI 에러 응답 {"detail": "..." | [...]} 에서 메시지 추출
function parseError(text) {
    try {
        const json = JSON.parse(text);
        if (!json.detail) return text;
        if (typeof json.detail === "string") return json.detail;
        if (Array.isArray(json.detail)) {
            const first = json.detail[0];
            if (!first) return "입력 형식이 올바르지 않습니다.";
            const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "";
            const msg = first.msg ?? "";
            // @field_validator 에러: "Value error, 한국어 메시지"
            const match = msg.match(/^Value error,\s*(.+)$/i);
            if (match) return match[1].trim();
            // EmailStr 등 Pydantic 내장 타입 에러 → 필드별 한국어
            const FIELD_MSG = {
                email: "유효하지 않은 이메일 형식입니다.",
                password: "비밀번호 형식이 올바르지 않습니다.",
                name: "이름 형식이 올바르지 않습니다.",
                user_id: "아이디 형식이 올바르지 않습니다.",
            };
            return FIELD_MSG[field] ?? "입력 형식이 올바르지 않습니다.";
        }
        return text;
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

export async function checkIdentity({ user_id, email }) {
    return authFetch(`${BASE}/auth/check-identity`, { user_id, email });
}

export async function resetPassword({ user_id, email, new_password }) {
    return authFetch(`${BASE}/auth/reset-password`, { user_id, email, new_password });
}

export async function setPrimaryEmail(email) {
    const res = await fetch(`${BASE}/auth/set-primary-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(parseError(text));
    }
    return res.json();
}
