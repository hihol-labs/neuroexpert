import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Providers } from "@/components/providers";
import { YandexMetrika } from "@/components/yandex-metrika";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
} from "@/lib/schema-org";
import "./globals.css";

/* eslint-disable @next/next/no-img-element */

const fontClassName = "font-sans";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";
const SITE_TITLE = "НейроЭксперт — Local Sales OS для заявок и продаж";
const SITE_DESCRIPTION =
  "Помогаем локальному бизнесу пройти путь: спрос → точка входа → действие клиента → заявка, запись или продажа.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "НейроЭксперт",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "ru_RU",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "НейроЭксперт",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const globalSchemas = [
    generateOrganizationSchema(),
    generateWebSiteSchema(),
  ];

  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon" />
        {globalSchemas.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className={fontClassName}>
        <Providers>
        {children}
        </Providers>
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            id="plausible-analytics"
            strategy="lazyOnload"
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src={`${process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || "https://plausible.io"}/js/script.js`}
          />
        )}
        {/* Яндекс.Метрика (G-012): id и настройки — только в components/yandex-metrika + lib/analytics. */}
        <YandexMetrika />
      </body>
    </html>
  );
}
