import type { Metadata } from "next";

// Применяется только к /scan (форма). Для /scan/[slug] приоритет у generateMetadata в [slug]/page.tsx.

const TITLE = "Проверка спроса в нейросетях | НейроЭксперт";
const DESCRIPTION =
  "Проверьте, находят ли нейросети вас или конкурента по запросам клиентов. Сравнение ответов, потерянный спрос и следующий шаг к страницам под заявки.";

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
