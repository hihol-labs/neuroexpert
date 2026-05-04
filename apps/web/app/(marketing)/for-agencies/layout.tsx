import type { Metadata } from "next";

const TITLE = "Карта спроса и Demand API для SEO/GEO-агентств | НейроЭксперт";
const DESCRIPTION =
  "JSON-эндпоинты с реальными вопросами людей: monthly_volume, intent, gap_score, слабость AI-ответа, opportunity_score и CTA для страниц под заявки.";

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
