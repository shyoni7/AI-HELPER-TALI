import Link from "next/link";
import { site, treatments, values } from "@/content/site";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import HeroCalendar from "@/components/HeroCalendar";

export default function Home() {
  return (
    <>
      <ContainerScroll
        titleComponent={
          <div className="hero-title">
            <h1>{site.tagline}</h1>
            <p>{site.intro}</p>
            <div className="cta">
              <Link href="/contact" className="btn btn-primary">
                קביעת פגישה
              </Link>
              <Link href="/treatments" className="btn btn-ghost">
                לסוגי הטיפולים
              </Link>
            </div>
          </div>
        }
      >
        <HeroCalendar />
      </ContainerScroll>

      <section className="section">
        <div className="container">
          <h2>איך אנחנו עובדים</h2>
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

      <section className="section" style={{ background: "var(--sand)" }}>
        <div className="container">
          <h2>הטיפולים שלנו</h2>
          <div className="grid">
            {treatments.map((t) => (
              <div key={t.slug} className="card">
                <h3>{t.title}</h3>
                <p>{t.description}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <Link href="/therapists" className="btn btn-primary">
              הכירו את המטפלים
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
