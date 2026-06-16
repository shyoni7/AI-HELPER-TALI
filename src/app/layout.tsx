import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChatWidget from "@/components/ChatWidget";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `${site.name} — מרכז טיפולים`,
  description: site.intro,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <ChatWidget />
      </body>
    </html>
  );
}
