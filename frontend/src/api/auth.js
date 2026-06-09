import { apiFetch } from "./client.js";

export async function signup({ name, username, email, password }) {
    return apiFetch("http://localhost:8000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
    });
}
