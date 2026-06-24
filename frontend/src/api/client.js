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
            // Pydantic 내장 타입 에러 → 필드별 한국어
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

// access token 만료 시 refresh token으로 재발급 시도
async function tryRefresh() {
    const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
    });
    return res.ok;
}

// 인증이 필요한 모든 API 요청에 사용
// 401 수신 시 refresh → 재시도, refresh도 실패하면 /login으로 이동
export async function apiFetch(url, options = {}) {
    const fullUrl = `${BASE}${url}`;
    const res = await fetch(fullUrl, { ...options, credentials: "include" });

    if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            const retryRes = await fetch(fullUrl, { ...options, credentials: "include" });
            if (!retryRes.ok) {
                const text = await retryRes.text().catch(() => retryRes.statusText);
                throw new Error(parseError(text));
            }
            return retryRes.json();
        }
        // refresh도 실패 → 세션 만료, 로그인 페이지로 이동
        window.location.href = "/login";
        return;
    }

    if (res.status === 403) {
        // 정지 계정 등 권한 없음 → 로그인 페이지로 이동
        window.location.href = "/login";
        return;
    }

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(parseError(text));
    }
    return res.json();
}
