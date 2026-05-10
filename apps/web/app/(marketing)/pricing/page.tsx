import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { PricingContent } from "./pricing-content";

const TITLE = "Тарифы НейроЭксперт — заявки для экспертов и локального бизнеса";
const DESCRIPTION =
  "Выберите тариф для эксперта или бизнеса: аудит видимости, запуск канала заявок за 30 дней, система локальных продаж, карта спроса, страницы, отзывы и потерянные обращения.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/pricing" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <PricingContent />
      <MarketingFooter />
    </div>
  );
}
