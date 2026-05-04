import type { Metadata } from "next";

const TITLE = "Как работает НейроЭксперт — от спроса до заявок";
const DESCRIPTION =
  "Пайплайн НейроЭксперта: карта спроса, голос эксперта, страница под вопрос, публикация, индексация, трафик, клики по записи, заявки и AI-упоминания.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/how-it-works" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
