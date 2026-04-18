import type { Metadata } from "next";

const TITLE = "Бесплатный аудит AI-видимости | НейроЭксперт";
const DESCRIPTION =
  "Выберите нишу — покажем до 10 вопросов, где AI даёт слабые ответы. Проверка по ChatGPT, Perplexity, YandexGPT, GigaChat. gap_score, monthly_volume, 4 маркера качества.";

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
