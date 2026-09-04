/**
 * Машина состояний автономного пакетного заказа (G-018).
 *
 *   pending --payment.succeeded--> paid --refund.succeeded--> refunded
 *   pending --payment.canceled---> failed
 *
 * Повтор события, уже приведшего к целевому статусу, — идемпотентный no-op
 * (`changed: false`), а не ошибка: ЮKassa может доставить webhook повторно.
 * Любой другой переход запрещён и возвращает `error` — вызывающий не должен
 * «чинить» статус вручную.
 *
 * Имена с префиксом Package*: `OrderStatus` в constants.ts — статусы заказов
 * экспертам (другой контур).
 */

export type PackageOrderStatus = "pending" | "paid" | "failed" | "refunded";
export type PackageOrderEvent = "payment.succeeded" | "payment.canceled" | "refund.succeeded";

export type PackageOrderTransition =
  | { ok: true; next: PackageOrderStatus; changed: boolean }
  | { ok: false; error: string };

const TARGET: Record<PackageOrderEvent, PackageOrderStatus> = {
  "payment.succeeded": "paid",
  "payment.canceled": "failed",
  "refund.succeeded": "refunded",
};

const ALLOWED_FROM: Record<PackageOrderEvent, PackageOrderStatus[]> = {
  "payment.succeeded": ["pending"],
  "payment.canceled": ["pending"],
  "refund.succeeded": ["paid"],
};

export function transition(current: PackageOrderStatus, event: PackageOrderEvent): PackageOrderTransition {
  const target = TARGET[event];
  if (!target) return { ok: false, error: `unknown event ${String(event)}` };
  if (current === target) return { ok: true, next: target, changed: false };
  if (!ALLOWED_FROM[event].includes(current)) {
    return { ok: false, error: `illegal transition ${current} --${event}--> ${target}` };
  }
  return { ok: true, next: target, changed: true };
}

/** Job аудита ставится ровно один раз: только из paid и только если ещё не поставлен. */
export function mayEnqueueAuditJob(status: PackageOrderStatus, existingJobId: string | null): boolean {
  return status === "paid" && !existingJobId;
}
