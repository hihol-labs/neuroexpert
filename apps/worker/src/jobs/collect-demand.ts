import { supabase } from "../supabase.js";
import { fetchWordstat } from "../services/wordstat.js";
import { fetchPAA } from "../services/serpapi.js";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-zа-яё0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 120);
}

export async function handleCollectDemand(payload: Record<string, unknown>): Promise<{ collected: number }> {
  const nicheId = payload.niche_id as string;
  if (!nicheId) throw new Error("niche_id is required");

  // Загружаем seed_keywords ниши
  const { data: niche } = await supabase
    .from("niches")
    .select("name, seed_keywords")
    .eq("id", nicheId)
    .single();

  if (!niche) throw new Error(`Niche ${nicheId} not found`);

  const keywords: string[] = niche.seed_keywords ?? [];
  if (keywords.length === 0) {
    console.log(`[collect_demand] No seed_keywords for niche ${niche.name}`);
    return { collected: 0 };
  }

  console.log(`[collect_demand] Collecting for "${niche.name}", ${keywords.length} keywords`);

  const allQuestions = new Map<string, number>(); // question_text → volume

  for (const keyword of keywords) {
    // Wordstat
    try {
      const results = await fetchWordstat(keyword);
      for (const r of results) {
        const existing = allQuestions.get(r.query);
        if (!existing || existing < r.volume) {
          allQuestions.set(r.query, r.volume);
        }
      }
    } catch (err) {
      console.error(`[collect_demand] Wordstat failed for "${keyword}":`, err instanceof Error ? err.message : err);
    }

    // People Also Ask
    try {
      const paaQuestions = await fetchPAA(keyword);
      for (const q of paaQuestions) {
        if (!allQuestions.has(q.toLowerCase())) {
          allQuestions.set(q.toLowerCase(), 500); // PAA без объёма — ставим среднее
        }
      }
    } catch (err) {
      console.error(`[collect_demand] SerpAPI failed for "${keyword}":`, err instanceof Error ? err.message : err);
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (allQuestions.size === 0) {
    console.log(`[collect_demand] No questions found for niche ${niche.name}`);
    return { collected: 0 };
  }

  // Upsert вопросы
  const rows = Array.from(allQuestions.entries()).map(([text, volume]) => ({
    niche_id: nicheId,
    question_text: text,
    slug: slugify(text),
    source: "wordstat" as const,
    monthly_volume: volume,
    is_active: true,
  }));

  let collected = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase
      .from("questions")
      .upsert(batch, { onConflict: "niche_id,question_text", ignoreDuplicates: false });

    if (error) {
      console.error(`[collect_demand] Upsert error:`, error.message);
    } else {
      collected += batch.length;
    }
  }

  console.log(`[collect_demand] Collected ${collected} questions for "${niche.name}"`);

  // Создаём задачу find_gaps
  await supabase.from("jobs").insert({
    type: "find_gaps",
    payload: { niche_id: nicheId },
    priority: 4,
  });

  return { collected };
}
