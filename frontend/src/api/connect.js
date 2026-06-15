import { useState, useEffect } from "react";

const SSE_URL = `api/auth/stream`;

export function useHeartbeat() {
    useEffect(() => {
        let es = null;
        let retryTimer = null;

        function connect() {
            es = new EventSource(SSE_URL, { withCredentials: true });
            es.onerror = () => {
                es.close();
                es = null;
                retryTimer = setTimeout(connect, 5000);
            };
        }

        connect();

        return () => {
            clearTimeout(retryTimer);
            if (es) es.close();
        };
    }, []);
}

export function usePresence() {
    const [onlineIds, setOnlineIds] = useState(new Set());

    useEffect(() => {
        let es = null;
        let retryTimer = null;

        function connect() {
            es = new EventSource(SSE_URL, { withCredentials: true });

            es.addEventListener("snapshot", (e) => {
                const { online } = JSON.parse(e.data);
                setOnlineIds(new Set(online));
            });

            es.addEventListener("presence", (e) => {
                const { user_id, status } = JSON.parse(e.data);
                setOnlineIds((prev) => {
                    const next = new Set(prev);
                    if (status === "online") next.add(user_id);
                    else next.delete(user_id);
                    return next;
                });
            });

            es.onerror = () => {
                es.close();
                es = null;
                retryTimer = setTimeout(connect, 5000);
            };
        }

        connect();

        return () => {
            clearTimeout(retryTimer);
            if (es) es.close();
        };
    }, []);

    return onlineIds;
}

export function formatLastSeen(isoStr) {
    if (!isoStr) return null;
    // 타임존 표시(Z 또는 ±HH:MM)가 없으면 UTC로 강제 해석 (JS 기본 동작은 로컬 시간)
    const utcStr = /Z|[+-]\d{2}:\d{2}$/.test(isoStr) ? isoStr : isoStr + "Z";
    const diffMs = Date.now() - new Date(utcStr).getTime();
    if (diffMs < 0) return "방금 전";
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분`;
    return `${Math.floor(diffMin / 60)}시간`;
}
