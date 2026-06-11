import { apiFetch } from "./client.js";

export async function adminApprovalList(page = 1) {
    return apiFetch(`/admin/approval/list?page=${page}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
}

export async function adminApprovalCount() {
    return apiFetch("/admin/approval/count", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
}