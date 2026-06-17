import { apiFetch } from "./client.js";

export async function notification_list() {
    try {
        return await apiFetch(`/notification/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
    } catch (e) {
        console.log("notification_list error:", e);
        return { items: [] };
    }
}

export async function notification_count() {
    try {
        const res = await fetch(`/api/notification/count`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
        if (!res.ok) return 0;
        return await res.json();
    } catch {
        return 0;
    }
}

export async function notification_read(notificationId) {
    try {
        const res = await fetch(`/api/notification/read/${notificationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
        if (!res.ok) return 0;
        return await res.json();
    } catch {
        return 0;
    }
}