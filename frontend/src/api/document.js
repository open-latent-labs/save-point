import { apiFetch } from "./client";

// 프론트 sort 키 → 백엔드 SortBy enum 매핑
const SORT_MAP = {
    date: "latest",
    name: "name",
    size: "file_size",
};

export async function upload_document(file, title) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    return await apiFetch("/documents/upload", {
        method: "POST",
        body: formData,
    });
}

export async function document_list(page, { sort, access_type, status, category, size = 4, is_bookmarked } = {}) {
    const body = {
        page: page ?? 1,
        size,
        ...(sort && { sort: SORT_MAP[sort] ?? sort }),
        ...(access_type && { access_type }),
        ...(status && { status }),
        ...(category && { category }),
        ...(is_bookmarked !== undefined && { is_bookmarked }),
    };

    return await apiFetch("/documents/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

export async function documentBookmark(document_id, is_bookmarked) {
    return await apiFetch(`/documents/${document_id}/bookmark`, {
        method: "POST",
        body: JSON.stringify({ is_bookmarked }),
    });
}

export async function documentBookmarkDelete(document_id) {
    return await apiFetch(`/documents/${document_id}/bookmark/delete`, {
        method: "DELETE",
    });
}

export async function documentPin(document_id, is_pinned) {
    return await apiFetch(`/documents/${document_id}/pin`, {
        method: "POST",
        body: JSON.stringify({ is_pinned }),
    });
}

export async function documentPinDelete(document_id) {
    return await apiFetch(`/documents/${document_id}/pin/delete`, {
        method: "DELETE",
    });
}

export async function documentPinList() {
    return await apiFetch("/documents/pin/list", {
        method: "GET",
    });
}

export async function requestPublicDocument(document_id) {
    return await apiFetch(`/documents/request-public/${document_id}`, { method: "POST" });
}


export async function publicDocumentList() {
    return apiFetch("/documents/public/list", { method: "GET" });
}


export async function documentDelete(document_id) {
    return apiFetch(`/summary/delete/${document_id}`, { method: "POST" });
}