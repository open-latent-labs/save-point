import { apiFetch } from "./client";

export async function upload_document(file, title) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    return await apiFetch("/api/document/upload", {
        method: "POST",
        body: formData,
    });
}