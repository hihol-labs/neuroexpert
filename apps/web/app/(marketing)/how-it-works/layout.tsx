import type { Metadata } from "next";

const TITLE = "Как работает НейроЭксперт — от спроса до заявок";
const DESCRIPTION =
  "Два сценария НейроЭксперта: для бизнеса — карта потерь клиентов и задачи роста продаж, для эксперта — спрос, голосовой ответ, страница и запись.";

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
