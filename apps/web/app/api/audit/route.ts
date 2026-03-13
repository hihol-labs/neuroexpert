import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

// Simple in-memory rate limiter: 2 requests per minute per IP
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 2;

  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

// ============================================================
// Multi-platform AI check
// ============================================================

interface GapMarkers {
  has_expert_name: boolean;
  has_specific_examples: boolean;
  has_source_link: boolean;
  has_specific_numbers: boolean;
  gap_score: number;
  weakness: string;
}

interface PlatformResult {
  platform: string;
  ai_response: string;
  markers: GapMarkers;
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

const ANALYSIS_PROMPT = `Ты анализируешь ответ AI на вопрос пользователя. Проверяешь объективные структурные маркеры — не оцениваешь качество, а проверяешь факты. Ответь JSON.`;

function buildAnalysisUserPrompt(question: string, aiResponse: string): string {
  return `ВОПРОС: ${question}

ОТВЕТ AI:
${aiResponse}

Проверь маркеры:
1. has_expert_name — ссылается ли на конкретного эксперта по имени? (true/false)
2. has_specific_examples — есть ли конкретные примеры из практики с деталями/кейсами? (true/false)
3. has_source_link — есть ли URL-ссылка на источник? (true/false)
4. has_specific_numbers — есть ли конкретные цифры, сроки, дозировки, проценты? (true/false)

Рассчитай gap_score: (количество false / 4) * 10, округли до целого.
Напиши weakness — 1 предложение о главной слабости ответа.

JSON: {"has_expert_name":bool,"has_specific_examples":bool,"has_source_link":bool,"has_specific_numbers":bool,"gap_score":number,"weakness":"..."}`;
}

async function analyzeWithOpenAI(
  analyzer: OpenAI,
  question: string,
  aiResponse: string
): Promise<GapMarkers> {
  const r = await analyzer.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: ANALYSIS_PROMPT },
      { role: "user", content: buildAnalysisUserPrompt(question, aiResponse) },
    ],
  });
  return JSON.parse(r.choices[0]?.message?.content || "{}") as GapMarkers;
}

// --- ChatGPT ---
async function checkChatGPT(
  question: string,
  proxiedFetch?: FetchFn
): Promise<PlatformResult | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });

  const chatResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    temperature: 0.7,
    messages: [{ role: "user", content: question }],
  });

  const aiResponse = chatResponse.choices[0]?.message?.content || "";
  const markers = await analyzeWithOpenAI(openai, question, aiResponse);

  return { platform: "ChatGPT", ai_response: aiResponse, markers };
}

// --- Perplexity ---
async function checkPerplexity(
  question: string,
  proxiedFetch?: FetchFn
): Promise<PlatformResult | null> {
  if (!process.env.PERPLEXITY_API_KEY) return null;

  const client = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });

  const chatResponse = await client.chat.completions.create({
    model: "sonar",
    max_tokens: 500,
    messages: [{ role: "user", content: question }],
  });

  const aiResponse = chatResponse.choices[0]?.message?.content || "";

  // Use OpenAI for analysis (Perplexity doesn't support json_object)
  const analyzer = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });
  const markers = await analyzeWithOpenAI(analyzer, question, aiResponse);

  return { platform: "Perplexity", ai_response: aiResponse, markers };
}

