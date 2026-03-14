/**
 * AIO Monitoring Script — проверяет цитирование экспертов в ответах AI
 *
 * Запуск: npx tsx --env-file=.env.local scripts/validate-aio.ts
 */

import { createClient } from "@supabase/supabase-js";
import { createLLMProvider } from "shared";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CheckResult {
  question: string;
  expert: string;
  chatgpt: { cited: boolean; type: string };
  yandexgpt: { cited: boolean; type: string };
}

function checkCitation(
  response: string,
  expertName: string,
  publishedUrl: string | null,
): { cited: boolean; type: string } {
  const lower = response.toLowerCase();
  const nameLower = expertName.toLowerCase();

  // Check name mention
  if (lower.includes(nameLower)) {
    return { cited: true, type: "name" };
  }

  // Check URL mention
  if (publishedUrl && lower.includes(publishedUrl.replace("https://", "").replace("http://", ""))) {
    return { cited: true, type: "url" };
  }

  // Check "neuroexpert" mention
  if (lower.includes("neuroexpert") || lower.includes("нейроэксперт")) {
    return { cited: true, type: "content_match" };
  }

  return { cited: false, type: "none" };
}

async function queryLLM(provider: string, question: string): Promise<string> {
  try {
    const llm = createLLMProvider(provider as "openai" | "yandexgpt");
    return await llm.generateText(question, {
      maxTokens: 1024,
      temperature: 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `[ERROR: ${msg}]`;
  }
}

async function main() {
  console.log("=== AIO Monitoring Script ===\n");

  // Fetch published content with expert data
  const { data: packages, error } = await supabase
    .from("content_packages")
    .select("id, title, slug, published_url, expert_id, question_id, questions(question_text), profiles!inner(full_name, slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch content:", error.message);
    process.exit(1);
  }

  if (!packages || packages.length === 0) {
    console.log("No published pages found. Nothing to check.");
    process.exit(0);
  }

  console.log(`Found ${packages.length} published pages\n`);

  const results: CheckResult[] = [];
  let totalChecks = 0;
  let totalCited = 0;

  for (const pkg of packages) {
    const question = (pkg.questions as unknown as { question_text: string } | null)?.question_text
      ?? pkg.title ?? "Unknown";
    const expertName = (pkg.profiles as unknown as { full_name: string }).full_name;
    const publishedUrl = pkg.published_url as string | null;

    console.log(`Checking: "${question.slice(0, 60)}..." (${expertName})`);

    // Query ChatGPT (OpenAI)
    const chatgptResponse = await queryLLM("openai", question);
    const chatgptCheck = checkCitation(chatgptResponse, expertName, publishedUrl);

    // Query YandexGPT
    const yandexResponse = await queryLLM("yandexgpt", question);
    const yandexCheck = checkCitation(yandexResponse, expertName, publishedUrl);

    results.push({
      question: question.slice(0, 60),
      expert: expertName,
      chatgpt: chatgptCheck,
      yandexgpt: yandexCheck,
    });

    // Save to citation_checks
    const checks = [
      { platform: "chatgpt", response: chatgptResponse, result: chatgptCheck },
      { platform: "yandexgpt", response: yandexResponse, result: yandexCheck },
    ];

    for (const check of checks) {
      await supabase.from("citation_checks").insert({
        content_id: pkg.id,
        expert_id: pkg.expert_id,
        ai_platform: check.platform,
        question_text: question,
        ai_response: check.response.slice(0, 5000),
        is_cited: check.result.cited,
        citation_type: check.result.type,
      });

      totalChecks++;
      if (check.result.cited) totalCited++;
    }

    // Rate limiting between requests
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Print results table
  console.log("\n" + "=".repeat(100));
  console.log(
    padRight("Вопрос", 40) +
    padRight("Эксперт", 20) +
    padRight("ChatGPT", 15) +
    padRight("YandexGPT", 15) +
    "Цитируется?",
  );
  console.log("-".repeat(100));

  for (const r of results) {
    const cited = r.chatgpt.cited || r.yandexgpt.cited;
    console.log(
      padRight(r.question, 40) +
      padRight(r.expert, 20) +
      padRight(r.chatgpt.cited ? `✅ ${r.chatgpt.type}` : "❌", 15) +
      padRight(r.yandexgpt.cited ? `✅ ${r.yandexgpt.type}` : "❌", 15) +
      (cited ? "✅" : "❌"),
    );
  }

  console.log("=".repeat(100));

  const citationRate = totalChecks > 0 ? ((totalCited / totalChecks) * 100).toFixed(1) : "0";
  const pagesWithCitation = results.filter((r) => r.chatgpt.cited || r.yandexgpt.cited).length;

  console.log(`\nИтого:`);
  console.log(`  Страниц проверено: ${results.length}`);
  console.log(`  Цитируется хотя бы в 1 AI: ${pagesWithCitation}/${results.length}`);
  console.log(`  Общий % цитирования: ${citationRate}%`);
  console.log(`  Всего проверок: ${totalChecks}, из них с цитатой: ${totalCited}`);
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len - 1) + " ";
  return str + " ".repeat(len - str.length);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
