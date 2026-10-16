"use client";
/* eslint-disable @next/next/no-img-element */
// Счётчик Яндекс.Метрики (G-012). Id — только из lib/analytics (env при сборке).
// Настройки: webvisor:false (решение владельца 2026-09-06 — формы содержат email,
// privacy обещает обезличенные метрики), hit на смену маршрута App Router,
// делегированная цель cta_order_click по клику на ссылку в /order/audit-start.
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { YM_ID, reachGoal, ymEnabled, ymHit } from "@/lib/analytics";

const ORDER_PATH = "/order/audit-start";

export function YandexMetrika() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  // Первый просмотр отправляет сам init; дальше — клиентские переходы без перезагрузки.
  useEffect(() => {
    if (!ymEnabled()) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    ymHit(window.location.href);
  }, [pathname]);

  // CTA заказа расставлены по всем лендингам — одна делегированная цель вместо правок в каждом.
  useEffect(() => {
    if (!ymEnabled()) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href === ORDER_PATH || href.startsWith(`${ORDER_PATH}?`) || href.startsWith(`${ORDER_PATH}#`)) {
        reachGoal("cta_order_click", { from: window.location.pathname });
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (!ymEnabled()) return null;

  return (
    <>
      <Script
        id="yandex-metrika"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
            ym(${YM_ID},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false,trackHash:true});
          `,
        }}
      />
      <span data-ym-id={YM_ID} hidden />
      <noscript>
        <div>
          <img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: "absolute", left: "-9999px" }} alt="" />
        </div>
      </noscript>
    </>
  );
}
