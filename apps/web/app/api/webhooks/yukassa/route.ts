import { NextRequest, NextResponse } from "next/server";
import { mayEnqueueAuditJob, parsePackageMetadata, transition, type PackageOrderStatus } from "shared";
import { createClient } from "@supabase/supabase-js";

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
  amount: { value: string; currency: string },
): Promise<void> {
  const { data: order } = await admin
    .from("package_orders")
    .select("id, owner_id, email, package, amount_rub, niche_id, city, status, job_id, yukassa_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    console.error(`[yukassa] package order ${orderId} not found for payment ${paymentId}`);
    return;
  }
  if (order.yukassa_payment_id && order.yukassa_payment_id !== paymentId) {
    console.error(`[yukassa] payment ${paymentId} does not match order ${orderId} (${order.yukassa_payment_id})`);
    return;
  }
  const paidRub = Math.round(parseFloat(amount.value));
  if (paidRub !== order.amount_rub || amount.currency !== "RUB") {
    console.error(`[yukassa] amount mismatch for order ${orderId}: got ${amount.value} ${amount.currency}, expected ${order.amount_rub} RUB`);
    await admin
      .from("package_orders")
      .update({ status: "failed", failure_reason: `amount mismatch: ${amount.value} ${amount.currency}`, yukassa_payment_id: paymentId })
      .eq("id", orderId)
      .eq("status", "pending");
    return;
  }

  const t = transition(order.status as PackageOrderStatus, "payment.succeeded");
  if (!t.ok) {
    console.error(`[yukassa] order ${orderId}: ${t.error}`);
    return;
  }
  if (t.changed) {
    await admin
      .from("package_orders")
      .update({ status: "paid", paid_at: new Date().toISOString(), yukassa_payment_id: paymentId })
      .eq("id", orderId)
      .eq("status", "pending");
  }

  if (mayEnqueueAuditJob("paid", order.job_id as string | null)) {
    const { data: job } = await admin
      .from("jobs")
      .insert({
        type: "run_audit",
        priority: 1,
        payload: { order_id: orderId, package: order.package, niche_id: order.niche_id, city: order.city, owner_id: order.owner_id },
      })
      .select("id")
      .single();
    if (job?.id) {
      const { data: claimed } = await admin
        .from("package_orders")
        .update({ job_id: job.id })
        .eq("id", orderId)
        .is("job_id", null)
        .select("id");
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
        email: order.email as string,
        options: { emailRedirectTo: `${appUrl()}/auth/callback?next=/orders/${orderId}`, shouldCreateUser: false },
      });
      if (error) console.error(`[yukassa] status email for order ${orderId} failed:`, error.message);
    } catch (err) {
      console.error(`[yukassa] status email for order ${orderId} threw:`, err instanceof Error ? err.message : err);
    }
  }
}

/** payment.canceled / refund.succeeded для пакетного заказа; true — если заказ найден и обработан. */
async function handlePackageTerminalEvent(
  admin: Admin,
  paymentId: string,
  event: "payment.canceled" | "refund.succeeded",
): Promise<boolean> {
  const { data: order } = await admin
    .from("package_orders")
    .select("id, status")
    .eq("yukassa_payment_id", paymentId)
    .maybeSingle();
  if (!order) return false;
  const t = transition(order.status as PackageOrderStatus, event);
  if (!t.ok) {
    console.error(`[yukassa] order ${order.id}: ${t.error}`);
    return true;
  }
  if (t.changed) {
    const patch = event === "refund.succeeded"
      ? { status: "refunded", refunded_at: new Date().toISOString() }
      : { status: "failed", failure_reason: "payment.canceled" };
    await admin.from("package_orders").update(patch).eq("id", order.id).eq("status", order.status);
  }
  return true;
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

    if (!event || !object) {
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

      const paymentId = object.id as string;
      const amount = object.amount as { value: string; currency: string };
      const metadata = (object.metadata ?? {}) as Record<string, string>;

      // Пакетный заказ (G-018): отдельный контур, expert_id не нужен.
      const packageMeta = parsePackageMetadata(metadata);
      if (packageMeta) {
        await handlePackagePaymentSucceeded(admin, packageMeta.order_id, paymentId, amount);
        return NextResponse.json({ ok: true });
      }

      const expertId = metadata.expert_id;
      const paymentType = metadata.type || "subscription"; // audit | subscription

      if (!expertId) {
        console.error("[yukassa] No expert_id in metadata");
        return NextResponse.json({ ok: true });
      }

      // Save payment
      await admin.from("payments").upsert({
        expert_id: expertId,
        type: paymentType,
        amount: Math.round(parseFloat(amount.value)),
        currency: amount.currency,
        status: "succeeded",
        yukassa_payment_id: paymentId,
        description: metadata.description || `${paymentType} payment`,
        metadata,
      }, { onConflict: "yukassa_payment_id" });

      // Update subscription if applicable
      if (paymentType === "subscription" && metadata.tier) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await admin
          .from("profiles")
          .update({
            subscription_tier: metadata.tier,
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq("id", expertId);

        console.log(`[yukassa] Subscription updated: ${expertId} → ${metadata.tier}`);
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
      const paymentId = (event === "refund.succeeded"
        ? (object.payment_id as string | undefined) ?? (object.id as string)
        : (object.id as string));
      const status = event === "refund.succeeded" ? "refunded" : "failed";

      const handledPackage = await handlePackageTerminalEvent(admin, paymentId, event);
      if (!handledPackage) {
        await admin
          .from("payments")
          .update({ status })
          .eq("yukassa_payment_id", paymentId);
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
    console.error("[yukassa] Webhook error:", err);
    return NextResponse.json({ ok: true }); // Always 200 to avoid retries
  }
}
