import type { Metadata } from "next";

const TITLE = "Как работает НейроЭксперт — от спроса до клиентов";
const DESCRIPTION =
  "Два сценария НейроЭксперта: для бизнеса — каналы привлечения, отзывы, конкуренты и повторные касания; для эксперта — спрос, голосовой ответ, страница и запись.";

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
