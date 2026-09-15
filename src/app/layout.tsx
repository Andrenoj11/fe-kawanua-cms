import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Kawanua Media · CMS", template: "%s · Kawanua CMS" },
  description: "Ruang redaksi digital Kawanua Media",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
