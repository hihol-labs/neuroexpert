/**
 * Сверка webhook-события ЮKassa с состоянием платежа в API кассы (SEC-1).
 *
 * Webhook — лишь сигнал: до смены статуса заказа платёж/возврат перечитывается из
 * `GET /v3/payments/{id}` (`GET /v3/refunds/{id}`) по магазину заказа, и решение
 * принимается по ответу API, а не по телу уведомления. Тело уведомления может
 * подделать любой, кто прошёл IP-allowlist (например, через X-Forwarded-For);
 * ответ API — только владелец секретного ключа магазина.
 *
 * Функции чистые: HTTP-вызовы живут в apps/web/lib/yukassa-verify.ts, здесь —
 * только сравнение форм, чтобы правила были покрыты тестами без сети.
 */

export interface KassaShop {
  id: string;
  key: string;
  test: boolean;
}

export interface KassaAmount {
  value: string;
  currency: string;
}

export interface KassaPayment {
  id: string;
  status: string;
  test?: boolean;
  amount?: KassaAmount;
  metadata?: Record<string, unknown>;
}

export interface KassaRefund {
  id: string;
  status: string;
  payment_id: string;
  amount?: KassaAmount;
}

/** Минимальная форма package_orders, нужная для сверки. */
export interface ReconcileOrder {
  id: string;
  owner_id: string;
  package: string;
  amount_rub: number;
  yukassa_payment_id: string | null;
  payment_test: boolean | null;
  payment_shop_id: string | null;
}

export type ReconcileResult = { ok: true } | { ok: false; reason: string };

function amountRub(amount: KassaAmount | undefined): number | null {
  if (!amount || amount.currency !== "RUB") return null;
  const n = Number(amount.value);
  return Number.isFinite(n) ? n : null;
}

/** Магазины из env в порядке «тестовый, боевой»; пустые пары ключей отбрасываются. */
export function kassaShopsFromEnv(env: Record<string, string | undefined>): KassaShop[] {
  return [
    { id: env.YUKASSA_TEST_SHOP_ID, key: env.YUKASSA_TEST_SECRET_KEY, test: true },
    { id: env.YUKASSA_SHOP_ID, key: env.YUKASSA_SECRET_KEY, test: false },
  ].filter((s): s is KassaShop => Boolean(s.id && s.key));
}

/**
 * Магазин, в котором создан платёж заказа. Заказ фиксирует `payment_shop_id` и
 * `payment_test` при создании; для старых заказов без этих полей магазин не угадываем —
 * null означает «сверить нельзя», и событие не должно менять состояние.
 */
export function selectShopForOrder(order: ReconcileOrder, shops: KassaShop[]): KassaShop | null {
  const candidates = shops.filter(
    (s) => (order.payment_shop_id === null || s.id === order.payment_shop_id)
      && (order.payment_test === null || s.test === order.payment_test),
  );
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1 && order.payment_shop_id !== null) return candidates.find((s) => s.id === order.payment_shop_id) ?? null;
  return null;
}

/**
 * Платёж из API соответствует заказу и ожидаемому статусу: тот же id, магазин того же
 * режима, сумма = цена пакета в RUB, metadata указывает на этот заказ и владельца.
 */
export function assessPackagePayment(
  order: ReconcileOrder,
  payment: KassaPayment | null,
  expected: { status: "succeeded" | "canceled"; shop: KassaShop },
): ReconcileResult {
  if (!payment) return { ok: false, reason: "payment not found in kassa" };
  if (order.yukassa_payment_id && payment.id !== order.yukassa_payment_id) return { ok: false, reason: "payment id mismatch" };
  if (payment.status !== expected.status) return { ok: false, reason: `payment status ${payment.status}, expected ${expected.status}` };
  if (typeof payment.test === "boolean" && payment.test !== expected.shop.test) return { ok: false, reason: "payment test flag mismatch" };
  const rub = amountRub(payment.amount);
  if (rub === null || Math.round(rub) !== order.amount_rub) return { ok: false, reason: "payment amount mismatch" };
  const m = payment.metadata ?? {};
  if (m.type !== "package" || m.package !== order.package) return { ok: false, reason: "payment metadata package mismatch" };
  if (m.order_id !== order.id) return { ok: false, reason: "payment metadata order mismatch" };
  if (m.user_id !== order.owner_id) return { ok: false, reason: "payment metadata owner mismatch" };
  return { ok: true };
}

/** Возврат из API: успешный, по платежу этого заказа, не больше суммы заказа, в RUB. */
export function assessPackageRefund(
  order: ReconcileOrder,
  refund: KassaRefund | null,
  payment: KassaPayment | null,
  shop: KassaShop,
): ReconcileResult {
  const paymentCheck = assessPackagePayment(order, payment, { status: "succeeded", shop });
  if (!paymentCheck.ok) return paymentCheck;
  if (!refund) return { ok: false, reason: "refund not found in kassa" };
  if (refund.status !== "succeeded") return { ok: false, reason: `refund status ${refund.status}` };
  if (refund.payment_id !== order.yukassa_payment_id) return { ok: false, reason: "refund payment mismatch" };
  const rub = amountRub(refund.amount);
  if (rub === null || rub <= 0 || rub > order.amount_rub) return { ok: false, reason: "refund amount mismatch" };
  return { ok: true };
}

/** Legacy-контур экспертов: платёж принадлежит эксперту из уведомления и в ожидаемом статусе. */
export function assessExpertPayment(
  payment: KassaPayment | null,
  expected: { paymentId: string; expertId: string; status: "succeeded" | "canceled" },
): ReconcileResult {
  if (!payment) return { ok: false, reason: "payment not found in kassa" };
  if (payment.id !== expected.paymentId) return { ok: false, reason: "payment id mismatch" };
  if (payment.status !== expected.status) return { ok: false, reason: `payment status ${payment.status}, expected ${expected.status}` };
  if ((payment.metadata ?? {}).expert_id !== expected.expertId) return { ok: false, reason: "payment metadata expert mismatch" };
  if (amountRub(payment.amount) === null) return { ok: false, reason: "payment amount invalid" };
  return { ok: true };
}
