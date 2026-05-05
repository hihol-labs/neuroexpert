import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { PricingContent } from "./pricing-content";

const TITLE = "Тарифы НейроЭксперт — заявки для экспертов и локального бизнеса";
const DESCRIPTION =
  "Выберите тарифы для эксперта или B2B: аудит видимости, запуск канала заявок за 30 дней, Local Sales OS, карта спроса, страницы, отзывы и потерянные лиды.";

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
