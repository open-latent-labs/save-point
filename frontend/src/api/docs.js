import { apiFetch } from "./client.js";

export async function document_content(id) {
    return apiFetch(`/summary/docs/${id}`);
}

export async function document_original(id) {
    return apiFetch(`/summary/docs/${id}/original`);
}

export async function document_delete(document_id) {
    return apiFetch(`/summary/delete/${document_id}`, {
        method: "DELETE",
    });
}

export async function document_update_access(id, content) {
    return apiFetch(`/summary/${id}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    });
}
