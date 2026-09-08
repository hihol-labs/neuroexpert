import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decidePendingOrder, kassaShopsFromEnv, selectShopForOrder, assessPackagePayment, transition, mayEnqueueAuditJob, activateLocalPair,
  type KassaPayment, type KassaShop, type PackageOrderStatus, type NotifyOperator,
} from "shared";

/**
 * R-01 (ADR-004): периодическая сверка pending/expired-заказов Audit Start с кассой.
 *
 * Потерянный `payment.succeeded` webhook добирается отсюда: платёж в кассе succeeded и
 * идентичность сошлась (assessPackagePayment) -> тот же результат, что у webhook (paid + job +
 * письмо-ссылка). Webhook ставит job вручную (insert + claim с guard job_id IS NULL, откат
 * лишнего), здесь — атомарный RPC ensure_package_audit_job (тот же, что у SLA-свипа): оба пути
 * идемпотентны по job_id, поэтому гонка webhook <-> сверка не даёт второго job.
 * `canceled` -> failed (денег нет). pending старше окна PACKAGE_ORDER_EXPIRE_MINUTES -> expired;
 * оплата после expired всё равно принимается (state.ts). Касса не мутируется; только чтение.
 * Историческая массовая обработка исключена: limit 100 за проход, старые первыми.
 */
type Env = Record<string, string | undefined>;
type Row = {
  id: string; owner_id: string; email: string; package: string; status: PackageOrderStatus & ("pending" | "expired");
  amount_rub: number; yukassa_payment_id: string | null; payment_test: boolean | null; payment_shop_id: string | null;
  job_id: string | null; created_at: string; niche_id: string | null;
};
export interface ReconcileDependencies {
  admin: SupabaseClient;
  /** Письмо-ссылка на страницу статуса (magic link), как после webhook. */
  sendStatusLink: (email: string, orderId: string) => Promise<void>;
  fetch?: typeof fetch;
  env?: Env;
  now?: () => number;
  log?: (line: string) => void;
  /** R-02: алерты оператору (identity mismatch, ошибки прохода); никогда не бросает. */
  notifyOperator?: NotifyOperator;
}
export interface ReconcileSummary { scanned: number; paid: number; failed: number; expired: number; kept: number; errors: number }

export function createPaymentReconcile(deps: ReconcileDependencies) {
  const { admin } = deps, env = deps.env ?? process.env, http = deps.fetch ?? fetch, now = deps.now ?? Date.now;
  const log = deps.log ?? ((line: string) => console.log(line));
  const iso = () => new Date(now()).toISOString();
  const expireAfterMs = Math.max(1, Number(env.PACKAGE_ORDER_EXPIRE_MINUTES || 1440)) * 60000;
  const checked = <T>(result: { data: T; error: { message: string } | null }): T => {
    if (result.error) throw new Error(`reconcile database: ${result.error.message}`);
    return result.data;
  };

  async function getPayment(shop: KassaShop, paymentId: string): Promise<KassaPayment | null> {
    const res = await http(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET", redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${shop.id}:${shop.key}`).toString("base64")}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`yukassa HTTP ${res.status}`);
    return await res.json() as KassaPayment;
  }

  async function markPaid(order: Row, payment: KassaPayment, shop: KassaShop) {
    // Двойная проверка на границе записи: решение и запись используют одну и ту же сверку.
    const check = assessPackagePayment(order, payment, { status: "succeeded", shop });
    if (!check.ok) throw new Error(`reconcile: ${check.reason}`);
    const t = transition(order.status, "payment.succeeded");
    if (!t.ok) throw new Error(t.error);
    if (t.changed) {
      checked(await admin.from("package_orders")
        .update({ status: "paid", paid_at: iso(), yukassa_payment_id: payment.id, payment_test: shop.test, payment_shop_id: shop.id, reconciled_at: iso() })
        .eq("id", order.id).in("status", ["pending", "expired"]));
    }
    if (mayEnqueueAuditJob("paid", order.job_id)) checked(await admin.rpc("ensure_package_audit_job", { p_order_id: order.id }));
    // R-03: оплаченная локальная пара попадает в еженедельный сбор спроса (idempotent, ошибка не ломает оплату).
    try { await activateLocalPair(admin, order.niche_id); }
    catch (e) { log(`[reconcile] pair activation for ${order.id} failed: ${e instanceof Error ? e.message : String(e)}`); }
    try { await deps.sendStatusLink(order.email, order.id); }
    catch (e) { log(`[reconcile] status email for ${order.id} failed: ${e instanceof Error ? e.message : String(e)}`); }
  }

  async function run(): Promise<ReconcileSummary> {
    const s: ReconcileSummary = { scanned: 0, paid: 0, failed: 0, expired: 0, kept: 0, errors: 0 };
    const shops = kassaShopsFromEnv(env);
    const rows = checked(await admin.from("package_orders")
      .select("id, owner_id, email, package, status, amount_rub, yukassa_payment_id, payment_test, payment_shop_id, job_id, created_at, niche_id")
      .in("status", ["pending", "expired"]).order("created_at").limit(100)) as Row[] | null;
    for (const order of rows ?? []) {
      s.scanned += 1;
      try {
        const shop = order.yukassa_payment_id ? selectShopForOrder(order, shops) : null;
        // Ошибка транспорта кассы — заказ пропускается до следующего прохода, не протухает.
        const payment = shop && order.yukassa_payment_id ? await getPayment(shop, order.yukassa_payment_id) : null;
        const d = decidePendingOrder(order, payment, { now: now(), expireAfterMs, shop });
        if (d.action === "mark_paid") { await markPaid(order, payment as KassaPayment, shop as KassaShop); s.paid += 1; log(`[reconcile] ${order.id}: lost webhook recovered -> paid`); }
        else if (d.action === "mark_failed") {
          // Переходы — через машину состояний shared (единый источник правил), WHERE — страховка от гонки.
          const t = transition(order.status, "payment.canceled");
          if (!t.ok) throw new Error(t.error);
          checked(await admin.from("package_orders").update({ status: "failed", failure_reason: d.reason, reconciled_at: iso() })
            .eq("id", order.id).in("status", ["pending", "expired"]));
          s.failed += 1;
        } else if (d.action === "expire") {
          const t = transition(order.status, "order.expired");
          if (!t.ok) throw new Error(t.error);
          checked(await admin.from("package_orders").update({ status: "expired", expired_at: iso(), reconciled_at: iso() })
            .eq("id", order.id).eq("status", "pending"));
          s.expired += 1;
        } else {
          s.kept += 1;
          // order.expired: оплата после протухания принимается на следующем проходе — см. decidePendingOrder.
          if (d.reason.startsWith("succeeded but")) {
            log(`[reconcile] ${order.id}: payment succeeded but identity mismatch (${d.reason}); needs operator`);
            // R-02: деньги списаны, но платёж не соответствует заказу — решение только оператора.
            // fire-and-forget: notifier не бросает, а ожидание таймаута Telegram на каждом заказе растянуло бы проход.
            void deps.notifyOperator?.("reconcile_mismatch", order.id, { заказ: order.id, платеж: order.yukassa_payment_id, причина: d.reason, сумма_заказа: order.amount_rub });
          }
        }
      } catch (e) {
        s.errors += 1;
        log(`[reconcile] ${order.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    // R-02: ошибки прохода (касса/БД) — один алерт в час, чтобы тихий отказ сверки не остался незамеченным.
    if (s.errors > 0) void deps.notifyOperator?.("reconcile_errors", null, { ошибок: s.errors, просмотрено: s.scanned, paid: s.paid, expired: s.expired });
    return s;
  }
  return { run };
}
