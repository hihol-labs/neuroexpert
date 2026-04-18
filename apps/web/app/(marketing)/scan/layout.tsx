import type { Metadata } from "next";

// Применяется только к /scan (форма). Для /scan/[slug] приоритет у generateMetadata в [slug]/page.tsx.

const TITLE = "AI Visibility Scanner — проверьте видимость в нейросетях | НейроЭксперт";
const DESCRIPTION =
  "Проверьте, упоминают ли вас ChatGPT, Perplexity и YandexGPT. Сравнение с конкурентом, Share of Voice, детальный отчёт за 10-40 секунд. Бесплатно.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/scan" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/scan" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
