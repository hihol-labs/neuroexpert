import type { Metadata } from "next";

const TITLE = "Как работает НейроЭксперт — от голоса до цитирования в AI";
const DESCRIPTION =
  "Пайплайн за 2-4 недели: поиск спроса → заказ в Telegram → запись голоса → 5 форматов контента → публикация → трекинг цитирований. 4 AI-платформы: ChatGPT, Perplexity, YandexGPT, GigaChat.";

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
