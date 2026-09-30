import { supabase } from "../supabase.js";
import {
  getLLM,
  SYSTEM_PROMPT_CONTENT,
  SYSTEM_PROMPT_MINIMAL,
  buildTelegramPostPrompt,
  buildSeoArticlePrompt,
  buildMinimalArticlePrompt,
  buildCardsPrompt,
  buildReelsScriptPrompt,
  buildFaqPrompt,
  buildVoiceProfilePrompt,
  formatVoiceProfileForPrompt,
  slugifyLatin,
  uniqueSlug,
  getAllowedFormats,
  packageAllowance,
  type VoiceProfile,
} from "shared";

function extractMeta(article: string): { metaTitle: string; metaDescription: string; keywords: string[] } {
  const titleMatch = article.match(/META_TITLE:\s*(.+)/i);
  const descMatch = article.match(/META_DESCRIPTION:\s*(.+)/i);
  const kwMatch = article.match(/KEYWORDS:\s*(.+)/i);

  return {
    metaTitle: titleMatch?.[1]?.trim() ?? "",
    metaDescription: descMatch?.[1]?.trim() ?? "",
    keywords: kwMatch?.[1]?.split(",").map((k) => k.trim()).filter(Boolean) ?? [],
  };
}

function extractQuotes(text: string, expertName: string): string[] {
  const quotes: string[] = [];
  // Match patterns like: «Как отмечает Имя: "цитата"» or "цитата"
  const patterns = [
    new RegExp(`${expertName}[^"]*"([^"]{20,})"`, "g"),
    /«([^»]{20,})»/g,
    /"([^"]{30,})"/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[1] && quotes.length < 3) quotes.push(match[1]);
    }
  }
  return quotes;
}

async function callLLM(prompt: string, opts?: { maxTokens?: number }): Promise<string> {
  const { primary, fallback } = getLLM();
  try {
    return await primary.generateText(prompt, {
      systemPrompt: SYSTEM_PROMPT_CONTENT,
      maxTokens: opts?.maxTokens ?? 4096,
      temperature: 0.7,
    });
  } catch (err) {
    console.error("[generate_content] Primary LLM failed, trying fallback:", err);
    return await fallback.generateText(prompt, {
      systemPrompt: SYSTEM_PROMPT_CONTENT,
      maxTokens: opts?.maxTokens ?? 4096,
      temperature: 0.7,
    });
  }
}

async function callLLMJson<T>(prompt: string): Promise<T> {
  const { primary, fallback } = getLLM();
  try {
    return await primary.generateJSON<T>(prompt, {
      systemPrompt: SYSTEM_PROMPT_CONTENT,
      maxTokens: 2048,
      temperature: 0.7,
    });
  } catch {
    return await fallback.generateJSON<T>(prompt, {
      systemPrompt: SYSTEM_PROMPT_CONTENT,
      maxTokens: 2048,
      temperature: 0.7,
    });
  }
}

