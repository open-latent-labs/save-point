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

export async function adminPublishDocument(document_id) {
    return apiFetch(`/admin/documents/publish/${document_id}`, { method: "PUT", credentials: "include" });
}

export async function adminApproveDocument(document_id) {
    return apiFetch(`/admin/documents/approve/${document_id}`, { method: "POST", credentials: "include" });
}

export async function adminRejectDocument(document_id) {
    return apiFetch(`/admin/documents/reject/${document_id}`, { method: "POST", credentials: "include" });
}

export async function adminCancelPending(document_id) {
    return apiFetch(`/admin/documents/cancel-pending/${document_id}`, { method: "POST", credentials: "include" });
}