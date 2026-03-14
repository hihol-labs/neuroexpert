import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPayment } from "@/lib/yukassa";
import { TIER_CONFIG, type TierName } from "@/lib/subscription";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tier } = await request.json() as { tier: string };

  const config = TIER_CONFIG[tier as TierName];
  if (!config || config.price === 0) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  try {
    const payment = await createPayment({
      amount: config.price,
      description: `НейроЭксперт — подписка ${config.name}`,
      returnUrl: `${APP_URL}/billing?success=1`,
      savePaymentMethod: true,
      metadata: {
        expert_id: user.id,
        type: "subscription",
        tier,
      },
    });

    return NextResponse.json({
      payment_id: payment.id,
      confirmation_url: payment.confirmation?.confirmation_url,
    });
  } catch (err) {
    console.error("[subscribe] Payment error:", err);
    return NextResponse.json({ error: "Payment creation failed" }, { status: 500 });
  }
}
