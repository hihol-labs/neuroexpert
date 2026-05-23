import { supabase } from "../supabase.js";
import { getLLM, buildQueryFanoutPrompt } from "shared";

type FanoutItem = string | {
  query?: string;
  cluster?: string;
  user_intent?: string;
  desired_answer?: string;
  next_cta?: string;
};

export async function handleExpandQuery(payload: Record<string, unknown>): Promise<{ subqueries: number }> {
  const questionId = payload.question_id as string;
  if (!questionId) throw new Error("question_id is required");

  const { data: question } = await supabase
    .from("questions")
    .select("id, question_text")
    .eq("id", questionId)
    .single();

  if (!question) throw new Error(`Question ${questionId} not found`);

  // Проверяем, нет ли уже подзапросов
  const { count } = await supabase
    .from("sub_queries")
    .select("id", { count: "exact", head: true })
    .eq("parent_question_id", questionId);

  if (count && count > 0) {
    console.log(`[expand_query] Subqueries already exist for ${questionId}`);
    return { subqueries: count };
  }

  // LLM: разбиваем на подзапросы
  const { primary, fallback } = getLLM();
  let subqueries: FanoutItem[];

  try {
    subqueries = await primary.generateJSON<FanoutItem[]>(
      buildQueryFanoutPrompt(question.question_text),
      { maxTokens: 512, temperature: 0.3 },
    );
  } catch {
    subqueries = await fallback.generateJSON<FanoutItem[]>(
      buildQueryFanoutPrompt(question.question_text),
      { maxTokens: 512, temperature: 0.3 },
    );
  }

  if (!Array.isArray(subqueries) || subqueries.length === 0) {
    console.log(`[expand_query] No subqueries generated for "${question.question_text.slice(0, 50)}"`);
    return { subqueries: 0 };
  }

  // Сохраняем
  const rows = subqueries.slice(0, 5).map((sq) => ({
    parent_question_id: questionId,
    sub_query_text: typeof sq === "string" ? sq : String(sq.query ?? ""),
    ...(typeof sq === "string"
      ? {}
      : {
          aeo_cluster: sq.cluster ?? null,
          user_intent: sq.user_intent ?? null,
          desired_answer: sq.desired_answer ?? null,
          next_cta: sq.next_cta ?? null,
        }),
  })).filter((row) => row.sub_query_text.trim().length > 0);

  if (rows.length === 0) {
    console.log(`[expand_query] No usable subqueries generated for "${question.question_text.slice(0, 50)}"`);
    return { subqueries: 0 };
  }

  const { error } = await supabase.from("sub_queries").insert(rows);
  if (error) {
    console.error(`[expand_query] Insert error:`, error.message);
  }

  console.log(`[expand_query] Created ${rows.length} subqueries for "${question.question_text.slice(0, 50)}"`);
  return { subqueries: rows.length };
}
