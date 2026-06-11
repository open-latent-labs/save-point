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
    return await apiFetch("/api/documents/upload", {
        method: "POST",
        body: formData,
    });
}

export async function document_list(page, { sort, access_type, status, category } = {}) {
    const body = {
        page: page ?? 1,
        size: 4,
        ...(sort && { sort: SORT_MAP[sort] ?? sort }),
        ...(access_type && { access_type }),
        ...(status && { status }),
        ...(category && { category }),
    };

    return await apiFetch("/api/documents/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

export async function documentBookmark(document_id, is_bookmarked) {
    return await apiFetch(`/api/documents/${document_id}/bookmark`, {
        method: "POST",
        body: JSON.stringify({ is_bookmarked }),
    });
}

export async function documentBookmarkDelete(document_id) {
    return await apiFetch(`/api/documents/${document_id}/bookmark/delete`, {
        method: "DELETE",
    });
}

export async function documentPin(document_id, is_pinned) {
    return await apiFetch(`/api/documents/${document_id}/pin`, {
        method: "POST",
        body: JSON.stringify({ is_pinned }),
    });
}

export async function documentPinDelete(document_id) {
    return await apiFetch(`/api/documents/${document_id}/pin/delete`, {
        method: "DELETE",
    });
}

export async function documentPinList() {
    return await apiFetch("/api/documents/pin/list", {
        method: "GET",
    });
}
