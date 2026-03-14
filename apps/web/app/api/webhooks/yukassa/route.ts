import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SECRET = process.env.YUKASSA_WEBHOOK_SECRET || "";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  // Verify webhook (basic IP check or secret header)
  if (WEBHOOK_SECRET) {
    // ЮKassa sends events as plain JSON, verify via shared secret in URL or body
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
      const paymentId = object.id as string;
      const amount = object.amount as { value: string; currency: string };
      const metadata = (object.metadata ?? {}) as Record<string, string>;
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
      const paymentId = object.id as string;
      const status = event === "refund.succeeded" ? "refunded" : "failed";

      await admin
        .from("payments")
        .update({ status })
        .eq("yukassa_payment_id", paymentId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[yukassa] Webhook error:", err);
    return NextResponse.json({ ok: true }); // Always 200 to avoid retries
  }
}
