/**
 * Яндекс.Метрика (G-012): единственное место, где читается id счётчика, и
 * фиксированный словарь целей воронки. Имена целей совпадают с целями в
 * интерфейсе Метрики (тип «JavaScript-событие») — оракул verify-analytics.mjs
 * проверяет, что каждая цель вызывается в своём продюсере.
 *
 * Client-safe: без window вызовы — no-op; без id (dark/dev) — no-op.
 * В параметры целей не передаём PII (email, имя, контакт).
 */

export const YM_ID = (process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ?? "").trim();

export const YM_GOALS = {
  /** /scan — бесплатная проверка видимости отправлена (лид-магнит «скан»). */
  lead_scan_submit: "lead_scan_submit",
  /** /audit — бесплатная карта спроса собрана (лид-магнит «аудит»). */
  lead_audit_submit: "lead_audit_submit",
  /** /order/audit-start — форма заказа отправлена (заявка). */
  order_form_submit: "order_form_submit",
  /** заказ создан, переход в кассу ЮKassa. */
  order_checkout_redirect: "order_checkout_redirect",
  /** заказ по паре «вертикаль × город» — данные ещё собираются (202). */
  order_pair_collecting: "order_pair_collecting",
  /** /orders/[id] — заказ оплачен/выдан (страница владельца, один раз на заказ). */
  order_paid: "order_paid",
  /** /for-agencies — заявка агентства отправлена (контакт). */
  contact_agency_submit: "contact_agency_submit",
  /** клик по любой ссылке на /order/audit-start (CTA заказа). */
  cta_order_click: "cta_order_click",
} as const;

export type YmGoal = keyof typeof YM_GOALS;
export type YmGoalParams = Record<string, string | number | boolean>;

type YmFn = (id: number, method: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    ym?: YmFn;
  }
}

/** Счётчик включён: id задан при сборке и похож на номер счётчика. */
export function ymEnabled(): boolean {
  return /^\d{5,}$/.test(YM_ID);
}

function ym(method: string, ...args: unknown[]): void {
  if (typeof window === "undefined" || !ymEnabled() || typeof window.ym !== "function") return;
  try {
    window.ym(Number(YM_ID), method, ...args);
  } catch {
    // аналитика никогда не роняет UI
  }
}

/** Цель воронки; неизвестное имя не компилируется. */
export function reachGoal(goal: YmGoal, params?: YmGoalParams): void {
  ym("reachGoal", YM_GOALS[goal], params);
}

/** Просмотр страницы при клиентской навигации App Router. */
export function ymHit(url: string): void {
  ym("hit", url);
}
