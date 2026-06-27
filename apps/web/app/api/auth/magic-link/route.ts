import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getRedirectUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://neuroexpertise.ru";
  return `${appUrl.replace(/\/$/, "")}/auth/callback`;
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function getFriendlyMagicLinkError(error: { message?: string; status?: number }) {
  const message = error.message ?? "";

  if (/email/i.test(message) && /rate|frequency|limit/i.test(message)) {
    return {
      status: 429,
      error: "Слишком много попыток. Попробуйте отправить ссылку ещё раз через минуту.",
    };
  }

  if (/smtp|mail|mailer|email/i.test(message)) {
    return {
      status: 503,
      error:
        "Почтовый сервис временно недоступен. Мы уже проверяем отправку писем, попробуйте ещё раз позже.",
    };
  }

  if (/invalid|email/i.test(message) || error.status === 400) {
    return {
      status: 400,
      error: "Укажите корректный email.",
    };
  }

  return {
    status: 502,
    error: "Не удалось отправить ссылку для входа. Попробуйте ещё раз через минуту.",
  };
}

export async function POST(request: NextRequest) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "Укажите корректный email." }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[auth/magic-link] Supabase public env is not configured");
    return NextResponse.json(
      { error: "Сервис входа временно недоступен. Попробуйте ещё раз позже." },
      { status: 503 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await supabase.auth
    .signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    })
    .catch((caught: unknown) => ({
      error: caught instanceof Error ? caught : new Error("Unknown magic link error"),
    }));

  if (error) {
    const status = getErrorStatus(error);
    console.error("[auth/magic-link] signInWithOtp failed:", {
      status,
      name: error.name,
      message: error.message,
    });
    const friendly = getFriendlyMagicLinkError({ message: error.message, status });
    return NextResponse.json({ error: friendly.error }, { status: friendly.status });
  }

  return NextResponse.json({ ok: true });
}
