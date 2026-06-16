import type { Metadata } from "next";
import "./globals.css";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `${site.name} — מרכז טיפולים`,
  description: site.intro,
};

// Root layout holds only the html/body shell. Section-specific chrome lives in
// the (site) and staff layouts so the staff area doesn't inherit the marketing
// header/footer/chat widget.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
