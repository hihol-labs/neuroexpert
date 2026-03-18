import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  try {
    let expertId: string | undefined;
    let email: string | undefined;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      expertId = body.expert_id;
      email = body.email;
    } else {
      const formData = await request.formData();
      expertId = formData.get("expert_id") as string;
      email = formData.get("email") as string;
    }

    if (!expertId || !email) {
      return NextResponse.json(
        { error: "expert_id and email are required" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const admin = getAdmin();
    const { error } = await admin
      .from("email_subscribers")
      .upsert(
        { expert_id: expertId, email, is_active: true },
        { onConflict: "expert_id,email", ignoreDuplicates: true },
      );

    if (error) {
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: 500 },
      );
    }

    // Form submit → redirect back
    if (!contentType.includes("application/json")) {
      const referer = request.headers.get("referer") || "/";
      return NextResponse.redirect(new URL(referer, request.url));
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Unsubscribe
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const expertId = request.nextUrl.searchParams.get("expert_id");

  if (!email || !expertId) {
    return new NextResponse("Неверная ссылка для отписки.", { status: 400 });
  }

  const admin = getAdmin();
  await admin
    .from("email_subscribers")
    .update({ is_active: false })
    .eq("expert_id", expertId)
    .eq("email", email);

  return new NextResponse(
    `<html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>Вы отписаны</h2>
      <p>Вы больше не будете получать рассылку.</p>
      <a href="/">На главную</a>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
