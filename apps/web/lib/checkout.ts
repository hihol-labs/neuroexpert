/**
 * Серверный флаг публичного checkout (G-018, dark launch).
 *
 * Пока SELF_SERVE_CHECKOUT !== "live", все публичные CTA пакета «Аудит Старт»
 * ведут на форму заявки /launch, а /order/audit-start и POST /api/orders
 * отвечают 404 (кроме канарейки). Включение — одной переменной окружения,
 * атомарно для всех маршрутов; читается только на сервере (не NEXT_PUBLIC_),
 * поэтому не требует пересборки образа.
 */

export const LAUNCH_AUDIT_START_HREF = "/launch?package=audit_start";
export const ORDER_AUDIT_START_HREF = "/order/audit-start";

export function checkoutLive(): boolean {
  return process.env.SELF_SERVE_CHECKOUT === "live";
}

export function auditStartHref(): string {
  return checkoutLive() ? ORDER_AUDIT_START_HREF : LAUNCH_AUDIT_START_HREF;
}
