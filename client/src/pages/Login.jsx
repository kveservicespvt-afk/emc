import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../api/client.js";
import { useAuth } from "../hooks/useAuth.jsx";

export function Login() {
  const [tab, setTab] = useState("otp");
  const navigate = useNavigate();
  const { login } = useAuth();

  function onSuccess(data) {
    login(data.token, data.user);
    navigate("/dashboard");
  }

  return (
    <div className="section flex justify-center">
      <div className="card w-full max-w-md">
        <h1 className="text-center text-2xl font-bold text-ink">Welcome to EaseMyClean</h1>

        <div className="mx-auto mt-6 flex w-fit rounded-full bg-gray-100 p-1">
          <button
            onClick={() => setTab("otp")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "otp" ? "bg-forest text-white" : "text-gray-600"}`}
          >
            Mobile OTP
          </button>
          <button
            onClick={() => setTab("password")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "password" ? "bg-forest text-white" : "text-gray-600"}`}
          >
            Email &amp; Password
          </button>
        </div>

        <div className="mt-6">
          {tab === "otp" ? <OtpLogin onSuccess={onSuccess} /> : <PasswordLogin onSuccess={onSuccess} />}
        </div>
      </div>
    </div>
  );
}

function OtpLogin({ onSuccess }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState("phone");
  const [devOtp, setDevOtp] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const requestMutation = useMutation({
    mutationFn: () => api.post("/auth/otp/request", { phone }).then((r) => r.data),
    onSuccess: (data) => {
      setStep("otp");
      setIsNewUser(data.isNewUser);
      setDevOtp(data.devOtp ?? null);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.post("/auth/otp/verify", { phone, otp, ...(name ? { name } : {}) }).then((r) => r.data),
    onSuccess,
  });

  if (step === "phone") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          requestMutation.mutate();
        }}
        className="space-y-4"
      >
        <div>
          <label className="label" htmlFor="phone">Mobile Number</label>
          <input
            id="phone"
            className="input"
            placeholder="+91XXXXXXXXXX"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        {requestMutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(requestMutation.error)}</p>}
        <button type="submit" className="btn-primary w-full" disabled={requestMutation.isPending}>
          {requestMutation.isPending ? "Sending OTP…" : "Send OTP"}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        verifyMutation.mutate();
      }}
      className="space-y-4"
    >
      {devOtp && (
        <div className="rounded-lg border border-gold bg-gold/10 px-3 py-2 text-xs text-maroon">
          <span className="font-bold uppercase tracking-wide">Dev Mode</span> — no SMS provider is
          connected yet, so this OTP is shown here for testing only. A real customer would never see this.
          <div className="mt-1 text-sm font-bold">OTP: {devOtp}</div>
        </div>
      )}
      {isNewUser && (
        <div>
          <label className="label" htmlFor="name">Your Name</label>
          <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="otp">Enter 6-digit OTP</label>
        <input
          id="otp"
          className="input tracking-widest"
          maxLength={6}
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {verifyMutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(verifyMutation.error)}</p>}
      <button type="submit" className="btn-primary w-full" disabled={verifyMutation.isPending}>
        {verifyMutation.isPending ? "Verifying…" : "Verify & Continue"}
      </button>
      <button type="button" onClick={() => setStep("phone")} className="w-full text-center text-sm text-gray-500 hover:text-forest">
        Change number
      </button>
    </form>
  );
}

function PasswordLogin({ onSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });

  const mutation = useMutation({
    mutationFn: () =>
      mode === "login"
        ? api.post("/auth/login", { email: form.email, password: form.password }).then((r) => r.data)
        : api.post("/auth/register", form).then((r) => r.data),
    onSuccess,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="p-name">Name</label>
          <input id="p-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="p-email">Email</label>
        <input id="p-email" type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="p-password">Password</label>
        <input id="p-password" type="password" className="input" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      {mutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(mutation.error)}</p>}
      <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="w-full text-center text-sm text-gray-500 hover:text-forest"
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
      </button>
    </form>
  );
}
