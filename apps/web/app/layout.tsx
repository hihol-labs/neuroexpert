import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "НейроЭксперт — AIO-платформа для экспертов",
  description:
    "Делаем экспертов видимыми для нейросетей и превращаем видимость в клиентов",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
