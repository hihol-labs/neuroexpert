import { createClient } from "@supabase/supabase-js";
import { buildPairReturnPath, decideOnDemandOutcome, isLocalVerticalId, isRelevantPairPhrase } from "shared";
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

const WORDSTAT_QUESTION_PREFIXES = (
  process.env.WORDSTAT_QUESTION_PREFIXES ||
  "как,почему,можно ли,что делать,сколько стоит,какой,нужно ли,стоит ли"
)
  .split(",")
  .map((prefix) => prefix.trim())
  .filter(Boolean);
const WORDSTAT_REQUEST_DELAY_MS = Number(
  process.env.WORDSTAT_REQUEST_DELAY_MS || 250,
);
const OTP_SEND_DELAY_MS = Number(process.env.PAIR_NOTIFY_DELAY_MS || 1500);
// G-018b (решение 2026-09-05): спрос локальной пары — фразы Wordstat без вопросных
// слов, порог частотности ниже экспертного (город меньше страны).
const PAIR_WORDSTAT_MIN_VOLUME = Number(process.env.PAIR_WORDSTAT_MIN_VOLUME || 300);

function buildWordstatQueries(keyword: string): string[] {
  const normalized = keyword.trim();
  if (!normalized) return [];

  return Array.from(
    new Set([
      normalized,
      ...WORDSTAT_QUESTION_PREFIXES.map((prefix) => `${prefix} ${normalized}`),
    ]),
  );
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://neuroexpertise.ru").replace(/\/$/, "");
}

/**
 * G-018b: письмо «данные готовы» ожидающим пару — magic-link через signInWithOtp
 * (решение владельца (г): аккаунт создаётся по email, письмо = только ссылка,
 * как в G-018). Ссылка возвращает на форму с prefill вертикали и города, где
 * pre-flight теперь пропустит к оплате.
 */
async function notifyPairRequests(nicheId: string, vertical: string, city: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("[collect_demand] NEXT_PUBLIC_SUPABASE_ANON_KEY не задан — письма ожидающим не отправлены (pair_requests остаются pending)");
    return 0;
  }
  if (!isLocalVerticalId(vertical)) return 0;
  const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: pending } = await supabase
    .from("pair_requests")
    .select("id, email")
    .eq("niche_id", nicheId)
    .eq("status", "pending");
  const next = buildPairReturnPath(vertical, city);
  let sent = 0;
  for (const req of pending ?? []) {
    try {
      const { error } = await anon.auth.signInWithOtp({
        email: String(req.email),
        options: { emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
      });
      if (error) {
        console.error(`[collect_demand] письмо ${req.email} не ушло:`, error.message);
        continue;
      }
      await supabase
        .from("pair_requests")
        .update({ status: "notified", notified_at: new Date().toISOString() })
        .eq("id", req.id);
      sent += 1;
    } catch (err) {
      console.error(`[collect_demand] письмо ${req.email} упало:`, err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, OTP_SEND_DELAY_MS));
  }
  return sent;
}

async function countActiveQuestions(nicheId: string): Promise<number> {
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("niche_id", nicheId)
    .eq("is_active", true);
  return count ?? 0;
}

/**
 * Завершение on_demand-сбора: demand_status filled/empty по порогу пары и
 * письмо ожидающим только при filled. Вызывается на ВСЕХ выходах (в т.ч. «нет
 * ключей», «ничего не нашли»), иначе пара застряла бы в running.
 */
async function finalizeOnDemand(nicheId: string, vertical: string | null, city: string | null): Promise<void> {
  const questionCount = await countActiveQuestions(nicheId);
  const outcome = decideOnDemandOutcome({ mode: "on_demand", questionCount });
  await supabase
    .from("niches")
    .update({ demand_status: outcome.demandStatus, demand_collected_at: new Date().toISOString() })
    .eq("id", nicheId);
  console.log(`[collect_demand] on_demand: пара ${nicheId} -> ${outcome.demandStatus} (${questionCount} вопросов)`);
  if (outcome.notify && vertical && city) {
    const sent = await notifyPairRequests(nicheId, vertical, city);
    console.log(`[collect_demand] on_demand: писем отправлено ${sent}`);
  }
}

export async function handleCollectDemand(payload: Record<string, unknown>): Promise<{ collected: number }> {
  const nicheId = payload.niche_id as string;
  if (!nicheId) throw new Error("niche_id is required");
  // G-018b: режим on_demand — сбор по паре «вертикаль × город» по первому интересу;
  // без цепочки find_gaps -> expand_query (решение владельца (а)). Cron-режим прежний.
  const onDemand = payload.mode === "on_demand";

  // Загружаем seed_keywords ниши
  const { data: niche } = await supabase
    .from("niches")
    .select("name, seed_keywords, vertical, city")
    .eq("id", nicheId)
    .single();

  if (!niche) throw new Error(`Niche ${nicheId} not found`);
  const pairVertical = typeof niche.vertical === "string" ? niche.vertical : null;
  const pairCity = typeof niche.city === "string" ? niche.city : null;

  if (onDemand) {
    await supabase.from("niches").update({ demand_status: "running" }).eq("id", nicheId);
  }

  try {
    const keywords: string[] = niche.seed_keywords ?? [];
    if (keywords.length === 0) {
      console.log(`[collect_demand] No seed_keywords for niche ${niche.name}`);
      if (onDemand) await finalizeOnDemand(nicheId, pairVertical, pairCity);
      return { collected: 0 };
    }

    console.log(`[collect_demand] Collecting for "${niche.name}", ${keywords.length} keywords${onDemand ? " (on_demand)" : ""}`);

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
      // Wordstat. Пара (on_demand): только базовый ключ, фразы спроса без
      // вопросных слов, релевантность по вертикальному термину — вопросная
      // форма («как стоматология Тюмень») в Wordstat пуста (канарейка 2026-09-05).
      const wordstatQueries = onDemand ? [keyword] : buildWordstatQueries(keyword);
      for (const wordstatQuery of wordstatQueries) {
        try {
          const results = onDemand
            ? await fetchWordstat(wordstatQuery, { questionsOnly: false, minVolume: PAIR_WORDSTAT_MIN_VOLUME })
            : await fetchWordstat(wordstatQuery);
          for (const r of results) {
            if (onDemand && pairCity && !isRelevantPairPhrase(r.query, keyword, pairCity)) continue;
            rememberQuestion(r.query, "wordstat", r.volume);
          }
        } catch (err) {
          console.error(
            `[collect_demand] Wordstat failed for "${wordstatQuery}":`,
            err instanceof Error ? err.message : err,
          );
        }
        await new Promise((r) => setTimeout(r, WORDSTAT_REQUEST_DELAY_MS));
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
      if (onDemand) await finalizeOnDemand(nicheId, pairVertical, pairCity);
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

    if (onDemand) {
      await finalizeOnDemand(nicheId, pairVertical, pairCity);
    }
    // Разрывы и хвост expand_query — только в cron-режиме: on_demand-пара не
    // растит очередь (решение по 754 / §5 спецификации).
    if (!onDemand) {
      await supabase.from("jobs").insert({
        type: "find_gaps",
        payload: { niche_id: nicheId },
        priority: 4,
      });
    }

    return { collected };
  } catch (err) {
    if (onDemand) {
      // Сбой сбора не должен заморозить пару в running: сбрасываем статус.
      // Пока этот job ждёт retry в очереди, API не ставит второй (проверяет
      // живые collect_demand по паре); после исчерпания retry следующий
      // интерес к паре поставит сбор заново.
      await supabase.from("niches").update({ demand_status: null }).eq("id", nicheId);
    }
    throw err;
  }
}
