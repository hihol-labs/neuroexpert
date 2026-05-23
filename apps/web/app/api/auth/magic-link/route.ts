import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getRedirectUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://neuroexpertise.ru";
  return `${appUrl.replace(/\/$/, "")}/auth/callback`;
}

export async function POST(request: NextRequest) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "Укажите корректный email." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: getRedirectUrl(),
    },
  });

  if (error) {
    console.error("[auth/magic-link] signInWithOtp failed:", {
      status: error.status,
      name: error.name,
      message: error.message,
    });
    return NextResponse.json(
      {
        error:
          "Не удалось отправить ссылку для входа. Проверьте email и попробуйте ещё раз через минуту.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
