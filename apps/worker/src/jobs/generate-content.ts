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
} from "shared";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яёА-ЯЁ0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

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

export async function handleGenerateContent(payload: Record<string, unknown>): Promise<{ content_package_id: string }> {
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
    .select("full_name, qualification, niche_id, telegram_id")
    .eq("id", expertId)
    .single();

  if (!expert) throw new Error(`Expert ${expertId} not found`);

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

  const params = {
    transcript: recording.transcript,
    expertName: expert.full_name,
    questionText,
  };

  const isMinimal = processingMode === "minimal";
  console.log(`[generate_content] Generating ${isMinimal ? "minimal" : "5 formats"} for expert ${expertId}`);

  // Генерация контента
  let telegramPost: string;
  let seoArticle: string;
  let cards: Array<{ title: string; text: string }>;
  let reelsScript: string;
  let faq: Array<{ question: string; answer: string }>;

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
    // Остальные форматы генерируем стандартно
    [telegramPost, cards, reelsScript, faq] = await Promise.all([
      callLLM(buildTelegramPostPrompt(params)),
      callLLMJson<Array<{ title: string; text: string }>>(buildCardsPrompt(params)),
      callLLM(buildReelsScriptPrompt(params)),
      callLLMJson<Array<{ question: string; answer: string }>>(buildFaqPrompt(params)),
    ]);
  } else {
    // Полная обработка: 5 форматов параллельно
    [telegramPost, seoArticle, cards, reelsScript, faq] = await Promise.all([
      callLLM(buildTelegramPostPrompt(params)),
      callLLM(buildSeoArticlePrompt(params), { maxTokens: 8192 }),
      callLLMJson<Array<{ title: string; text: string }>>(buildCardsPrompt(params)),
      callLLM(buildReelsScriptPrompt(params)),
      callLLMJson<Array<{ question: string; answer: string }>>(buildFaqPrompt(params)),
    ]);
  }

  // Извлекаем мета из SEO-статьи
  const meta = extractMeta(seoArticle);
  const expertQuotes = extractQuotes(seoArticle, expert.full_name);
  const slug = slugify(meta.metaTitle || questionText);

  // Считаем метрики
  const wordCount = seoArticle.split(/\s+/).filter(Boolean).length;
  const hasTldr = /\*\*TL;DR[:\*]*\s*/i.test(seoArticle) || seoArticle.toLowerCase().startsWith("tl;dr");
  const hasTable = seoArticle.includes("| ") && seoArticle.includes(" |");
  const headingMatches = seoArticle.match(/^#{2,3}\s+.+/gm) ?? [];
  const passageCount = headingMatches.length;

  // Сохраняем
  const { data: contentPkg, error: cpErr } = await supabase
    .from("content_packages")
    .insert({
      expert_id: expertId,
      order_id: effectiveOrderId,
      voice_id: voiceId,
      question_id: questionId,
      status: "generating",
      title: meta.metaTitle || questionText,
      slug,
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
    })
    .select("id")
    .single();

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
