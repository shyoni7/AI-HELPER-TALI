import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { getPublicTherapists } from "@/lib/queries/therapists";

export const metadata: Metadata = {
  title: `מטפלים — ${site.name}`,
  description: "צוות המטפלים של המרכז",
};

// Always render fresh from the DB (falls back to placeholders if empty).
export const dynamic = "force-dynamic";

const LANG_LABELS: Record<string, string> = {
  he: "עברית",
  en: "אנגלית",
  ru: "רוסית",
  ar: "ערבית",
};

export default async function TherapistsPage() {
  const therapists = await getPublicTherapists();

  return (
    <section className="section">
      <div className="container">
        <h1>הצוות שלנו</h1>
        <p style={{ maxWidth: "62ch", color: "var(--muted)" }}>
          הכירו את המטפלים. בעת קביעת פגישה תוכלו לבחור מטפל/ת מסוים/ת, או לבקש
          שנשבץ עבורכם את המתאים/ה ביותר.
        </p>

        <div className="grid" style={{ marginTop: "1.5rem" }}>
          {therapists.map((t) => (
            <div key={t.id} className="card">
              <h3>{t.full_name}</h3>
              {t.bio && <p>{t.bio}</p>}
              <div style={{ margin: "0.5rem 0" }}>
                {t.specialties.map((s) => (
                  <span key={s} className="tag">
                    {s}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: 0 }}>
                שפות: {t.languages.map((l) => LANG_LABELS[l] ?? l).join(", ")}
              </p>
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
