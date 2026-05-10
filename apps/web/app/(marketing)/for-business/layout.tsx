import type { Metadata } from "next";

const TITLE = "Система локальных продаж для бизнеса | НейроЭксперт";
const DESCRIPTION =
  "Показываем, где бизнес теряет клиентов в картах, 2ГИС, Авито, отзывах, сайте, звонках, поиске и ответах нейросетей, и запускаем систему роста продаж.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for-business" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-business" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
