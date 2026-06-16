"use client";

import { useState, useRef, useEffect } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "שלום! אני טלי, העוזר/ת של המרכז. אפשר לשאול על המרכז והטיפולים, לתאם פגישה, או להצטרף לרשימת המתנה. במה אוכל לעזור?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          // Send prior turns as history (excludes the opening greeting).
          history: next.slice(1, -1),
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "אירעה שגיאה.",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "שגיאת רשת. נסו שוב." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1 style={{ fontSize: "1.4rem" }}>מרכז מטפלים — עוזר/ת AI</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-start" : "stretch",
              background: m.role === "user" ? "var(--bubble-user)" : "var(--bubble-bot)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "0.6rem 0.9rem",
              whiteSpace: "pre-wrap",
              maxWidth: m.role === "user" ? "80%" : "100%",
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && <div style={{ opacity: 0.6 }}>טלי מקלידה…</div>}
        <div ref={endRef} />
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          insetInline: 0,
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
          padding: "0.75rem 1rem",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="כתבו הודעה…"
            style={{
              flex: 1,
              padding: "0.6rem 0.8rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              fontSize: "1rem",
            }}
          />
          <button
            onClick={send}
            disabled={loading}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: 10,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            שליחה
          </button>
        </div>
      </div>
    </main>
  );
}
