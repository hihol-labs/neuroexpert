import type { Metadata } from "next";
import { generateServiceSchema } from "@/lib/schema-org";

const TITLE = "Система локальных продаж для бизнеса | НейроЭксперт";
const DESCRIPTION =
  "Показываем, где бизнес теряет клиентов в картах, 2ГИС, Авито, отзывах, сайте, звонках, поиске и ответах нейросетей, и запускаем систему роста продаж.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for-business" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-business" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const schemas = [
    generateServiceSchema({
      name: "Local Sales OS от НейроЭксперт",
      description: DESCRIPTION,
      url: `${APP_URL}/for-business`,
      serviceType: "Local sales visibility and demand generation SaaS",
      offers: [
        { name: "Аудит продаж", price: "7900", url: `${APP_URL}/for-business#form` },
        { name: "Запуск за 30 дней", price: "31100", url: `${APP_URL}/launch?package=local_sales_os` },
        { name: "Сопровождение продаж", price: "29000", url: `${APP_URL}/for-business#form` },
      ],
    }),
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
