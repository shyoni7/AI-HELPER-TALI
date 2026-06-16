import type { Metadata } from "next";
import Link from "next/link";
import { site, treatments } from "@/content/site";

export const metadata: Metadata = {
  title: `טיפולים — ${site.name}`,
  description: "סוגי הטיפולים המוצעים במרכז",
};

export default function TreatmentsPage() {
  return (
    <section className="section">
      <div className="container">
        <h1>הטיפולים שלנו</h1>
        <p style={{ maxWidth: "62ch", color: "var(--muted)" }}>
          מגוון גישות וטיפולים, בהתאמה אישית לצורך ולשפה. לא בטוחים מה מתאים?
          שוחחו עם טלי או קבעו פגישת היכרות.
        </p>
        <div className="grid" style={{ marginTop: "1.5rem" }}>
          {treatments.map((t) => (
            <div key={t.slug} className="card">
              <h3>{t.title}</h3>
              <p>{t.description}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/contact" className="btn btn-primary">
            קביעת פגישה
          </Link>
        </div>
      </div>
    </section>
  );
}
