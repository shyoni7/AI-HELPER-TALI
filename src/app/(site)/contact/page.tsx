import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `צרו קשר — ${site.name}`,
  description: "פרטי התקשרות וקביעת פגישה",
};

export default function ContactPage() {
  return (
    <section className="section">
      <div className="container">
        <h1>צרו קשר</h1>
        <p style={{ maxWidth: "62ch", color: "var(--muted)" }}>
          נשמח לעזור. אפשר לשוחח עם טלי, העוזר/ת החכם/ה שלנו (הכפתור בפינת
          המסך), או לפנות אלינו ישירות:
        </p>

        <div className="card" style={{ maxWidth: "420px", marginTop: "1rem" }}>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>טלפון:</strong> {site.phone}
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>דוא״ל:</strong> {site.email}
          </p>
          <p style={{ margin: 0 }}>
            <strong>כתובת:</strong> {site.address}
          </p>
        </div>

        <div
          className="card"
          style={{ marginTop: "1.25rem", background: "var(--sand)" }}
        >
          <h3>קביעת פגישה</h3>
          <p style={{ margin: 0 }}>
            טופס בקשת פגישה מקוון יעלה בקרוב (שלב M3). בינתיים, שוחחו עם טלי או
            פנו אלינו בטלפון ונשמח לתאם.
          </p>
        </div>
      </div>
    </section>
  );
}
