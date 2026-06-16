"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "phone" | "code";

export default function StaffLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setMsg(data.message ?? "נשלח קוד.");
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "קוד שגוי");
      router.push("/staff");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="staff-auth">
      <div className="card" style={{ width: "min(420px, 92vw)" }}>
        <h1 style={{ fontSize: "1.5rem" }}>כניסת צוות</h1>
        <p style={{ color: "var(--muted)" }}>
          התחברות עם מספר הטלפון הרשום במערכת.
        </p>

        {step === "phone" && (
          <>
            <label className="field">
              מספר טלפון
              <input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
              />
            </label>
            <button
              className="btn btn-primary"
              onClick={requestCode}
              disabled={loading || phone.length < 6}
              style={{ width: "100%", marginTop: "0.75rem" }}
            >
              שליחת קוד
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <label className="field">
              קוד אימות (6 ספרות)
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="______"
              />
            </label>
            <button
              className="btn btn-primary"
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              style={{ width: "100%", marginTop: "0.75rem" }}
            >
              כניסה
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setStep("phone")}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              שינוי מספר
            </button>
          </>
        )}

        {msg && <p style={{ color: "var(--sage-dark)", marginTop: "0.75rem" }}>{msg}</p>}
        {error && <p style={{ color: "var(--accent)", marginTop: "0.75rem" }}>{error}</p>}
      </div>
    </div>
  );
}