// --- YandexGPT (no proxy needed — works from Russia) ---
async function checkYandexGPT(
  question: string,
  proxiedFetch?: FetchFn
): Promise<PlatformResult | null> {
  if (!process.env.YANDEX_API_KEY || !process.env.YANDEX_FOLDER_ID) return null;

  const folderId = process.env.YANDEX_FOLDER_ID;

  const response = await fetch(
    "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${process.env.YANDEX_API_KEY}`,
        "x-folder-id": folderId,
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt/latest`,
        completionOptions: { maxTokens: 500, temperature: 0.7 },
        messages: [{ role: "user", text: question }],
      }),
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    result: { alternatives: Array<{ message: { text: string } }> };
  };
  const aiResponse = data.result.alternatives[0]?.message?.text || "";

  // Use OpenAI for analysis
  const analyzer = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });
  const markers = await analyzeWithOpenAI(analyzer, question, aiResponse);

  return { platform: "YandexGPT", ai_response: aiResponse, markers };
}

// --- GigaChat ---
async function checkGigaChat(
  question: string,
  proxiedFetch?: FetchFn
): Promise<PlatformResult | null> {
  if (!process.env.GIGACHAT_CLIENT_ID || !process.env.GIGACHAT_CLIENT_SECRET) return null;

  const credentials = Buffer.from(
    `${process.env.GIGACHAT_CLIENT_ID}:${process.env.GIGACHAT_CLIENT_SECRET}`
  ).toString("base64");

  // OAuth2 token
  const authResponse = await fetch(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        RqUID: crypto.randomUUID(),
      },
      body: "scope=GIGACHAT_API_PERS",
    }
  );

  if (!authResponse.ok) return null;
  const authData = (await authResponse.json()) as { access_token: string };

  const chatResponse = await fetch(
    "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify({
        model: "GigaChat",
        max_tokens: 500,
        temperature: 0.7,
        messages: [{ role: "user", content: question }],
      }),
    }
  );

  if (!chatResponse.ok) return null;
  const chatData = (await chatResponse.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const aiResponse = chatData.choices[0]?.message?.content || "";

  const analyzer = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });
  const markers = await analyzeWithOpenAI(analyzer, question, aiResponse);

  return { platform: "GigaChat", ai_response: aiResponse, markers };
}

// ============================================================
// Main handler
// ============================================================

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Слишком много запросов. Подождите минуту." },
      { status: 429 }
    );
  }

  let body: { niche_id?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { niche_id, type = "free" } = body;

  if (!niche_id) {
    return NextResponse.json({ error: "niche_id is required" }, { status: 400 });
  }

  if (type !== "free" && type !== "paid") {
    return NextResponse.json({ error: "type must be 'free' or 'paid'" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: nicheData, error: nicheError } = await supabase
    .from("niches")
    .select("id, name")
    .eq("id", niche_id)
    .single();

  if (nicheError || !nicheData) {
    return NextResponse.json({ error: "Ниша не найдена" }, { status: 404 });
  }

  const nicheName = (nicheData as { id: string; name: string }).name;

  const limit = type === "free" ? 3 : 10;

  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_text, monthly_volume")
    .eq("niche_id", niche_id)
    .order("monthly_volume", { ascending: false })
    .limit(limit);

  if (questionsError) {
    return NextResponse.json({ error: "Ошибка запроса" }, { status: 500 });
  }

  const questions = (questionsData || []) as Array<{
    id: string;
    question_text: string;
    monthly_volume: number;
  }>;

  if (questions.length === 0) {
    return NextResponse.json({ niche: nicheName, type, gaps: [] });
  }

  const proxiedFetch = await createProxiedFetch();

  // Check all available platforms
  const checkers = [checkChatGPT, checkPerplexity, checkYandexGPT, checkGigaChat];

  const gaps = await Promise.all(
    questions.map(async (q) => {
      // Run all platform checks in parallel
      const results = await Promise.all(
        checkers.map(async (checker) => {
          try {
            return await checker(q.question_text, proxiedFetch);
          } catch (err) {
            console.error(`Platform check error for "${q.question_text}":`, err);
            return null;
          }
        })
      );

      const platforms = results.filter(Boolean) as PlatformResult[];

      // Calculate average gap_score across platforms
      const avgGapScore =
        platforms.length > 0
          ? Math.round(
              platforms.reduce((sum, p) => sum + p.markers.gap_score, 0) /
                platforms.length
            )
          : 0;

      return {
        id: q.id,
        question: q.question_text,
        monthly_volume: q.monthly_volume,
        avg_gap_score: avgGapScore,
        platforms: platforms.map((p) => ({
          platform: p.platform,
          ai_response: p.ai_response,
          gap_score: p.markers.gap_score,
          markers: {
            has_expert_name: p.markers.has_expert_name,
            has_specific_examples: p.markers.has_specific_examples,
            has_source_link: p.markers.has_source_link,
            has_specific_numbers: p.markers.has_specific_numbers,
          },
          weakness: p.markers.weakness,
        })),
      };
    })
  );

  gaps.sort((a, b) => b.avg_gap_score - a.avg_gap_score);

  return NextResponse.json({ niche: nicheName, type, gaps });
}
