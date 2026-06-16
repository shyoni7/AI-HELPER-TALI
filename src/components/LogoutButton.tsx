"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/staff/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="btn btn-ghost"
      style={{ padding: "0.35rem 0.9rem", fontSize: "0.9rem" }}
    >
      יציאה
    </button>
  );
}
