import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("emc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(err) {
  return err?.response?.data?.error?.message || err?.message || "Something went wrong. Please try again.";
}

// Service report photos are stored as absolute URLs (seed placeholders) or
// server-relative "/uploads/..." paths (admin uploads) — resolve the latter
// against the API origin so they load correctly from the Vite dev server too.
export function resolveMediaUrl(url) {
  if (!url) return url;
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}
