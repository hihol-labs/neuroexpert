import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

// Rate limit: 3 scans per hour per IP
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 3600_000; // 1 hour
  const maxRequests = 3;

  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

type FetchFn = typeof globalThis.fetch;

async function createProxiedFetch(): Promise<FetchFn | undefined> {
  const proxyUrl = process.env.OPENAI_PROXY_URL;
  if (!proxyUrl) return undefined;

  const { ProxyAgent } = await import("undici");
  const dispatcher = new ProxyAgent(proxyUrl);
  return (url, init) =>
    // @ts-expect-error undici dispatcher type
    fetch(url, { ...init, dispatcher });
}

interface PlatformVisibility {
  platform: string;
  mentioned: boolean;
  context: string;
  sentiment: "positive" | "neutral" | "negative" | "not_found";
}

interface ScanResult {
  query: string;
  slug: string;
  platforms: PlatformVisibility[];
  visibility_percent: number;
  total_platforms: number;
  mentioned_count: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/gi, (ch) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
        з: "z", и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o",
        п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
        ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[ch.toLowerCase()] || ch;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// --- ChatGPT check ---
async function checkChatGPT(query: string, proxiedFetch?: FetchFn): Promise<PlatformVisibility | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    temperature: 0.7,
    messages: [{ role: "user", content: `Кто такой/что такое "${query}"? Расскажи подробно.` }],
  });

  const text = res.choices[0]?.message?.content || "";
  const mentioned = text.toLowerCase().includes(query.toLowerCase());
  const sentiment = mentioned ? "positive" : "not_found";

  return {
    platform: "ChatGPT",
    mentioned,
    context: text.slice(0, 300),
    sentiment,
  };
}

// --- Perplexity check ---
async function checkPerplexity(query: string, proxiedFetch?: FetchFn): Promise<PlatformVisibility | null> {
  if (!process.env.PERPLEXITY_API_KEY) return null;

  const client = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });

  const res = await client.chat.completions.create({
    model: "sonar",
    max_tokens: 400,
    messages: [{ role: "user", content: `Кто такой/что такое "${query}"? Расскажи подробно.` }],
  });

  const text = res.choices[0]?.message?.content || "";
  const mentioned = text.toLowerCase().includes(query.toLowerCase());

  return {
    platform: "Perplexity",
    mentioned,
    context: text.slice(0, 300),
    sentiment: mentioned ? "positive" : "not_found",
  };
}

// --- DeepSeek check ---
// OpenAI-совместимый API (api.deepseek.com), доступен из РФ напрямую — прокси
// не нужен (в отличие от ChatGPT). Гейт по ключу: без DEEPSEEK_API_KEY адаптер
// возвращает null и платформа просто не участвует в замере — тот же контракт,
// что у остальных (G-011b, icebox снят пользователем 2026-08-27).
async function checkDeepSeek(query: string): Promise<PlatformVisibility | null> {
  if (!process.env.DEEPSEEK_API_KEY) return null;

  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  const res = await client.chat.completions.create({
    model: "deepseek-chat",
    max_tokens: 400,
    temperature: 0.7,
    messages: [{ role: "user", content: `Кто такой/что такое "${query}"? Расскажи подробно.` }],
  });

  const text = res.choices[0]?.message?.content || "";
  const mentioned = text.toLowerCase().includes(query.toLowerCase());

  return {
    platform: "DeepSeek",
    mentioned,
    context: text.slice(0, 300),
    sentiment: mentioned ? "positive" : "not_found",
  };
}

// --- YandexGPT check ---
async function checkYandexGPT(query: string): Promise<PlatformVisibility | null> {
  if (!process.env.YANDEX_API_KEY || !process.env.YANDEX_FOLDER_ID) return null;

  const folderId = process.env.YANDEX_FOLDER_ID;
  const res = await fetch("https://llm.api.cloud.yandex.net/foundationModels/v1/completion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Api-Key ${process.env.YANDEX_API_KEY}`,
      "x-folder-id": folderId,
    },
    body: JSON.stringify({
      modelUri: `gpt://${folderId}/yandexgpt/latest`,
      completionOptions: { maxTokens: 400, temperature: 0.7 },
      messages: [{ role: "user", text: `Кто такой/что такое "${query}"? Расскажи подробно.` }],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    result: { alternatives: Array<{ message: { text: string } }> };
  };
  const text = data.result.alternatives[0]?.message?.text || "";
  const mentioned = text.toLowerCase().includes(query.toLowerCase());

  return {
    platform: "YandexGPT",
    mentioned,
    context: text.slice(0, 300),
    sentiment: mentioned ? "positive" : "not_found",
  };
}

async function scanAllPlatforms(query: string, proxiedFetch?: FetchFn): Promise<PlatformVisibility[]> {
  const checkers = [
    checkChatGPT(query, proxiedFetch),
    checkPerplexity(query, proxiedFetch),
    checkYandexGPT(query),
    checkDeepSeek(query),
  ];

  const results = await Promise.all(
    checkers.map(async (p) => {
      try { return await p; } catch (err) {
        console.error("[scan] Platform error:", err);
        return null;
      }
    }),
  );

  return results.filter(Boolean) as PlatformVisibility[];
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Лимит проверок: 3 в час. Попробуйте позже." },
      { status: 429 },
    );
  }

  let body: { query?: string; competitor?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query || query.length < 2 || query.length > 200) {
    return NextResponse.json(
      { error: "Введите имя, бренд или сайт (2-200 символов)" },
      { status: 400 },
    );
  }

  const competitorQuery = body.competitor?.trim() || null;
  const proxiedFetch = await createProxiedFetch();
  const slug = slugify(query);

  // Scan main query
  const mainResults = await scanAllPlatforms(query, proxiedFetch);

  // Scan competitor if provided
  let competitorResults: PlatformVisibility[] | null = null;
  let competitorVisibility = 0;
  if (competitorQuery && competitorQuery.length >= 2) {
    competitorResults = await scanAllPlatforms(competitorQuery, proxiedFetch);
    const compMentioned = competitorResults.filter((p) => p.mentioned).length;
    competitorVisibility = competitorResults.length > 0
      ? Math.round((compMentioned / competitorResults.length) * 100)
      : 0;
  }

  const mentionedCount = mainResults.filter((p) => p.mentioned).length;
  const visibilityPercent = mainResults.length > 0
    ? Math.round((mentionedCount / mainResults.length) * 100)
    : 0;

  const scanResult = {
    query,
    slug,
    platforms: mainResults,
    visibility_percent: visibilityPercent,
    total_platforms: mainResults.length,
    mentioned_count: mentionedCount,
    ...(competitorQuery && {
      competitor: {
        query: competitorQuery,
        platforms: competitorResults,
        visibility_percent: competitorVisibility,
        mentioned_count: competitorResults?.filter((p) => p.mentioned).length ?? 0,
      },
    }),
  };

  // Save to DB for SSR page
  const supabase = createAdminClient();
  await (supabase as unknown as { from: (t: string) => { upsert: (v: Record<string, unknown>, o: { onConflict: string }) => Promise<unknown> } })
    .from("scan_results")
    .upsert(
      {
        slug,
        query,
        platforms: scanResult,
        visibility_percent: visibilityPercent,
        total_platforms: mainResults.length,
        mentioned_count: mentionedCount,
        scanned_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );

  return NextResponse.json(scanResult);
}
