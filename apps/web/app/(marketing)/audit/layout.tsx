import type { Metadata } from "next";

const TITLE = "Бесплатная карта спроса | НейроЭксперт";
const DESCRIPTION =
  "Выберите нишу — покажем вопросы, по которым люди уже ищут решение, спрос в месяц, клиентское намерение, слабость ответов нейросетей и темы для первых страниц под заявки.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/audit" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/audit" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
