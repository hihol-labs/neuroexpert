import { supabase } from "../supabase.js";
import { getLLM, SYSTEM_PROMPT_CONTENT, ARTICLE_STRUCTURE } from "shared";

const MAX_REWORK_ATTEMPTS = 2;

interface ValidationIssue {
  field: string;
  message: string;
}

function validateArticle(article: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Word count
  const wordCount = article.split(/\s+/).filter(Boolean).length;
  if (wordCount < ARTICLE_STRUCTURE.MIN_WORD_COUNT) {
    issues.push({
      field: "word_count",
      message: `Статья содержит ${wordCount} слов, нужно минимум ${ARTICLE_STRUCTURE.MIN_WORD_COUNT}`,
    });
  }

  // TL;DR
  const hasTldr = /\*\*TL;DR[:\*]*\s*/i.test(article) || article.toLowerCase().startsWith("tl;dr");
  if (!hasTldr) {
    issues.push({
      field: "has_tldr",
      message: "Нет блока TL;DR в начале статьи. Добавь абзац «**TL;DR:** » (40–60 слов)",
    });
  } else {
    // Check TL;DR length
    const tldrMatch = article.match(/\*\*TL;DR[:\*]*\s*\*?\*?\s*(.+?)(?:\n\n|$)/is);
    if (tldrMatch) {
      const tldrWords = tldrMatch[1].split(/\s+/).filter(Boolean).length;
      if (tldrWords < ARTICLE_STRUCTURE.TLDR_WORDS_MIN || tldrWords > ARTICLE_STRUCTURE.TLDR_WORDS_MAX) {
        issues.push({
          field: "tldr_length",
          message: `TL;DR содержит ${tldrWords} слов, нужно ${ARTICLE_STRUCTURE.TLDR_WORDS_MIN}–${ARTICLE_STRUCTURE.TLDR_WORDS_MAX}`,
        });
      }
    }
  }

  // Table
  const hasTable = article.includes("| ") && article.includes(" |") && article.includes("---");
  if (!hasTable) {
    issues.push({
      field: "has_table",
      message: "Нет markdown-таблицы. Добавь хотя бы одну таблицу в формате | col1 | col2 |",
    });
  }

  // H2/H3 passages
  const headings = article.match(/^#{2,3}\s+.+/gm) ?? [];
  if (headings.length < ARTICLE_STRUCTURE.PASSAGE_MIN) {
    issues.push({
      field: "passage_count",
      message: `Найдено ${headings.length} заголовков H2/H3, нужно минимум ${ARTICLE_STRUCTURE.PASSAGE_MIN}`,
    });
  }

  // Numbered list
  const hasNumberedList = /^\d+\.\s+.+/m.test(article);
  if (!hasNumberedList) {
    issues.push({
      field: "numbered_list",
      message: "Нет нумерованного списка (1. 2. 3.). Добавь хотя бы один",
    });
  }

  return issues;
}

function buildReworkPrompt(article: string, issues: ValidationIssue[]): string {
  const issuesList = issues.map((i) => `- ${i.message}`).join("\n");

  return `Статья не проходит валидацию. Доработай её, исправив следующие проблемы:

${issuesList}

Текущая статья:
${article}

Требования:
- Сохрани весь существующий контент
- Дополни недостающие элементы
- Объём: 2900–3500 слов
- Формат: Markdown
- В конце: META_TITLE, META_DESCRIPTION, KEYWORDS

Ответь только доработанной статьёй.`;
}

export async function handleValidateContent(payload: Record<string, unknown>): Promise<{ valid: boolean }> {
  const contentPackageId = payload.content_package_id as string;
  const expertId = payload.expert_id as string;
  const attempt = (payload.attempt as number) ?? 1;

  if (!contentPackageId) throw new Error("content_package_id is required");

  const { data: pkg } = await supabase
    .from("content_packages")
    .select("id, format_seo_article, expert_id")
    .eq("id", contentPackageId)
    .single();

  if (!pkg?.format_seo_article) {
    throw new Error(`Content package ${contentPackageId} not found or no article`);
  }

  const issues = validateArticle(pkg.format_seo_article);

  if (issues.length === 0) {
    // Валидация пройдена
    const wordCount = pkg.format_seo_article.split(/\s+/).filter(Boolean).length;
    const headings = pkg.format_seo_article.match(/^#{2,3}\s+.+/gm) ?? [];

    await supabase
      .from("content_packages")
      .update({
        status: "review",
        word_count: wordCount,
        has_tldr: true,
        has_table: true,
        passage_count: headings.length,
      })
      .eq("id", contentPackageId);

    // Уведомляем эксперта
    await notifyExpertReady(expertId ?? pkg.expert_id, contentPackageId);

    console.log(`[validate_content] Package ${contentPackageId} passed validation`);
    return { valid: true };
  }

  console.log(`[validate_content] Package ${contentPackageId} has ${issues.length} issues (attempt ${attempt})`);

  if (attempt > MAX_REWORK_ATTEMPTS) {
    // Превышен лимит доработок — ставим review с пометкой
    const wordCount = pkg.format_seo_article.split(/\s+/).filter(Boolean).length;
    const headings = pkg.format_seo_article.match(/^#{2,3}\s+.+/gm) ?? [];
    const hasTldr = /\*\*TL;DR/i.test(pkg.format_seo_article);
    const hasTable = pkg.format_seo_article.includes("| ") && pkg.format_seo_article.includes(" |");

    await supabase
      .from("content_packages")
      .update({
        status: "review",
        word_count: wordCount,
        has_tldr: hasTldr,
        has_table: hasTable,
        passage_count: headings.length,
      })
      .eq("id", contentPackageId);

    // Уведомляем эксперта (с пометкой о ручной проверке)
    await notifyExpertReady(expertId ?? pkg.expert_id, contentPackageId, true);

    console.log(`[validate_content] Package ${contentPackageId} sent to review (needs manual check)`);
    return { valid: false };
  }

  // Доработка через LLM
  const { primary, fallback } = getLLM();
  const reworkPrompt = buildReworkPrompt(pkg.format_seo_article, issues);
  let reworkedArticle: string;

  try {
    reworkedArticle = await primary.generateText(reworkPrompt, {
      systemPrompt: SYSTEM_PROMPT_CONTENT,
      maxTokens: 8192,
      temperature: 0.5,
    });
  } catch {
    reworkedArticle = await fallback.generateText(reworkPrompt, {
      systemPrompt: SYSTEM_PROMPT_CONTENT,
      maxTokens: 8192,
      temperature: 0.5,
    });
  }

  // Обновляем статью
  const newWordCount = reworkedArticle.split(/\s+/).filter(Boolean).length;
  const newHeadings = reworkedArticle.match(/^#{2,3}\s+.+/gm) ?? [];
  const newHasTldr = /\*\*TL;DR/i.test(reworkedArticle);
  const newHasTable = reworkedArticle.includes("| ") && reworkedArticle.includes(" |");

  await supabase
    .from("content_packages")
    .update({
      format_seo_article: reworkedArticle,
      word_count: newWordCount,
      has_tldr: newHasTldr,
      has_table: newHasTable,
      passage_count: newHeadings.length,
    })
    .eq("id", contentPackageId);

  // Ставим новую задачу валидации
  await supabase.from("jobs").insert({
    type: "validate_content",
    payload: { content_package_id: contentPackageId, expert_id: expertId, attempt: attempt + 1 },
    priority: 3,
  });

  console.log(`[validate_content] Package ${contentPackageId} reworked, re-validation queued`);
  return { valid: false };
}

async function notifyExpertReady(
  expertId: string,
  contentPackageId: string,
  needsManualReview = false,
): Promise<void> {
  const { data: expert } = await supabase
    .from("profiles")
    .select("telegram_id")
    .eq("id", expertId)
    .single();

  if (!expert?.telegram_id) return;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const reviewNote = needsManualReview ? "\n\n⚠️ Требуется ручная проверка" : "";
  const text = `✅ Контент готов к проверке!${reviewNote}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Опубликовать", callback_data: `approve:${contentPackageId}` },
        { text: "✏️ Редактировать", callback_data: `edit:${contentPackageId}` },
      ],
    ],
  };

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: expert.telegram_id,
        text,
        reply_markup: keyboard,
      }),
    });
  } catch (err) {
    console.error("[validate_content] Telegram notification error:", err);
  }
}
