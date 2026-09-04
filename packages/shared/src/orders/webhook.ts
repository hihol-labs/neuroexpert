/**
 * Metadata платежа ЮKassa для пакетных заказов (G-018).
 *
 * Создание платежа пишет ровно эту форму; webhook читает её и ничему другому
 * не верит: без валидных `order_id`/`user_id`/`package` событие не относится
 * к пакетному контуру (это может быть expert-платёж) и обрабатывается прежней
 * веткой.
 */

import { isPackageId, type PackageId } from "./packages.js";

export interface PackagePaymentMetadata {
  type: "package";
  package: PackageId;
  order_id: string;
  user_id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildPackagePaymentMetadata(input: {
  package: PackageId;
  orderId: string;
  userId: string;
}): PackagePaymentMetadata {
  return { type: "package", package: input.package, order_id: input.orderId, user_id: input.userId };
}

export function parsePackageMetadata(raw: unknown): PackagePaymentMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (m.type !== "package") return null;
  if (!isPackageId(m.package)) return null;
  if (typeof m.order_id !== "string" || !UUID_RE.test(m.order_id)) return null;
  if (typeof m.user_id !== "string" || !UUID_RE.test(m.user_id)) return null;
  return { type: "package", package: m.package, order_id: m.order_id, user_id: m.user_id };
}
