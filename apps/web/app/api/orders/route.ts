import { NextRequest, NextResponse } from "next/server";
import {
  buildPackagePaymentMetadata,
  countConfiguredPlatforms,
  decidePreflight,
  getPackage,
} from "shared";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Нетипизированный service_role клиент — как в webhook и service-orders:
// сгенерированные типы Database не покрывают новые таблицы полностью.
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * POST /api/orders — автономный заказ пакета «Аудит Старт» (G-018).
 *
 * Порядок строго по контракту Audit Start v1 §6 «данные раньше денег»:
 *   валидация трёх полей → pre-flight (платформы, вопросы по нише) →
 *   пользователь по email (email = аккаунт) → package_orders(pending) →
 *   платёж ЮKassa → confirmation_url. Ни одна ветка не создаёт платёж до
 *   успешного pre-flight, и ни одна не помечает заказ оплаченным — это делает
 *   только webhook.
 *
 * Dark launch: пока SELF_SERVE_CHECKOUT !== "live", маршрут отвечает 404 всем,
 * кроме канарейки с секретным заголовком; в dark-режиме используется ТЕСТОВЫЙ
 * магазин ЮKassa (YUKASSA_TEST_*), реальные ключи — только в live.
 */

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CheckoutMode = "live" | "dark";

function checkoutMode(): CheckoutMode {
  return process.env.SELF_SERVE_CHECKOUT === "live" ? "live" : "dark";
}

function canaryAllowed(request: NextRequest): boolean {
  const token = process.env.SELFSERVE_CANARY_TOKEN;
  if (!token) return false;
  return request.headers.get("x-selfserve-canary") === token;
}

function yukassaCredentials(mode: CheckoutMode): { shopId: string; secretKey: string } | null {
  const shopId = mode === "live" ? process.env.YUKASSA_SHOP_ID : process.env.YUKASSA_TEST_SHOP_ID;
  const secretKey = mode === "live" ? process.env.YUKASSA_SECRET_KEY : process.env.YUKASSA_TEST_SECRET_KEY;
  if (!shopId || !secretKey) return null;
  return { shopId, secretKey };
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://neuroexpertise.ru").replace(/\/$/, "");
}

async function resolveOwnerId(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<{ ownerId: string } | { error: string }> {
  // Email — это аккаунт (решение AF-1 №1): пользователь создаётся без пароля,
  // вход — по magic link, который придёт письмом со ссылкой на статус.
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.data.user?.id) return { ownerId: created.data.user.id };

  const message = created.error?.message ?? "";
  if (!/already|exists|registered/i.test(message)) {
    return { error: `auth: ${message || "не удалось создать пользователя"}` };
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!profile?.id) return { error: "auth: пользователь существует, но профиль не найден" };
  return { ownerId: profile.id as string };
}

export async function POST(request: NextRequest) {
  const mode = checkoutMode();
  if (mode === "dark" && !canaryAllowed(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nicheId = typeof body.niche_id === "string" ? body.niche_id.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const pkg = getPackage("audit_start");
  if (!pkg) return NextResponse.json({ error: "Пакет не настроен" }, { status: 500 });

  if (!UUID_RE.test(nicheId)) return NextResponse.json({ error: "Укажите нишу." }, { status: 400 });
  if (city.length < 2 || city.length > 80) return NextResponse.json({ error: "Укажите город." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Укажите корректный email." }, { status: 400 });

  const admin = createAdminClient();

  const { data: niche } = await admin
    .from("niches")
    .select("id, name, is_active")
    .eq("id", nicheId)
    .maybeSingle();
  if (!niche || !niche.is_active) {
    return NextResponse.json({ error: "Ниша не найдена." }, { status: 404 });
  }

  // Pre-flight ДО любых записей и ДО платежа.
  const { count: questionCount } = await admin
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("niche_id", nicheId)
    .eq("is_active", true);
  const decision = decidePreflight({
    configuredPlatforms: countConfiguredPlatforms(process.env),
    questionCount: questionCount ?? 0,
  });
  if (!decision.allow) {
    return NextResponse.json({ error: decision.message, reason: decision.reason }, { status: 503 });
  }

  const credentials = yukassaCredentials(mode);
  if (!credentials) {
    // Не брать деньги, если касса не настроена: честный 503, а не 500 после записи.
    return NextResponse.json({ error: "Оплата временно недоступна.", reason: "payments" }, { status: 503 });
  }

  const owner = await resolveOwnerId(admin, email);
  if ("error" in owner) {
    console.error("[orders] owner resolution failed:", owner.error);
    return NextResponse.json({ error: "Не удалось создать аккаунт по email." }, { status: 500 });
  }

  const { data: order, error: insertError } = await admin
    .from("package_orders")
    .insert({
      owner_id: owner.ownerId,
      package: pkg.id,
      amount_rub: pkg.amountRub,
      niche_id: nicheId,
      city,
      email,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError || !order) {
    console.error("[orders] insert failed:", insertError?.message);
    return NextResponse.json({ error: "Не удалось создать заказ." }, { status: 500 });
  }

  const paymentBody = {
    amount: { value: pkg.amountRub.toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: `${appUrl()}/orders/${order.id}` },
    description: `${pkg.title}: ${niche.name}, ${city}`,
    metadata: buildPackagePaymentMetadata({ package: pkg.id, orderId: order.id, userId: owner.ownerId }),
  };

  let payment: { id?: string; confirmation?: { confirmation_url?: string } } | null = null;
  let failure: string | null = null;
  try {
    const res = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${credentials.shopId}:${credentials.secretKey}`).toString("base64")}`,
        // Idempotence-Key = заказ: повтор запроса не создаёт второй платёж.
        "Idempotence-Key": `package-${order.id}`,
      },
      body: JSON.stringify(paymentBody),
    });
    if (!res.ok) failure = `yukassa ${res.status}: ${(await res.text()).slice(0, 300)}`;
    else payment = await res.json();
  } catch (err) {
    failure = `yukassa transport: ${err instanceof Error ? err.message : String(err)}`;
  }

  if (failure || !payment?.id || !payment.confirmation?.confirmation_url) {
    const reason = failure ?? "yukassa: ответ без id/confirmation_url";
    console.error("[orders] payment creation failed:", reason);
    await admin
      .from("package_orders")
      .update({ status: "failed", failure_reason: reason.slice(0, 500) })
      .eq("id", order.id);
    return NextResponse.json({ error: "Не удалось создать платёж. Деньги не списаны." }, { status: 502 });
  }

  await admin
    .from("package_orders")
    .update({ yukassa_payment_id: payment.id, confirmation_url: payment.confirmation.confirmation_url })
    .eq("id", order.id);

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    amount_rub: pkg.amountRub,
    confirmation_url: payment.confirmation.confirmation_url,
    mode,
  });
}
