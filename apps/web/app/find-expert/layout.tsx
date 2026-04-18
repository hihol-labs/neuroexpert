import type { Metadata } from "next";

const TITLE = "Подберём эксперта — НейроЭксперт";
const DESCRIPTION =
  "Поиск специалиста по описанию задачи: Trust Score, рейтинг, отзывы, цена консультации, онлайн-запись. Психологи, юристы, нутрициологи, финансисты.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/find-expert" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/find-expert" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