export async function handleGenerateContent(payload: Record<string, unknown>): Promise<{ content_package_id: string | null; skipped?: "package_limit" }> {
  const voiceId = payload.voice_recording_id as string ?? payload.voice_id as string;
  const expertId = payload.expert_id as string;
  const orderId = (payload.order_id as string) ?? null;
  const processingMode = (payload.processing_mode as string) ?? "full"; // "full" | "minimal"

  if (!voiceId || !expertId) {
    throw new Error("voice_recording_id and expert_id are required");
  }

  // Загружаем данные
  const { data: recording } = await supabase
    .from("voice_recordings")
    .select("transcript, order_id")
    .eq("id", voiceId)
    .single();

  if (!recording?.transcript) {
    throw new Error(`No transcript for recording ${voiceId}`);
  }

  const { data: expert } = await supabase
    .from("profiles")
    .select("full_name, qualification, niche_id, telegram_id, voice_profile, subscription_tier")
    .eq("id", expertId)
    .single();

  if (!expert) throw new Error(`Expert ${expertId} not found`);

  // R-09 (E-AUTO-14): страховка лимита «пакетов в месяц» - входы (сайт/бот) уже отказали, но гонка
  // двух записей могла пройти. Превышение - не ошибка job (повторы бессмысленны): завершаем с причиной,
  // а тему возвращаем в accepted (иначе она зависла бы в processing без пакета); запись остаётся.
  const tier = (expert.subscription_tier as string | null) ?? "free";
  const allowance = await packageAllowance(supabase, tier, expertId);
  if (!allowance.allowed) {
    console.warn(`[generate_content] Package limit reached for expert ${expertId} (tier ${tier}: ${allowance.used}/${allowance.limit}${allowance.error ? `, error: ${allowance.error}` : ""}), skipping`);
    const stuckOrderId = orderId ?? recording.order_id;
    if (stuckOrderId) {
      await supabase.from("orders").update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", stuckOrderId).eq("expert_id", expertId).eq("status", "processing");
    }
    return { content_package_id: null, skipped: "package_limit" };
  }
  // Форматы по тарифу: free - Telegram-пост и SEO-статья; cards и reels_script не вызывают LLM.
  // FAQ генерируется всегда: он часть SEO-страницы (гейт публикации R-07 faq_required), а не отдельный формат.
  const allowed = new Set(getAllowedFormats(tier));

  // Вопрос из заказа
  const effectiveOrderId = orderId ?? recording.order_id;
  let questionText = "Свободная тема (без привязки к вопросу)";
  let questionId: string | null = null;

  if (effectiveOrderId) {
    const { data: order } = await supabase
      .from("orders")
      .select("question_id, questions(question_text)")
      .eq("id", effectiveOrderId)
      .single();
    if (order) {
      questionId = order.question_id;
      const q = order.questions as unknown as { question_text: string } | null;
      if (q) questionText = q.question_text;
    }
  }

  let voiceProfile = expert.voice_profile as VoiceProfile | null;
  try {
    const extracted = await callLLMJson<VoiceProfile>(
      buildVoiceProfilePrompt({
        transcript: recording.transcript,
        existingProfile: voiceProfile,
      }),
    );
    if (extracted && typeof extracted === "object") {
      voiceProfile = extracted;
      await supabase
        .from("profiles")
        .update({ voice_profile: extracted })
        .eq("id", expertId);
    }
  } catch (err) {
    console.error("[generate_content] Voice profile extraction failed:", err);
  }

  const params = {
    transcript: recording.transcript,
    expertName: expert.full_name,
    questionText,
    voiceGuide: formatVoiceProfileForPrompt(voiceProfile),
  };

  const isMinimal = processingMode === "minimal";
  const formatCount = 3 + (allowed.has("cards") ? 1 : 0) + (allowed.has("reels_script") ? 1 : 0);
  console.log(`[generate_content] Generating ${isMinimal ? "minimal" : `${formatCount} formats`} (tier ${tier}) for expert ${expertId}`);

  // Генерация контента
  let telegramPost: string;
  let seoArticle: string;
  let cards: Array<{ title: string; text: string }>;
  let reelsScript: string;
  let faq: Array<{ question: string; answer: string }>;
  const genCards = () => (allowed.has("cards") ? callLLMJson<Array<{ title: string; text: string }>>(buildCardsPrompt(params)) : Promise.resolve([]));
  const genReels = () => (allowed.has("reels_script") ? callLLM(buildReelsScriptPrompt(params)) : Promise.resolve(""));

  if (isMinimal) {
    // Режим минимальной обработки: только чистка текста
    const { primary, fallback } = getLLM();
    try {
      seoArticle = await primary.generateText(buildMinimalArticlePrompt(params), {
        systemPrompt: SYSTEM_PROMPT_MINIMAL,
        maxTokens: 8192,
        temperature: 0.3,
      });
    } catch {
      seoArticle = await fallback.generateText(buildMinimalArticlePrompt(params), {
        systemPrompt: SYSTEM_PROMPT_MINIMAL,
        maxTokens: 8192,
        temperature: 0.3,
      });
    }
    // Остальные форматы - по тарифу
    [telegramPost, cards, reelsScript, faq] = await Promise.all([
      callLLM(buildTelegramPostPrompt(params)),
      genCards(),
      genReels(),
      callLLMJson<Array<{ question: string; answer: string }>>(buildFaqPrompt(params)),
    ]);
  } else {
    // Полная обработка: форматы тарифа параллельно
    [telegramPost, seoArticle, cards, reelsScript, faq] = await Promise.all([
      callLLM(buildTelegramPostPrompt(params)),
      callLLM(buildSeoArticlePrompt(params), { maxTokens: 8192 }),
      genCards(),
      genReels(),
      callLLMJson<Array<{ question: string; answer: string }>>(buildFaqPrompt(params)),
    ]);
  }

  // Извлекаем мета из SEO-статьи
  const meta = extractMeta(seoArticle);
  const expertQuotes = extractQuotes(seoArticle, expert.full_name);
  // R-07: slug уникален в пределах эксперта (миграция 033) - повторная тема получает суффикс -2, -3…
  const { data: takenSlugs } = await supabase.from("content_packages").select("slug").eq("expert_id", expertId).not("slug", "is", null);
  const slug = uniqueSlug(slugifyLatin(meta.metaTitle || questionText), (takenSlugs ?? []).map((r) => r.slug as string));

  // Считаем метрики
  const wordCount = seoArticle.split(/\s+/).filter(Boolean).length;
  const hasTldr = /\*\*TL;DR[:\*]*\s*/i.test(seoArticle) || seoArticle.toLowerCase().startsWith("tl;dr");
  const hasTable = seoArticle.includes("| ") && seoArticle.includes(" |");
  const headingMatches = seoArticle.match(/^#{2,3}\s+.+/gm) ?? [];
  const passageCount = headingMatches.length;

  // Сохраняем
  const insertPackage = (slugValue: string) => supabase
    .from("content_packages")
    .insert({
      expert_id: expertId,
      order_id: effectiveOrderId,
      voice_id: voiceId,
      question_id: questionId,
      status: "generating",
      title: meta.metaTitle || questionText,
      slug: slugValue,
      format_telegram_post: telegramPost,
      format_seo_article: seoArticle,
      format_cards: cards,
      format_reels_script: reelsScript,
      format_faq: faq,
      meta_title: meta.metaTitle || null,
      meta_description: meta.metaDescription || null,
      keywords: meta.keywords,
      expert_quotes: expertQuotes,
      word_count: wordCount,
      has_tldr: hasTldr,
      has_table: hasTable,
      passage_count: passageCount,
      llm_provider: "auto",
      llm_model: "auto",
      generation_framework: {
        version: "marketing_os_v1",
        playbooks: ["voice_extractor", "copywriting", "aeo_ai_seo"],
        agent_roles: ["copywriter", "seo_analyst", "fact_checker"],
        human_review_required: true,
      },
    })
    .select("id")
    .single();

  // Гонка двух генераций с одной основой slug: индекс 033 отклоняет вторую вставку (23505) -
  // пересчитываем суффикс от уже занятых и повторяем, а не роняем job с готовым контентом.
  let { data: contentPkg, error: cpErr } = await insertPackage(slug);
  for (let attempt = 0; attempt < 3 && cpErr?.code === "23505"; attempt += 1) {
    const { data: again } = await supabase.from("content_packages").select("slug").eq("expert_id", expertId).not("slug", "is", null);
    ({ data: contentPkg, error: cpErr } = await insertPackage(uniqueSlug(slug, (again ?? []).map((r) => r.slug as string))));
  }

  if (cpErr || !contentPkg) {
    throw new Error(`Failed to save content package: ${cpErr?.message}`);
  }

  // Создаём задачу валидации
  await supabase.from("jobs").insert({
    type: "validate_content",
    payload: { content_package_id: contentPkg.id, expert_id: expertId, attempt: 1 },
    priority: 3,
  });

  console.log(`[generate_content] Created package ${contentPkg.id}, validation queued`);
  return { content_package_id: contentPkg.id };
}
