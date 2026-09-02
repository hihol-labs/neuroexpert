import { supabase } from "../supabase.js";
import { getLLM, buildQueryFanoutPrompt, normalizeFanoutResponse } from "shared";
import type { FanoutItem } from "shared";

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

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

  // LLM: разбиваем на подзапросы. Ответ каждого провайдера нормализуется:
  // OpenAI в json_object-режиме заворачивает массив в объект (QUEUE-4).
  const { primary, fallback } = getLLM();
  const prompt = buildQueryFanoutPrompt(question.question_text);
  const llmOptions = { maxTokens: 512, temperature: 0.3 };

  let subqueries: FanoutItem[] = [];
  let primaryError: string | null = null;
  let fallbackError: string | null = null;

  try {
    subqueries = normalizeFanoutResponse(await primary.generateJSON<unknown>(prompt, llmOptions));
    if (subqueries.length === 0) primaryError = "empty fan-out";
  } catch (err) {
    primaryError = describeError(err);
    console.error(`[expand_query] Primary LLM failed for ${questionId}:`, primaryError);
  }

  if (subqueries.length === 0) {
    try {
      subqueries = normalizeFanoutResponse(await fallback.generateJSON<unknown>(prompt, llmOptions));
      if (subqueries.length === 0) fallbackError = "empty fan-out";
    } catch (err) {
      fallbackError = describeError(err);
      console.error(`[expand_query] Fallback LLM failed for ${questionId}:`, fallbackError);
    }
  }

  // Пустой fan-out — провал, а не «успех с нулём»: job обязан уйти в failed
  // с ошибками ОБОИХ провайдеров (QUEUE-2/QUEUE-4), иначе падение невидимо.
  if (subqueries.length === 0) {
    throw new Error(
      `expand_query fan-out empty for ${questionId}: primary=${primaryError ?? "n/a"}; fallback=${fallbackError ?? "n/a"}`,
    );
  }

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
  }));

  const { error } = await supabase.from("sub_queries").insert(rows);
  if (error) {
    // Ошибка записи раньше только логировалась, а job закрывался успехом.
    throw new Error(`expand_query insert failed for ${questionId}: ${error.message}`);
  }

  console.log(`[expand_query] Created ${rows.length} subqueries for "${question.question_text.slice(0, 50)}"`);
  return { subqueries: rows.length };
}
