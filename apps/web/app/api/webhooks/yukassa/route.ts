import { NextRequest, NextResponse } from "next/server";
import {
  assessExpertPayment,
  assessPackagePayment,
  assessPackageRefund,
  mayEnqueueAuditJob,
  parsePackageMetadata,
  selectShopForOrder,
  transition,
  type KassaShop,
  type PackageOrderStatus,
  type ReconcileOrder,
} from "shared";
import { activateLocalPair } from "shared";
import { createClient } from "@supabase/supabase-js";
import { notifyOperator } from "@/lib/operator-alerts";
import { KassaUnavailableError, fetchKassaPayment, fetchKassaRefund, kassaShops } from "@/lib/yukassa-verify";

const WEBHOOK_SECRET = process.env.YUKASSA_WEBHOOK_SECRET || "";

// Публичный список IP-диапазонов ЮKassa для webhook-уведомлений
// (https://yookassa.ru/developers/using-api/webhooks#ip). Можно переопределить
// через YUKASSA_WEBHOOK_IP_ALLOWLIST (comma-separated CIDR или IP). Пустая
// строка отключает IP-проверку (не рекомендуется для prod).
const DEFAULT_YUKASSA_IPS = [
  "185.71.76.0/27",
  "185.71.77.0/27",
  "77.75.153.0/25",
  "77.75.156.11",
  "77.75.156.35",
  "77.75.154.128/25",
  "2a02:5180::/32",
];

function allowlistedIps(): string[] {
  const env = process.env.YUKASSA_WEBHOOK_IP_ALLOWLIST;
  if (env === undefined) return DEFAULT_YUKASSA_IPS;
  if (env.trim() === "") return []; // явное отключение
  return env.split(",").map((s) => s.trim()).filter(Boolean);
}

