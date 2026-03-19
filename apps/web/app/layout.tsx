import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "НейроЭксперт — AI-система, которая превращает экспертизу в клиентов",
  description:
    "Наговори 10 минут — получи клиентов из поиска и нейросетей. Без написания текстов, без SMM, без бюджета на рекламу.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/apple-icon" />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src={`${process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || "https://plausible.io"}/js/script.js`}
          />
        )}
        {process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
                ym(${process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID},"init",{
                  clickmap:true,
                  trackLinks:true,
                  accurateTrackBounce:true,
                  webvisor:true,
                  trackHash:true
                });
              `,
            }}
          />
        )}
      </head>
      <body className={inter.className}>
        <Providers>
        {children}
        </Providers>
        {process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID && (
          <noscript>
            <div>
              <img
                src={`https://mc.yandex.ru/watch/${process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID}`}
                style={{ position: "absolute", left: "-9999px" }}
                alt=""
              />
            </div>
          </noscript>
        )}
      </body>
    </html>
  );
}
