import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { PricingContent } from "./pricing-content";
import { generateServiceSchema } from "@/lib/schema-org";
import { OfferBlock } from "@/components/marketing/offer";
import { auditStartHref } from "@/lib/checkout";

const TITLE = "Тарифы НейроЭксперт — Local Sales OS, заявки и продажи";
const DESCRIPTION =
  "Выберите тариф для бизнеса или эксперта: спрос → точка входа → действие клиента → заявка, запись или продажа.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/pricing" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function PricingPage({ searchParams }: { searchParams?: { for?: string } }) {
  // Аудитория приходит query-параметром, а не якорем: hash браузер серверу не
  // отправляет, поэтому при hash-подходе страница успевала отрисовать бизнес-
  // пакеты и только потом переключиться (находка раунда 24). С параметром
  // выбор известен уже на сервере — переключения на глазах у клиента нет.
  const initialAudience = searchParams?.for === "expert" ? "expert" : "business";
  const schemas = [
    generateServiceSchema({
      name: "Тарифы НейроЭксперт",
      description: DESCRIPTION,
      url: `${APP_URL}/pricing`,
      serviceType: "Local sales and demand generation SaaS",
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
    <div className="sr-site pricing-site">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <MarketingHeader />
      <PricingContent initialAudience={initialAudience} auditStartHref={auditStartHref()}>
        <OfferBlock
          artifact="Аудит, запуск или сопровождение — по выбранному пакету"
          price="7 900 ₽ аудит · 31 100 ₽ запуск · 29 000 ₽/мес сопровождение"
          term="3–7 дней · 30 дней · ежемесячно"
          cta={{ href: "/launch?package=audit_start", label: "Начать с аудита за 7 900 ₽" }}
        />
      </PricingContent>
      <MarketingFooter />
    </div>
  );
}
