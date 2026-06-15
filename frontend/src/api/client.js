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
