import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { useAdminAuth } from "../../hooks/useAdminAuth.jsx";
import { Logo } from "../../components/ui/Logo.jsx";

export function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const mutation = useMutation({
    mutationFn: () => adminApi.post("/auth/admin-login", form).then((r) => r.data),
    onSuccess: (data) => {
      login(data.token, data.user);
      navigate("/admin");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="card w-full max-w-md">
        <div className="flex justify-center">
          <Logo height={44} />
        </div>
        <h1 className="mt-4 text-center text-xl font-bold text-ink">Admin Sign In</h1>
        <p className="text-center text-sm text-gray-500">Staff &amp; admin access only</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="label" htmlFor="a-email">Email</label>
            <input
              id="a-email"
              type="email"
              className="input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="a-password">Password</label>
            <input
              id="a-password"
              type="password"
              className="input"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {mutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(mutation.error)}</p>}
          <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
