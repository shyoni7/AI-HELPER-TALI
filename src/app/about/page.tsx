import type { Metadata } from "next";
import { site, values } from "@/content/site";

export const metadata: Metadata = {
  title: `אודות — ${site.name}`,
  description: `אודות ${site.name}`,
};

export default function AboutPage() {
  return (
    <section className="section">
      <div className="container">
        <h1>אודות {site.name}</h1>
        <p style={{ maxWidth: "62ch", fontSize: "1.1rem", color: "var(--muted)" }}>
          {site.intro}
        </p>
        <p style={{ maxWidth: "62ch" }}>
          המרכז הוקם מתוך אמונה שכל אדם זכאי למרחב טיפולי בטוח, מכבד ונגיש. אנחנו
          משלבים מקצועיות קלינית עם יחס אישי וחם, ומתאימים לכל פונה את המטפל/ת
          והגישה המתאימים לו. (טקסט זמני — יוחלף בתוכן אמיתי.)
        </p>

        <h2 style={{ marginTop: "2rem" }}>הערכים שלנו</h2>
        <div className="grid">
          {values.map((v) => (
            <div key={v.title} className="card">
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
