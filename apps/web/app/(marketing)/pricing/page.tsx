import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { PricingContent } from "./pricing-content";
import { generateServiceSchema } from "@/lib/schema-org";

const TITLE = "Тарифы НейроЭксперт — заявки для экспертов и локального бизнеса";
const DESCRIPTION =
  "Выберите тариф для эксперта или бизнеса: аудит видимости, запуск канала привлечения клиентов за 30 дней, система локальных продаж, карта спроса, страницы, отзывы и повторные касания.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/pricing" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function PricingPage() {
  const schemas = [
    generateServiceSchema({
      name: "Тарифы НейроЭксперт",
      description: DESCRIPTION,
      url: `${APP_URL}/pricing`,
      serviceType: "AI visibility, expert content and local sales SaaS",
      offers: [
        { name: "Free", price: "0", url: `${APP_URL}/pricing` },
        { name: "Starter", price: "1490", url: `${APP_URL}/pricing` },
        { name: "Pro", price: "2990", url: `${APP_URL}/pricing` },
        { name: "Expert", price: "4990", url: `${APP_URL}/pricing` },
        { name: "Аудит Старт", price: "7900", url: `${APP_URL}/launch?package=audit_start` },
        { name: "Запуск Старт", price: "31100", url: `${APP_URL}/launch?package=launch_start` },
        { name: "Сопровождение Лайт", price: "29000", url: `${APP_URL}/launch?package=support_control` },
      ],
    }),
  ];

  return (
    <div className="min-h-screen">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <MarketingHeader />
      <PricingContent />
      <MarketingFooter />
    </div>
  );
}
