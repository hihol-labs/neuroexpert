import { supabase } from "../supabase.js";
import { probeAI } from "../services/ai-prober.js";
import { getLLM, SYSTEM_PROMPT_FILTER, buildFilterPrompt, type FilteredQuestion } from "shared";

const PLATFORMS: Array<"chatgpt" | "yandexgpt" | "gigachat" | "perplexity"> = [
  "chatgpt",
  "yandexgpt",
  ...(process.env.GIGACHAT_API_KEY ? ["gigachat" as const] : []),
  ...(process.env.PERPLEXITY_API_KEY ? ["perplexity" as const] : []),
];
const MAX_QUESTIONS = 50;

export async function handleFindGaps(payload: Record<string, unknown>): Promise<{ analyzed: number }> {
  const nicheId = payload.niche_id as string;
  if (!nicheId) throw new Error("niche_id is required");

  // Топ вопросы по volume, ещё не проанализированные (или давно)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, monthly_volume")
    .eq("niche_id", nicheId)
    .eq("is_active", true)
    .or(`gap_analyzed_at.is.null,gap_analyzed_at.lt.${thirtyDaysAgo}`)
    .order("monthly_volume", { ascending: false })
    .limit(200);

  if (!questions?.length) {
    console.log(`[find_gaps] No unanalyzed questions for niche ${nicheId}`);
    return { analyzed: 0 };
  }

  // LLM-фильтрация: отбираем 50 самых перспективных
  let filtered = questions.slice(0, MAX_QUESTIONS);
  if (questions.length > MAX_QUESTIONS) {
    try {
      const { primary } = getLLM();
      const result = await primary.generateJSON<FilteredQuestion[]>(
        buildFilterPrompt(questions.map((q) => q.question_text)),
        { systemPrompt: SYSTEM_PROMPT_FILTER, maxTokens: 4096 },
      );
      const highPriority = result
        .filter((r) => r.priority === "high")
        .map((r) => r.index - 1)
        .filter((i) => i >= 0 && i < questions.length);

      if (highPriority.length >= 10) {
        filtered = highPriority.slice(0, MAX_QUESTIONS).map((i) => questions[i]);
      }
    } catch (err) {
      console.error("[find_gaps] LLM filter failed, using top by volume:", err instanceof Error ? err.message : err);
    }
  }

  console.log(`[find_gaps] Analyzing ${filtered.length} questions`);

  let analyzed = 0;
  for (const q of filtered) {
    // Query fan-out: создаём задачу expand_query
    await supabase.from("jobs").insert({
      type: "expand_query",
      payload: { question_id: q.id },
      priority: 6,
    });

    // Probe 1-2 AI платформы
    const platformsToCheck = PLATFORMS.slice(0, 2);
    const updates: Record<string, unknown> = { gap_analyzed_at: new Date().toISOString() };

    for (const platform of platformsToCheck) {
      try {
        const result = await probeAI(q.question_text, platform);

        if (platform === "chatgpt") {
          updates.ai_response_chatgpt = result.response.slice(0, 5000);
        } else if (platform === "yandexgpt") {
          updates.ai_response_yandexgpt = result.response.slice(0, 5000);
        }

        updates.has_expert_name = result.hasExpertName;
        updates.has_specific_examples = result.hasSpecificExamples;
        updates.has_source_link = result.hasSourceLink;
        updates.has_specific_numbers = result.hasSpecificNumbers;
        updates.gap_score = result.gapScore;
      } catch (err) {
        console.error(`[find_gaps] Probe ${platform} failed for "${q.question_text.slice(0, 50)}":`, err instanceof Error ? err.message : err);
      }

      await new Promise((r) => setTimeout(r, 1500));
    }

    await supabase.from("questions").update(updates).eq("id", q.id);
    analyzed++;
  }

  console.log(`[find_gaps] Analyzed ${analyzed} questions for niche ${nicheId}`);

  // Создаём задачу generate_orders
  await supabase.from("jobs").insert({
    type: "generate_orders",
    payload: { niche_id: nicheId },
    priority: 5,
  });

  return { analyzed };
}