function ipToUint32(ip: string): number | null {
  if (ip.includes(":")) return null; // IPv6 обрабатывается отдельно (по префиксу строки)
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  // >>> 0 приводит результат к unsigned 32-bit
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipMatchesCidr(clientIp: string, cidrOrIp: string): boolean {
  if (!cidrOrIp.includes("/")) return clientIp === cidrOrIp;
  if (cidrOrIp.includes(":")) return clientIp.toLowerCase().startsWith(cidrOrIp.split("/")[0].toLowerCase().replace(/::$/, ""));
  const [subnet, bitsStr] = cidrOrIp.split("/");
  const bits = Number(bitsStr);
  const client = ipToUint32(clientIp);
  const net = ipToUint32(subnet);
  if (client === null || net === null || isNaN(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (client & mask) >>> 0 === (net & mask) >>> 0;
}

function extractClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

type Admin = ReturnType<typeof getAdmin>;

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://neuroexpertise.ru").replace(/\/$/, "");
}

/**
 * SEC-1: IP-allowlist и секрет в URL — первый рубеж; источник истины — API кассы.
 * Любая смена состояния заказа (paid / failed / refunded) делается только после
 * перечитывания платежа (и возврата) из ЮKassa по магазину заказа и сравнения
 * с заказом (`assessPackagePayment` / `assessPackageRefund`). Подделанное тело
 * уведомления, прошедшее allowlist (например, через X-Forwarded-For), ничего
 * не меняет. Недоступность API кассы → 503, касса повторит уведомление.
 */
const PACKAGE_ORDER_FIELDS = "id, owner_id, email, package, amount_rub, niche_id, city, status, job_id, yukassa_payment_id, payment_test, payment_shop_id";

type PackageOrderRow = ReconcileOrder & {
  email: string;
  niche_id: string;
  city: string;
  status: string;
  job_id: string | null;
};

function shopForOrder(order: ReconcileOrder, context: string): KassaShop | null {
  const shop = selectShopForOrder(order, kassaShops());
  if (!shop) console.error(`[yukassa] ${context}: shop for order ${order.id} is not configured — event ignored`);
  return shop;
}

/**
 * Пакетный заказ оплачен (G-018). Инварианты: статус меняется только через
 * машину состояний; job аудита ставится ровно один раз (guard `job_id IS NULL`
 * на UPDATE — параллельный повтор webhook не создаст второй job); письмо со
 * ссылкой на статус уходит сразу после оплаты (решение AF-1 №2) как magic link
 * — без отдельного почтового транспорта.
 */
async function handlePackagePaymentSucceeded(
  admin: Admin,
  orderId: string,
  paymentId: string,
): Promise<void> {
  const { data } = await admin
    .from("package_orders")
    .select(PACKAGE_ORDER_FIELDS)
    .eq("id", orderId)
    .maybeSingle();
  const order = data as PackageOrderRow | null;
  if (!order) {
    console.error(`[yukassa] package order ${orderId} not found for payment ${paymentId}`);
    return;
  }
  if (order.yukassa_payment_id && order.yukassa_payment_id !== paymentId) {
    console.error(`[yukassa] payment ${paymentId} does not match order ${orderId} (${order.yukassa_payment_id})`);
    return;
  }

  // Сверка с API кассы: id, статус succeeded, режим магазина, сумма пакета, metadata заказа.
  const shop = shopForOrder(order, "payment.succeeded");
  if (!shop) return;
  const verified = await fetchKassaPayment(shop, paymentId);
  const check = assessPackagePayment(order, verified, { status: "succeeded", shop });
  if (!check.ok) {
    console.warn(`[yukassa] payment.succeeded for order ${orderId} rejected by kassa reconciliation: ${check.reason}`);
    return;
  }

  const t = transition(order.status as PackageOrderStatus, "payment.succeeded");
  if (!t.ok) {
    console.error(`[yukassa] order ${orderId}: ${t.error}`);
    return;
  }
  if (t.changed) {
    const { error } = await admin
      .from("package_orders")
      .update({ status: "paid", paid_at: new Date().toISOString(), yukassa_payment_id: paymentId })
      .eq("id", orderId)
      // R-01: оплата по старой ссылке после протухания (expired) тоже принимается.
      .in("status", ["pending", "expired"]);
    if (error) throw new Error("Package payment database update failed");
    // R-03: оплаченная локальная пара попадает в еженедельный сбор спроса (только при реальном
    // переходе в paid — повтор webhook не делает лишний UPDATE); ошибка активации не ломает оплату.
    try { await activateLocalPair(admin, order.niche_id); }
    catch (err) { console.error(`[yukassa] pair activation for order ${orderId} failed:`, err instanceof Error ? err.message : err); }
    // R-04' (R-04b): триггер ручного чека самозанятого - ЮKassa чеки самозанятых не формирует.
    // Только при реальном переходе в paid; fire-and-forget, оплату не задерживает и не ломает.
    try {
      void notifyOperator("order_paid", orderId, {
        заказ: orderId, сумма: `${order.amount_rub} руб`, email: order.email, пакет: order.package,
        ссылка: `${appUrl()}/orders/${orderId}`, тест: order.payment_test ? "да (тестовый магазин, чек не нужен)" : "",
      });
    } catch (err) {
      // Ленивая инициализация адаптера может бросить синхронно (env) - оплату это не касается.
      console.error(`[yukassa] order_paid alert for order ${orderId} failed:`, err instanceof Error ? err.message : err);
    }
  }

  if (mayEnqueueAuditJob("paid", order.job_id)) {
    const { data: job, error: jobError } = await admin
      .from("jobs")
      .insert({
        type: "run_audit",
        priority: 1,
        payload: { order_id: orderId, package: order.package, niche_id: order.niche_id, city: order.city, owner_id: order.owner_id },
      })
      .select("id")
      .single();
    if (jobError) throw new Error("Package audit job insert failed");
    if (job?.id) {
      const { data: claimed, error: claimError } = await admin
        .from("package_orders")
        .update({ job_id: job.id })
        .eq("id", orderId)
        .eq("status", "paid")
        .is("job_id", null)
        .select("id");
      if (claimError) throw new Error("Package audit job attach failed");
      if (!claimed || claimed.length === 0) {
        // Параллельный повтор webhook успел раньше — наш job лишний.
        await admin.from("jobs").delete().eq("id", job.id);
      }
    }
  }

  if (t.changed) {
    // Письмо со ссылкой на статус = magic link на /orders/{id}; отправляет
    // Supabase Auth через сконфигурированный SMTP. Ошибка отправки не откатывает
    // оплату — заказ уже paid, ссылка доступна и по возврату с кассы.
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await anon.auth.signInWithOtp({
        email: order.email,
        options: { emailRedirectTo: `${appUrl()}/auth/callback?next=/orders/${orderId}`, shouldCreateUser: false },
      });
      if (error) console.error(`[yukassa] status email for order ${orderId} failed:`, error.message);
    } catch (err) {
      console.error(`[yukassa] status email for order ${orderId} threw:`, err instanceof Error ? err.message : err);
    }
  }
}

/**
 * payment.canceled / refund.succeeded для пакетного заказа; true — если заказ найден
 * (событие относится к пакетному контуру), независимо от того, изменил ли он статус.
 */
async function handlePackageTerminalEvent(
  admin: Admin,
  paymentId: string,
  event: "payment.canceled" | "refund.succeeded",
  refundId?: string,
): Promise<boolean> {
  const { data, error: readError } = await admin
    .from("package_orders")
    .select(PACKAGE_ORDER_FIELDS)
    .eq("yukassa_payment_id", paymentId)
    .maybeSingle();
  if (readError) throw new Error("Package terminal lookup failed");
  const order = data as PackageOrderRow | null;
  if (!order) return false;

  const shop = shopForOrder(order, event);
  if (!shop) return true;
  const payment = await fetchKassaPayment(shop, paymentId);
  const check = event === "refund.succeeded"
    ? assessPackageRefund(order, refundId ? await fetchKassaRefund(shop, refundId) : null, payment, shop)
    : assessPackagePayment(order, payment, { status: "canceled", shop });
  if (!check.ok) {
    console.warn(`[yukassa] ${event} for order ${order.id} rejected by kassa reconciliation: ${check.reason}`);
    return true;
  }

  const t = transition(order.status as PackageOrderStatus, event);
  if (!t.ok) {
    console.error(`[yukassa] order ${order.id}: ${t.error}`);
    return true;
  }
  if (t.changed) {
    const patch = event === "refund.succeeded"
      ? { status: "refunded", refunded_at: new Date().toISOString(), ...(refundId ? { refund_id: refundId } : {}) }
      : { status: "failed", failure_reason: "payment.canceled" };
    const { error } = await admin.from("package_orders").update(patch).eq("id", order.id).eq("status", order.status);
    if (error) throw new Error("Package terminal update failed");
  }
  return true;
}

/** Legacy-контур экспертов: платёж перечитывается из боевого магазина. */
function liveShop(context: string): KassaShop | null {
  const shop = kassaShops().find((s) => !s.test) ?? null;
  if (!shop) console.error(`[yukassa] ${context}: live shop is not configured — event ignored`);
  return shop;
}

export async function POST(request: NextRequest) {
  // 1) IP-проверка. Работает поверх Traefik (он передаёт X-Forwarded-For).
  const allowlist = allowlistedIps();
  if (allowlist.length > 0) {
    const clientIp = extractClientIp(request);
    if (!clientIp || !allowlist.some((entry) => ipMatchesCidr(clientIp, entry))) {
      console.warn(`[yukassa] Webhook rejected: IP ${clientIp ?? "<unknown>"} not in allowlist`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // 2) Общий секрет в URL (дополнительная защита, опционально)
  if (WEBHOOK_SECRET) {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const event = body.event as string;
    const object = body.object as Record<string, unknown>;

    if (!event || !object || typeof object.id !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const admin = getAdmin();

    if (event === "payment.succeeded") {
      // Доверяем только payload'у в котором object.status совпадает с event
      // (защита от сфабрикованных событий, если shared secret утечёт).
      if (object.status !== "succeeded") {
        console.warn(`[yukassa] payment.succeeded event but object.status=${String(object.status)}, ignoring`);
        return NextResponse.json({ ok: true });
      }

      const paymentId = object.id;
      const metadata = (object.metadata ?? {}) as Record<string, string>;

      // Пакетный заказ (G-018): отдельный контур, expert_id не нужен.
      const packageMeta = parsePackageMetadata(metadata);
      if (packageMeta) {
        await handlePackagePaymentSucceeded(admin, packageMeta.order_id, paymentId);
        return NextResponse.json({ ok: true });
      }

      const expertId = metadata.expert_id;
      const paymentType = metadata.type || "subscription"; // audit | subscription

      if (!expertId) {
        console.error("[yukassa] No expert_id in metadata");
        return NextResponse.json({ ok: true });
      }

      // 3) Сверка с API кассы: сохраняем только то, что касса подтверждает.
      const shop = liveShop("payment.succeeded");
      if (!shop) return NextResponse.json({ ok: true });
      const verified = await fetchKassaPayment(shop, paymentId);
      const check = assessExpertPayment(verified, { paymentId, expertId, status: "succeeded" });
      if (!check.ok || !verified?.amount) {
        console.warn(`[yukassa] payment.succeeded ${paymentId} rejected by kassa reconciliation: ${check.ok ? "amount missing" : check.reason}`);
        return NextResponse.json({ ok: true });
      }
      const verifiedMetadata = (verified.metadata ?? {}) as Record<string, string>;

      // Save payment
      await admin.from("payments").upsert({
        expert_id: expertId,
        type: paymentType,
        amount: Math.round(parseFloat(verified.amount.value)),
        currency: verified.amount.currency,
        status: "succeeded",
        yukassa_payment_id: paymentId,
        description: verifiedMetadata.description || `${paymentType} payment`,
        metadata: verifiedMetadata,
      }, { onConflict: "yukassa_payment_id" });

      // Update subscription if applicable
      if (paymentType === "subscription" && verifiedMetadata.tier) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await admin
          .from("profiles")
          .update({
            subscription_tier: verifiedMetadata.tier,
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq("id", expertId);

        console.log(`[yukassa] Subscription updated: ${expertId} → ${verifiedMetadata.tier}`);
      }

      // Save payment method for recurring
      const paymentMethod = object.payment_method as { id: string; saved: boolean } | undefined;
      if (paymentMethod?.saved) {
        await admin
          .from("payments")
          .update({ yukassa_subscription_id: paymentMethod.id })
          .eq("yukassa_payment_id", paymentId);
      }
    }

    if (event === "payment.canceled" || event === "refund.succeeded") {
      // refund.succeeded несёт объект возврата: платёж — в payment_id; для
      // payment.canceled объект — сам платёж.
      const refundId = event === "refund.succeeded" ? object.id : undefined;
      const paymentId = event === "refund.succeeded"
        ? (typeof object.payment_id === "string" ? object.payment_id : object.id)
        : object.id;
      const status = event === "refund.succeeded" ? "refunded" : "failed";

      const handledPackage = await handlePackageTerminalEvent(admin, paymentId, event, refundId);
      if (!handledPackage) {
        const { data: legacy } = await admin
          .from("payments")
          .select("expert_id")
          .eq("yukassa_payment_id", paymentId)
          .maybeSingle();
        const expertId = legacy?.expert_id as string | undefined;
        const shop = expertId ? liveShop(event) : null;
        if (expertId && shop) {
          const payment = await fetchKassaPayment(shop, paymentId);
          const check = event === "refund.succeeded"
            ? (async () => {
                const base = assessExpertPayment(payment, { paymentId, expertId, status: "succeeded" });
                if (!base.ok) return base;
                const refund = refundId ? await fetchKassaRefund(shop, refundId) : null;
                if (!refund || refund.status !== "succeeded" || refund.payment_id !== paymentId) return { ok: false as const, reason: "refund not confirmed by kassa" };
                return { ok: true as const };
              })()
            : Promise.resolve(assessExpertPayment(payment, { paymentId, expertId, status: "canceled" }));
          const verdict = await check;
          if (verdict.ok) {
            await admin.from("payments").update({ status }).eq("yukassa_payment_id", paymentId);
          } else {
            console.warn(`[yukassa] ${event} ${paymentId} rejected by kassa reconciliation: ${verdict.reason}`);
          }
        }
      }
    }

    // Catch-all: события которые мы не обрабатываем (payment.waiting_for_capture,
    // deal.closed, etc.) — логируем, чтобы не терять диагностику. Возвращаем 200
    // чтобы ЮKassa не дёргала retry.
    const handled = new Set(["payment.succeeded", "payment.canceled", "refund.succeeded"]);
    if (!handled.has(event)) {
      console.log(`[yukassa] Unhandled event type: ${event} (id=${String(object.id)})`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof KassaUnavailableError) {
      // Касса недоступна для сверки — не решаем вслепую; 503 заставит ЮKassa повторить.
      console.error("[yukassa] Webhook deferred, kassa API unavailable:", err.message);
      return NextResponse.json({ error: "Verification unavailable" }, { status: 503 });
    }
    console.error("[yukassa] Webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
