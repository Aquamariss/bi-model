import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BIModel — Modélisation métier",
  description: "Outil de modélisation de processus métier assisté par IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} h-full`}>
      <body
        className="min-h-full flex flex-col bg-slate-50 font-[var(--font-dm-sans)] antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
