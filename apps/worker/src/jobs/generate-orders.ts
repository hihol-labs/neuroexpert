import { supabase } from "../supabase.js";
import { SUBSCRIPTION_TIERS, planExpertOrders } from "shared";
import { tgFetch } from "shared/http/telegram-fetch";

export async function handleGenerateOrders(payload: Record<string, unknown>): Promise<{ created: number }> {
  const nicheId = payload.niche_id as string;
  if (!nicheId) throw new Error("niche_id is required");

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);

  // Вопросы с gap_score >= 6
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id, question_text")
    .eq("niche_id", nicheId)
    .eq("is_active", true)
    .gte("gap_score", 6)
    .order("gap_score", { ascending: false })
    .order("monthly_volume", { ascending: false })
    .limit(200);

  if (qErr) throw new Error(`Failed to fetch questions: ${qErr.message}`);
  if (!questions?.length) {
    console.log(`[generate_orders] No questions with gap_score >= 6 for niche ${nicheId}`);
    return { created: 0 };
  }

  // Эксперты
  const { data: expertNiches } = await supabase
    .from("expert_niches")
    .select("expert_id")
    .eq("niche_id", nicheId);

  if (!expertNiches?.length) return { created: 0 };

  const expertIds = expertNiches.map((en) => en.expert_id);

  const { data: experts } = await supabase
    .from("profiles")
    .select("id, subscription_tier, telegram_id")
    .in("id", expertIds);

  if (!experts?.length) return { created: 0 };

  // Существующие заказы
  const { data: existingOrders } = await supabase
    .from("orders")
    .select("expert_id, question_id")
    .in("expert_id", expertIds);

  const existingSet = new Set(
    (existingOrders ?? []).map((o) => `${o.expert_id}:${o.question_id}`),
  );

  const expiresAt = new Date(now.getTime() + 7 * 86400000).toISOString();

  // Показываем подходящие темы (лимит на показ, не на accept) - план считает shared/planExpertOrders.
  // R-06: expert_id в payload - ручной запуск «Подобрать темы сейчас», темы только этому эксперту;
  // без него - недельный cron по всем экспертам ниши.
  const onlyExpertId = typeof payload["expert_id"] === "string" && payload["expert_id"] ? (payload.expert_id as string) : null;
  const plan = planExpertOrders({
    questions,
    experts: experts.map((e) => ({ id: e.id, eligible: Boolean(SUBSCRIPTION_TIERS[e.subscription_tier]), telegram_id: e.telegram_id })),
    existing: existingSet,
    onlyExpertId,
  });
  const ordersToInsert = plan.orders.map((o) => ({
    ...o,
    status: "pending",
    week_number: weekNumber,
    expires_at: expiresAt,
  }));
  const expertsToNotify = plan.notify.map((n) => ({ telegramId: n.telegram_id, count: n.count, sampleQuestions: n.samples }));

  if (ordersToInsert.length === 0) return { created: 0 };

  // Вставляем
  let created = 0;
  for (let i = 0; i < ordersToInsert.length; i += 100) {
    const batch = ordersToInsert.slice(i, i + 100);
    const { error, count } = await supabase
      .from("orders")
      .upsert(batch, { onConflict: "expert_id,question_id", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error(`[generate_orders] Insert error:`, error.message);
    } else {
      created += count ?? batch.length;
    }
  }

  // Загружаем подзапросы для примеров
  const sampleQIds = questions.slice(0, 3).map((q) => q.id);
  const { data: subQueries } = await supabase
    .from("sub_queries")
    .select("parent_question_id, sub_query_text")
    .in("parent_question_id", sampleQIds)
    .limit(10);

  // Уведомления
  for (const n of expertsToNotify) {
    await notifyNewOrders(n.telegramId, n.count, n.sampleQuestions, subQueries ?? []);
  }

  console.log(`[generate_orders] Created ${created} orders for niche ${nicheId}`);
  return { created };
}

async function notifyNewOrders(
  telegramId: number,
  count: number,
  samples: string[],
  subQueries: Array<{ parent_question_id: string; sub_query_text: string }>,
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const lines = [
    `📋 Новые заказы на этой неделе: ${count}`,
    "",
    ...samples.map((q, i) => `${i + 1}. ${q}`),
  ];

  if (subQueries.length > 0) {
    lines.push("", "🔍 Люди также спрашивают:");
    for (const sq of subQueries.slice(0, 5)) {
      lines.push(`  • ${sq.sub_query_text}`);
    }
  }

  lines.push("", "Откройте /orders для просмотра");

  try {
    await tgFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramId, text: lines.join("\n") }),
    });
  } catch (err) {
    console.error("[generate_orders] Notification failed:", err);
  }
}
