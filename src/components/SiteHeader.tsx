import Link from "next/link";
import { site } from "@/content/site";

const links = [
  { href: "/", label: "בית" },
  { href: "/about", label: "אודות" },
  { href: "/treatments", label: "טיפולים" },
  { href: "/therapists", label: "מטפלים" },
  { href: "/contact", label: "צרו קשר" },
];

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container inner">
        <Link href="/" className="brand">
          {site.name}
        </Link>
        <nav className="nav" aria-label="ניווט ראשי">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          <Link href="/contact" className="btn btn-primary" style={{ padding: "0.5rem 1rem" }}>
            קביעת פגישה
          </Link>
        </nav>
      </div>
    </header>
  );
}
