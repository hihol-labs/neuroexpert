import type { Metadata } from "next";

const TITLE = "НейроЭксперт для бизнеса — клиенты из поиска и нейросетей";
const DESCRIPTION =
  "Находим реальные вопросы клиентов, превращаем ответы экспертов компании в брендированные страницы и измеряем путь до заявок: индексация, трафик, клики и обращения.";

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
