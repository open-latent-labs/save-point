import { apiFetch } from "./client.js";

export async function document_content(id) {
    return apiFetch(`/summary/docs/${id}`);
}

export async function document_delete(document_id) {
    return apiFetch(`/summary/${document_id}/summary`, {
        method: "DELETE",
    });
}

export async function document_update_access(id, content) {
    return apiFetch(`/summary/${id}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    });
}
