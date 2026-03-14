import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "НейроЭксперт — AI-система, которая превращает экспертизу в клиентов",
  description:
    "Наговори 10 минут — получи клиентов из поиска и нейросетей. Без написания текстов, без SMM, без бюджета на рекламу.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/apple-icon" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
