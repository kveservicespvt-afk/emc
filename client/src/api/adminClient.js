import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Separate axios instance + token key from api/client.js so an admin session and
// a customer session can coexist in the same browser without clobbering each other.
export const adminApi = axios.create({ baseURL: `${API_URL}/api` });

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("emc_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
