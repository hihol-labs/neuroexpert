import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Simple in-memory rate limiter: 2 requests per minute per IP
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 2;

  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Слишком много запросов. Подождите минуту." },
      { status: 429 }
    );
  }

  let body: { niche_id?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { niche_id, type = "free" } = body;

  if (!niche_id) {
    return NextResponse.json({ error: "niche_id is required" }, { status: 400 });
  }

  if (type !== "free" && type !== "paid") {
    return NextResponse.json({ error: "type must be 'free' or 'paid'" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify niche exists
  const { data: nicheData, error: nicheError } = await supabase
    .from("niches")
    .select("id, name")
    .eq("id", niche_id)
    .single();

  if (nicheError || !nicheData) {
    console.error("Niche error:", nicheError);
    return NextResponse.json({ error: "Ниша не найдена" }, { status: 404 });
  }

  const nicheName = (nicheData as { id: string; name: string }).name;

  // Get top 3 questions by gap_score for this niche
  const limit = type === "free" ? 3 : 10;

  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_text, monthly_volume, gap_score, ai_response_chatgpt")
    .eq("niche_id", niche_id)
    .order("gap_score", { ascending: false })
    .limit(limit);

  if (questionsError) {
    console.error("Questions error:", questionsError);
    return NextResponse.json({ error: "Ошибка запроса" }, { status: 500 });
  }

  const questions = (questionsData || []) as Array<{
    id: string;
    question_text: string;
    monthly_volume: number;
    gap_score: number;
    ai_response_chatgpt: string | null;
  }>;

  return NextResponse.json({
    niche: nicheName,
    type,
    gaps: questions.map((q) => ({
      id: q.id,
      question: q.question_text,
      monthly_volume: q.monthly_volume,
      gap_score: q.gap_score,
      ai_response: q.ai_response_chatgpt,
    })),
  });
}
