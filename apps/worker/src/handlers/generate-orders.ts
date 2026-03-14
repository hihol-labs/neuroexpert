import { supabase } from "../supabase.js";
import { SUBSCRIPTION_TIERS } from "shared";

export async function handleGenerateOrders(payload: Record<string, unknown>): Promise<{ created: number }> {
  const niche_id = payload.niche_id as string;
  if (!niche_id) throw new Error("niche_id is required");

  // Текущий ISO week number
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);

  // Вопросы с высоким gap_score по нише
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id")
    .eq("niche_id", niche_id)
    .eq("is_active", true)
    .gte("gap_score", 6)
    .order("gap_score", { ascending: false })
    .order("monthly_volume", { ascending: false })
    .limit(200);

  if (qErr) throw new Error(`Failed to fetch questions: ${qErr.message}`);
  if (!questions || questions.length === 0) {
    console.log(`[generate_orders] No questions with gap_score >= 6 for niche ${niche_id}`);
    return { created: 0 };
  }

  // Эксперты с этой нишей
  const { data: expertNiches, error: enErr } = await supabase
    .from("expert_niches")
    .select("expert_id")
    .eq("niche_id", niche_id);

  if (enErr) throw new Error(`Failed to fetch expert_niches: ${enErr.message}`);
  if (!expertNiches || expertNiches.length === 0) {
    console.log(`[generate_orders] No experts for niche ${niche_id}`);
    return { created: 0 };
  }

  const expertIds = expertNiches.map((en) => en.expert_id);

  // Профили экспертов (нужен subscription_tier)
  const { data: experts, error: expErr } = await supabase
    .from("profiles")
    .select("id, subscription_tier")
    .in("id", expertIds);

  if (expErr) throw new Error(`Failed to fetch experts: ${expErr.message}`);
  if (!experts || experts.length === 0) return { created: 0 };

  // Существующие заказы для этих экспертов (чтобы не дублировать)
  const { data: existingOrders } = await supabase
    .from("orders")
    .select("expert_id, question_id")
    .in("expert_id", expertIds);

  const existingSet = new Set(
    (existingOrders ?? []).map((o) => `${o.expert_id}:${o.question_id}`),
  );

  // Генерируем заказы
  const ordersToInsert: Array<{
    expert_id: string;
    question_id: string;
    status: string;
    week_number: number;
    expires_at: string;
  }> = [];

  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const expert of experts) {
    const tier = SUBSCRIPTION_TIERS[expert.subscription_tier];
    if (!tier || tier.ordersPerWeek === 0) continue;

    let count = 0;
    for (const q of questions) {
      if (count >= tier.ordersPerWeek) break;
      const key = `${expert.id}:${q.id}`;
      if (existingSet.has(key)) continue;

      ordersToInsert.push({
        expert_id: expert.id,
        question_id: q.id,
        status: "pending",
        week_number: weekNumber,
        expires_at: expiresAt,
      });
      existingSet.add(key);
      count++;
    }
  }

  if (ordersToInsert.length === 0) {
    console.log(`[generate_orders] No new orders to create for niche ${niche_id}`);
    return { created: 0 };
  }

  // Вставляем батчами по 100
  let created = 0;
  for (let i = 0; i < ordersToInsert.length; i += 100) {
    const batch = ordersToInsert.slice(i, i + 100);
    const { error: insertErr, count } = await supabase
      .from("orders")
      .upsert(batch, { onConflict: "expert_id,question_id", ignoreDuplicates: true })
      .select("id");

    if (insertErr) {
      console.error(`[generate_orders] Insert batch error:`, insertErr.message);
    } else {
      created += count ?? batch.length;
    }
  }

  console.log(`[generate_orders] Created ${created} orders for niche ${niche_id}`);
  return { created };
}
