import { apiFetch } from "./client.js";

export async function changeRole({ id, role }) {
    return apiFetch("/superAdmin/change_role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, role }),
    });
}

export async function banUser({ id }) {
    return apiFetch("/superAdmin/ban_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, ban: "true" }),
    });
}

export async function unbanUser({ id }) {
    return apiFetch("/superAdmin/unban_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, ban: "false" }),
    });
}


export async function allUserList(page = 1, size = 8, { role = "", is_active = "" } = {}) {
    const params = new URLSearchParams({ page, size });
    if (role) params.set("role", role);
    if (is_active !== "") params.set("is_active", is_active);
    return apiFetch("/superAdmin/all_user_list?" + params.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
}

export async function dashboardNum() {
    return apiFetch("/superAdmin/dashboard_num", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
}

export async function getUserRoleLog(userId) {
    return apiFetch(`/superAdmin/user_role_log/${userId}`, {
        method: "GET",
        credentials: "include",
    });
}