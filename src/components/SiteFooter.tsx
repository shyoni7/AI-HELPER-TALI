import { site } from "@/content/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <strong>{site.name}</strong> · {site.address}
        <br />
        טלפון: {site.phone} · דוא״ל: {site.email}
        <br />
        <span style={{ fontSize: "0.85rem" }}>
          המידע באתר אינו מהווה תחליף לייעוץ מקצועי. במצב חירום נפשי פנו לעזרה
          דחופה (ער״ן 1201 / מד״א 101).
        </span>
      </div>
    </footer>
  );
}
