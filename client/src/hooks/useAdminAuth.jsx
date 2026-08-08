import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { adminApi } from "../api/adminClient.js";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAdmin = useCallback(async () => {
    const token = localStorage.getItem("emc_admin_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await adminApi.get("/auth/me");
      setAdmin(data.user);
    } catch {
      localStorage.removeItem("emc_admin_token");
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  const login = useCallback((token, userData) => {
    localStorage.setItem("emc_admin_token", token);
    setAdmin(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("emc_admin_token");
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
