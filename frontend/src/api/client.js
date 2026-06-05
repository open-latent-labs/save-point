export async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        throw new Error(err);
    }
    return res.json();
}
