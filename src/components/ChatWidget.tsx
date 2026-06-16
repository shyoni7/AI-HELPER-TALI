"use client";

import { useState, useRef, useEffect } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "שלום! אני טלי, העוזר/ת של המרכז. אפשר לשאול אותי על המרכז, על סוגי הטיפולים ועל המטפלים. במה אוכל לעזור?",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

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
        body: JSON.stringify({ message: text, history: next.slice(1, -1) }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? data.error ?? "אירעה שגיאה." },
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
    <>
      <button
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="פתיחת צ'אט עם טלי"
      >
        {open ? "סגירה ✕" : "שיחה עם טלי 💬"}
      </button>

      {open && (
        <div className="chat-panel" role="dialog" aria-label="צ'אט תמיכה">
          <div className="chat-head">
            <strong>טלי — עוזר/ת המרכז</strong>
            <button
              onClick={() => setOpen(false)}
              aria-label="סגירה"
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}
            >
              ✕
            </button>
          </div>
          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role === "user" ? "user" : "bot"}`}>
                {m.content}
              </div>
            ))}
            {loading && <div style={{ opacity: 0.6, fontSize: "0.9rem" }}>טלי מקלידה…</div>}
            <div ref={endRef} />
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="כתבו הודעה…"
              aria-label="הודעה"
            />
            <button className="btn btn-primary" onClick={send} disabled={loading}>
              שליחה
            </button>
          </div>
        </div>
      )}
    </>
  );
}
