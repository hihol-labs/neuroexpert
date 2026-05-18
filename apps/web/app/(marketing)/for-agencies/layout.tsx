import type { Metadata } from "next";

const TITLE = "Карта спроса и API спроса для агентств | НейроЭксперт";
const DESCRIPTION =
  "API с реальными вопросами людей: спрос в месяц, клиентское намерение, балл слабости ответа нейросети, оценка возможности и целевое действие для страниц под заявки.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for-agencies" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-agencies" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
