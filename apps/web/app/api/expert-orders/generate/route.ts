import { NextRequest, NextResponse } from "next/server";
import { GENERATE_COOLDOWN_MS, decideGenerateNow, isFirstGenerateRequest } from "shared";
import { createClient } from "@/lib/supabase/server";
import { backToOrders, expertOrdersAdmin, isSameOriginPost } from "@/lib/expert-orders";

export const dynamic = "force-dynamic";

/**
 * POST /api/expert-orders/generate - «Подобрать темы сейчас» (R-06, E-AUTO-13): ставит job
 * generate_orders по каждой нише эксперта с expert_id - worker создаёт темы только ему. Недельный
 * cron (job без expert_id) не меняется. Лимит - один запуск на эксперта в сутки: подбор читает до
 * 200 вопросов на нишу, кнопка не должна превращаться в нагрузочный рычаг.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = expertOrdersAdmin();
  const { data: last } = await admin
    .from("jobs")
    .select("created_at")
    .eq("type", "generate_orders")
    .eq("payload->>expert_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const decision = decideGenerateNow((last?.created_at as string | undefined) ?? null, Date.now());
  if (!decision.ok) {
    const res = backToOrders(request, "generate_cooldown");
    const url = new URL(res.headers.get("location")!);
    url.searchParams.set("retry_at", decision.retry_at);
    return NextResponse.redirect(url, 303);
  }

  const { data: niches } = await admin.from("expert_niches").select("niche_id").eq("expert_id", user.id);
  const nicheIds = [...new Set((niches ?? []).map((n) => n.niche_id as string).filter(Boolean))];
  if (nicheIds.length === 0) return backToOrders(request, "generate_no_niche");

  const { data: mine, error } = await admin.from("jobs").insert(
    nicheIds.map((niche_id) => ({ type: "generate_orders", payload: { niche_id, expert_id: user.id }, priority: 3 })),
  ).select("id, created_at");
  if (error || !mine || mine.length === 0) {
    console.error("[expert-orders/generate] enqueue failed:", error?.message);
    return backToOrders(request, "generate_failed");
  }

  // Проверка лимита и вставка не атомарны (двойной клик, две вкладки): сверяемся после вставки -
  // остаётся самый ранний запрос суток, проигравший убирает свои ещё не взятые job.
  const myIds = mine.map((j) => j.id as string);
  const { data: others } = await admin
    .from("jobs")
    .select("id, created_at")
    .eq("type", "generate_orders")
    .eq("payload->>expert_id", user.id)
    .gte("created_at", new Date(Date.now() - GENERATE_COOLDOWN_MS).toISOString())
    .not("id", "in", `(${myIds.join(",")})`);
  const refs = (rows: typeof mine) => rows.map((j) => ({ id: j.id as string, created_at: j.created_at as string }));
  if (!isFirstGenerateRequest(refs(mine), refs(others ?? []))) {
    await admin.from("jobs").delete().in("id", myIds).eq("status", "pending");
    return backToOrders(request, "generate_cooldown");
  }
  return backToOrders(request, "generate_queued");
}
