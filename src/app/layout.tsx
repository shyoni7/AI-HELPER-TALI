import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מרכז מטפלים — עוזר/ת AI",
  description: "צ'אט תמיכה, תיאום פגישות ורשימת המתנה חכמה",
};

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
