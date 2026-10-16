"use client";
import Link from "next/link";
import { useOrderHref } from "./checkout-context";

/**
 * Единая CTA-цепочка «пример → лид-магнит → оплата» (G-013). Рендерится из
 * OfferBlock, поэтому присутствует на всех 9 маршрутах воронки. Атрибуты
 * data-proof-link — контракт с оракулом scripts/verify-proof-layer.mjs.
 * Ссылка заказа приходит из серверного layout группы marketing (checkout-context):
 * при dark — форма заявки Launch, при live — автономный заказ; цель Метрики
 * cta_order_click ловится по href (G-012).
 */
export function ProofStrip() {
  const orderHref = useOrderHref();
  return (
    <nav className="sr-proof-strip" aria-label="Пример отчёта, бесплатная карта спроса и заказ" style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 32px", display: "flex", flexWrap: "wrap", gap: 12 }}>
      <Link data-proof-link="example" href="/audit/example" className="sr-button">Посмотреть пример отчёта</Link>
      <Link data-proof-link="lead" href="/audit" className="sr-button">Бесплатная карта спроса</Link>
      <Link data-proof-link="order" href={orderHref} className="sr-button">Заказать Audit Start</Link>
    </nav>
  );
}
