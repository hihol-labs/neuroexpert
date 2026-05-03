import { supabase } from "../supabase.js";
import { fetchWordstat } from "../services/wordstat.js";
import { fetchPAA } from "../services/serpapi.js";
import { fetchYandexKyuQuestions } from "../services/yandex-kyu.js";

type DemandSource = "wordstat" | "serpapi" | "yandex_kyu";

interface DemandQuestion {
  source: DemandSource;
  volume: number | null;
}

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

  const allQuestions = new Map<string, DemandQuestion>();

  const rememberQuestion = (
    text: string,
    source: DemandSource,
    volume: number | null,
  ) => {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return;

    const existing = allQuestions.get(normalized);
    if (!existing) {
      allQuestions.set(normalized, { source, volume });
      return;
    }

    // Wordstat is the only source with verified demand volume here.
    // If the same question later appears in Wordstat, promote it.
    if (source === "wordstat" && existing.source !== "wordstat") {
      allQuestions.set(normalized, { source, volume });
      return;
    }

    if (source === "wordstat" && existing.source === "wordstat") {
      allQuestions.set(normalized, {
        source,
        volume: Math.max(existing.volume ?? 0, volume ?? 0),
      });
    }
  };

  for (const keyword of keywords) {
    // Wordstat
    try {
      const results = await fetchWordstat(keyword);
      for (const r of results) {
        rememberQuestion(r.query, "wordstat", r.volume);
      }
    } catch (err) {
      console.error(`[collect_demand] Wordstat failed for "${keyword}":`, err instanceof Error ? err.message : err);
    }

    // People Also Ask
    try {
      const paaQuestions = await fetchPAA(keyword);
      for (const q of paaQuestions) {
        rememberQuestion(q, "serpapi", null);
      }
    } catch (err) {
      console.error(`[collect_demand] SerpAPI failed for "${keyword}":`, err instanceof Error ? err.message : err);
    }

    // Яндекс Кью
    try {
      const kyuQuestions = await fetchYandexKyuQuestions(keyword);
      for (const q of kyuQuestions) {
        rememberQuestion(q, "yandex_kyu", null);
      }
    } catch (err) {
      console.error(`[collect_demand] Yandex Kyu failed for "${keyword}":`, err instanceof Error ? err.message : err);
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (allQuestions.size === 0) {
    console.log(`[collect_demand] No questions found for niche ${niche.name}`);
    return { collected: 0 };
  }

  // Upsert вопросы
  const rows = Array.from(allQuestions.entries()).map(([text, item]) => ({
    niche_id: nicheId,
    question_text: text,
    slug: slugify(text),
    source: item.source,
    monthly_volume: item.volume,
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
