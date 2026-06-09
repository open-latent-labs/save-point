import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const BASE = "http://localhost:8000";

// 앱 시작 시 현재 로그인 상태 확인
// access token 만료 시 refresh token으로 재발급 후 재시도
// 둘 다 실패하면 null 반환 (로그인 화면으로 유도)
async function fetchMe() {
    const res = await fetch(`${BASE}/auth/me`, { credentials: "include" });
    if (res.ok) return res.json();

    if (res.status === 401) {
        const refreshRes = await fetch(`${BASE}/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });
        if (refreshRes.ok) {
            const retry = await fetch(`${BASE}/auth/me`, { credentials: "include" });
            if (retry.ok) return retry.json();
        }
    }
    return null;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // 인증 상태 확인 중 여부

    useEffect(() => {
        fetchMe()
            .then((data) => setUser(data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    // 로그인/회원가입 성공 후 호출 — 서버 응답의 유저 정보로 상태 갱신
    const login = (userValue) => setUser(userValue);

    const logout = async () => {
        await fetch(`${BASE}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
