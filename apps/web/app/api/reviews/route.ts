import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Rate limit: 3 reviews per hour per IP
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 3600_000;
  const max = 3;

  const timestamps =
    rateLimitMap.get(ip)?.filter((t) => now - t < window) ?? [];
  if (timestamps.length >= max) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Слишком много отзывов. Попробуйте позже." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { expert_id, reviewer_name, rating, review_text } = body;

    if (!expert_id || !reviewer_name || !rating) {
      return NextResponse.json(
        { error: "expert_id, reviewer_name и rating обязательны" },
        { status: 400 },
      );
    }

    const numRating = parseInt(rating, 10);
    if (numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: "Оценка должна быть от 1 до 5" },
        { status: 400 },
      );
    }

    const admin = getAdmin();

    // Verify expert exists
    const { data: expert } = await admin
      .from("profiles")
      .select("id")
      .eq("id", expert_id)
      .eq("is_published", true)
      .single();

    if (!expert) {
      return NextResponse.json(
        { error: "Эксперт не найден" },
        { status: 404 },
      );
    }

    const { data: review, error } = await admin
      .from("reviews")
      .insert({
        expert_id,
        reviewer_name: reviewer_name.trim().slice(0, 100),
        rating: numRating,
        review_text: review_text?.trim().slice(0, 2000) || null,
        is_published: true,
        is_verified: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[reviews] Insert error:", error);
      return NextResponse.json(
        { error: "Ошибка сохранения отзыва" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, review_id: review.id });
  } catch (err) {
    console.error("[reviews] Error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const expertId = request.nextUrl.searchParams.get("expert_id");
  if (!expertId) {
    return NextResponse.json(
      { error: "expert_id обязателен" },
      { status: 400 },
    );
  }

  const admin = getAdmin();

  const { data: reviews } = await admin
    .from("reviews")
    .select(
      "id, reviewer_name, rating, review_text, is_verified, created_at",
    )
    .eq("expert_id", expertId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ reviews: reviews ?? [] });
}
