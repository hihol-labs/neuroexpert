import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Rate limit: 5 per hour per IP
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 3600_000;
  const max = 5;
  const timestamps = rateLimitMap.get(ip)?.filter((t) => now - t < window) ?? [];
  if (timestamps.length >= max) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const shopId = process.env.YUKASSA_SHOP_ID;
  const secretKey = process.env.YUKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    return NextResponse.json({ error: "Оплата временно недоступна" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { expert_id, lead_id, amount } = body;

    if (!expert_id || !amount) {
      return NextResponse.json({ error: "expert_id и amount обязательны" }, { status: 400 });
    }

    const admin = getAdmin();

    // Get expert info and tier for commission
    const { data: expert } = await admin
      .from("profiles")
      .select("full_name, subscription_tier, consultation_price")
      .eq("id", expert_id)
      .single();

    if (!expert) {
      return NextResponse.json({ error: "Эксперт не найден" }, { status: 404 });
    }

    const consultationAmount = amount || expert.consultation_price || 3000;

    // Commission rates
    const commissionRates: Record<string, number> = {
      free: 0.15,
      starter: 0.07,
      pro: 0.03,
      expert: 0,
      business: 0,
      enterprise: 0,
    };
    const commission = commissionRates[expert.subscription_tier || "free"] ?? 0.15;
    const platformFee = Math.round(consultationAmount * commission);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

    // Create YuKassa payment with split (marketplace mode)
    // If YUKASSA_MARKETPLACE=true, uses split-payment to auto-transfer to expert
    const isMarketplace = process.env.YUKASSA_MARKETPLACE === "true";
    const expertPayout = consultationAmount - platformFee;

    const paymentBody: Record<string, unknown> = {
      amount: {
        value: consultationAmount.toFixed(2),
        currency: "RUB",
      },
      confirmation: {
        type: "redirect",
        return_url: lead_id
          ? `${appUrl}/track/${lead_id}`
          : `${appUrl}/experts`,
      },
      capture: true,
      description: `Консультация: ${expert.full_name}`,
      metadata: {
        type: "consultation",
        expert_id,
        lead_id: lead_id || null,
        platform_fee: platformFee,
        expert_payout: expertPayout,
        commission_rate: commission,
      },
    };

    // Split-payment: автоматический перевод эксперту (ЮKassa Маркетплейс)
    if (isMarketplace && expertPayout > 0) {
      // Expert's YuKassa account ID stored in profile
      const { data: expertProfile } = await admin
        .from("profiles")
        .select("yukassa_account_id")
        .eq("id", expert_id)
        .single();

      if (expertProfile?.yukassa_account_id) {
        paymentBody.transfers = [
          {
            account_id: expertProfile.yukassa_account_id,
            amount: {
              value: expertPayout.toFixed(2),
              currency: "RUB",
            },
            platform_fee_amount: {
              value: platformFee.toFixed(2),
              currency: "RUB",
            },
          },
        ];
      }
    }

    const paymentRes = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
        "Idempotence-Key": `consultation-${expert_id}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    if (!paymentRes.ok) {
      const err = await paymentRes.text();
      console.error("[pay-consultation] YuKassa error:", err);
      return NextResponse.json({ error: "Ошибка создания платежа" }, { status: 500 });
    }

    const payment = await paymentRes.json();

    // Save payment record
    await admin.from("payments").insert({
      expert_id,
      type: "consultation",
      amount: consultationAmount,
      currency: "RUB",
      status: "pending",
      yukassa_payment_id: payment.id,
      description: `Консультация: ${expert.full_name}`,
      metadata: {
        lead_id: lead_id || null,
        platform_fee: platformFee,
        expert_payout: consultationAmount - platformFee,
        commission_rate: commission,
      },
    });

    return NextResponse.json({
      ok: true,
      confirmation_url: payment.confirmation.confirmation_url,
      amount: consultationAmount,
      platform_fee: platformFee,
      expert_payout: consultationAmount - platformFee,
    });
  } catch (err) {
    console.error("[pay-consultation] Error:", err);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
