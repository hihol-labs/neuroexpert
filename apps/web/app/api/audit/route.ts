import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Rate limiter: 2 requests per minute per IP
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 2;

  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) return true;

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

// ============================================================
// Types
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

interface AuditGap {
  id: string;
  question: string;
  search_intent: string;
  avg_gap_score: number;
  estimated_monthly_volume: number;
  platforms: Array<{
    platform: string;
    ai_response: string;
    gap_score: number;
    markers: Omit<GapMarkers, "gap_score" | "weakness">;
    weakness: string;
  }>;
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

// ============================================================
// Step 1: Load real demand questions collected from Wordstat
// ============================================================

interface GeneratedQuestion {
  question: string;
  search_intent: string;
  monthly_volume?: number;
}

// ============================================================
// Step 2: Check AI platforms
// ============================================================

const ANALYSIS_PROMPT = `Ты анализируешь ответ AI на вопрос пользователя. Проверяешь объективные структурные маркеры — не оцениваешь качество, а проверяешь факты. Ответь строго JSON.`;

function buildAnalysisUserPrompt(question: string, aiResponse: string): string {
  return `ВОПРОС: ${question}

ОТВЕТ AI:
${aiResponse}

Проверь маркеры:
1. has_expert_name — ссылается ли на конкретного эксперта по имени? (true/false)
2. has_specific_examples — есть ли конкретные примеры из практики с деталями/кейсами? (true/false)
3. has_source_link — есть ли URL-ссылка на источник? (true/false)
4. has_specific_numbers — есть ли конкретные цифры, сроки, дозировки, проценты? (true/false)

Рассчитай gap_score от 0 до 10:
- Каждый false = +2.5 балла
- gap_score = количество false × 2.5, округли до целого
- Минимум 0 (все true), максимум 10 (все false)

Напиши weakness — 1 предложение о главной слабости ответа на русском.

JSON: {"has_expert_name":bool,"has_specific_examples":bool,"has_source_link":bool,"has_specific_numbers":bool,"gap_score":number,"weakness":"..."}`;
}

async function analyzeWithOpenAI(
  analyzer: OpenAI,
  question: string,
  aiResponse: string,
): Promise<GapMarkers> {
  const r = await analyzer.chat.completions.create({
    model: process.env.OPENAI_MODEL_BULK || "gpt-4o-mini",
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

function analyzeResponseHeuristically(aiResponse: string): GapMarkers {
  const hasExpertName =
    /\b[А-ЯЁ][а-яё]+ [А-ЯЁ][а-яё]+\b/.test(aiResponse) ||
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(aiResponse);
  const hasSpecificExamples =
    /например|кейс|случай|практик|пример/i.test(aiResponse);
  const hasSourceLink = /https?:\/\/|www\./i.test(aiResponse);
  const hasSpecificNumbers = /\d/.test(aiResponse);
  const falseCount = [
    hasExpertName,
    hasSpecificExamples,
    hasSourceLink,
    hasSpecificNumbers,
  ].filter((value) => !value).length;

  return {
    has_expert_name: hasExpertName,
    has_specific_examples: hasSpecificExamples,
    has_source_link: hasSourceLink,
    has_specific_numbers: hasSpecificNumbers,
    gap_score: Math.round(falseCount * 2.5),
    weakness:
      falseCount > 0
        ? "В ответе не хватает конкретных экспертных доказательств: имен, кейсов, источников или проверяемых чисел."
        : "Ответ содержит базовые структурные маркеры, но требует экспертной проверки качества.",
  };
}

async function analyzeResponse(
  question: string,
  aiResponse: string,
  proxiedFetch?: FetchFn,
): Promise<GapMarkers> {
  if (!process.env.OPENAI_API_KEY) {
    return analyzeResponseHeuristically(aiResponse);
  }

  const analyzer = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });

  try {
    return await analyzeWithOpenAI(analyzer, question, aiResponse);
  } catch (err) {
    console.error("[audit] OpenAI analyzer failed; using heuristic markers:", err);
    return analyzeResponseHeuristically(aiResponse);
  }
}

// --- ChatGPT ---
async function checkChatGPT(
  question: string,
  proxiedFetch?: FetchFn,
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
  const markers = await analyzeResponse(question, aiResponse, proxiedFetch);

  return { platform: "ChatGPT", ai_response: aiResponse, markers };
}

// --- Perplexity ---
async function checkPerplexity(
  question: string,
  proxiedFetch?: FetchFn,
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
  const markers = await analyzeResponse(question, aiResponse, proxiedFetch);

  return { platform: "Perplexity", ai_response: aiResponse, markers };
}

// --- YandexGPT ---
async function checkYandexGPT(
  question: string,
  proxiedFetch?: FetchFn,
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
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    result: { alternatives: Array<{ message: { text: string } }> };
  };
  const aiResponse = data.result.alternatives[0]?.message?.text || "";
  const markers = await analyzeResponse(question, aiResponse, proxiedFetch);

  return { platform: "Яндекс.GPT", ai_response: aiResponse, markers };
}

// --- GigaChat ---
// OAuth token is fetched ONCE per audit request (valid ~30 min) and shared
// across all per-question chat calls. Sber free tier rate-limits concurrent
// OAuth requests from the same client_id, which silently drops 2/3 of
// parallel calls — pre-fetching avoids that.
async function getGigaChatToken(): Promise<string | null> {
  if (!process.env.GIGACHAT_CLIENT_ID || !process.env.GIGACHAT_CLIENT_SECRET)
    return null;

  const credentials = Buffer.from(
    `${process.env.GIGACHAT_CLIENT_ID}:${process.env.GIGACHAT_CLIENT_SECRET}`,
  ).toString("base64");

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
    },
  );

  if (!authResponse.ok) {
    const body = await authResponse.text().catch(() => "");
    console.error(
      `[audit] GigaChat OAuth ${authResponse.status}:`,
      body.slice(0, 300),
    );
    return null;
  }
  const authData = (await authResponse.json()) as { access_token: string };
  return authData.access_token;
}

async function checkGigaChat(
  question: string,
  accessToken: string | null,
  proxiedFetch?: FetchFn,
): Promise<PlatformResult | null> {
  if (!accessToken) return null;

  const chatResponse = await fetch(
    "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: "GigaChat",
        max_tokens: 500,
        temperature: 0.7,
        messages: [{ role: "user", content: question }],
      }),
    },
  );

  if (!chatResponse.ok) {
    const body = await chatResponse.text().catch(() => "");
    console.error(
      `[audit] GigaChat chat ${chatResponse.status} for "${question.slice(0, 60)}":`,
      body.slice(0, 300),
    );
    return null;
  }
  const chatData = (await chatResponse.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const aiResponse = chatData.choices[0]?.message?.content || "";
  const markers = await analyzeResponse(question, aiResponse, proxiedFetch);

  return { platform: "GigaChat", ai_response: aiResponse, markers };
}

const ESTIMATED_VOLUME: Record<string, number> = {
  transactional: 3000,
  commercial: 5000,
  informational: 8000,
};

function getEstimatedVolume(question: GeneratedQuestion): number {
  return question.monthly_volume ?? ESTIMATED_VOLUME[question.search_intent] ?? 5000;
}

function inferSearchIntent(question: string): string {
  const text = question.toLowerCase();
  if (/сколько стоит|цена|стоимость|купить|заказать|записаться/.test(text)) {
    return "transactional";
  }
  if (/как выбрать|какой|лучший|рейтинг|сравнить|отзывы/.test(text)) {
    return "commercial";
  }
  return "informational";
}

function isUsefulAuditQuestion(question: string): boolean {
  return question.trim().split(/\s+/).filter(Boolean).length >= 4;
}

async function fetchWordstatQuestions(
  nicheId: string,
  count: number,
): Promise<GeneratedQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select("question_text, monthly_volume")
    .eq("niche_id", nicheId)
    .eq("source", "wordstat")
    .eq("is_active", true)
    .order("monthly_volume", { ascending: false })
    .limit(count * 25);

  if (error) {
    throw new Error(`Failed to load Wordstat questions: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as Array<{
    question_text: string | null;
    monthly_volume: number | null;
  }>;

  return rows
    .filter(
      (row) =>
        row.question_text && isUsefulAuditQuestion(row.question_text),
    )
    .map((row) => ({
      question: row.question_text as string,
      search_intent: inferSearchIntent(row.question_text as string),
      monthly_volume: (row.monthly_volume as number | null) ?? undefined,
    }))
    .slice(0, count);
}

function toAuditGap(
  q: GeneratedQuestion,
  idx: number,
  platforms: PlatformResult[],
  idPrefix: string,
): AuditGap {
  const avgGapScore =
    platforms.length > 0
      ? Math.round(
          platforms.reduce((sum, p) => sum + p.markers.gap_score, 0) /
            platforms.length,
        )
      : 0;

  return {
    id: `${idPrefix}-${idx}`,
    question: q.question,
    search_intent: q.search_intent,
    avg_gap_score: avgGapScore,
    estimated_monthly_volume: getEstimatedVolume(q),
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
}

function sortGaps(gaps: AuditGap[]): AuditGap[] {
  return gaps.sort(
    (a, b) =>
      b.estimated_monthly_volume - a.estimated_monthly_volume ||
      b.avg_gap_score - a.avg_gap_score,
  );
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
      { status: 429 },
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
  // Ниша — из канонической таблицы niches, а не из статичной карты (G-018,
  // спецификация вертикалей v1: множество пар открытое, хардкод разъезжается).
  const { data: nicheData } = await createAdminClient()
    .from("niches")
    .select("name, is_active")
    .eq("id", niche_id)
    .maybeSingle();
  // Сгенерированные типы Database не знают is_active у niches — явная форма.
  const nicheRow = nicheData as { name: string; is_active: boolean } | null;
  if (!nicheRow || !nicheRow.is_active) {
    return NextResponse.json({ error: "Ниша не найдена" }, { status: 404 });
  }

  const nicheName = nicheRow.name;
  const questionCount = type === "free" ? 3 : 10;

  const proxiedFetch = await createProxiedFetch();

  let questions: GeneratedQuestion[] = [];
  try {
    questions = await fetchWordstatQuestions(niche_id, questionCount);
  } catch (err) {
    console.error("[audit] Failed to load Wordstat questions:", err);
    return NextResponse.json(
      { error: "Не удалось загрузить вопросы из Wordstat" },
      { status: 500 },
    );
  }

  if (questions.length === 0) {
    return NextResponse.json(
      {
        error:
          "Для этой ниши пока нет Wordstat-вопросов. Сначала запустите сбор спроса collect_demand.",
      },
      { status: 503 },
    );
  }

  // Step 2: For each question, check AI platforms in real-time.
  // GigaChat OAuth is pre-fetched once and shared across all questions
  // (Sber free tier drops concurrent OAuth calls from the same client_id).
  const gigaChatToken = await getGigaChatToken();

  const checkers: Array<
    (q: string, pf?: FetchFn) => Promise<PlatformResult | null>
  > = [checkChatGPT, checkPerplexity, checkYandexGPT];

  // GigaChat chat endpoint also rate-limits on GIGACHAT_API_PERS free tier
  // (HTTP 429 on concurrent chat calls). Run them sequentially with a short
  // pacing delay so all N questions get a GigaChat answer.
  const gigaChatResults: Array<PlatformResult | null> = [];
  if (gigaChatToken) {
    for (let i = 0; i < questions.length; i += 1) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1100));
      try {
        gigaChatResults.push(
          await checkGigaChat(questions[i].question, gigaChatToken, proxiedFetch),
        );
      } catch (err) {
        console.error(
          `[audit] GigaChat check error for "${questions[i].question}":`,
          err,
        );
        gigaChatResults.push(null);
      }
    }
  } else {
    for (let i = 0; i < questions.length; i += 1) gigaChatResults.push(null);
  }

  const gaps = await Promise.all(
    questions.map(async (q, idx) => {
      const parallelResults = await Promise.all(
        checkers.map(async (checker) => {
          try {
            return await checker(q.question, proxiedFetch);
          } catch (err) {
            console.error(
              `[audit] Platform check error for "${q.question}":`,
              err,
            );
            return null;
          }
        }),
      );

      const platforms = [...parallelResults, gigaChatResults[idx]].filter(
        Boolean,
      ) as PlatformResult[];

      return toAuditGap(
        q,
        idx,
        platforms,
        "wordstat",
      );
    }),
  );

  if (gaps.every((gap) => gap.platforms.length === 0)) {
    return NextResponse.json(
      {
        error:
          "AI-платформы временно недоступны. Проверьте ключи ChatGPT, Яндекс.GPT или GigaChat.",
      },
      { status: 503 },
    );
  }

  // Сортируем по объёму запросов (убывание): самые популярные вопросы первыми.
  // При равном volume tiebreak по gap_score (сильнее разрыв — выше).
  sortGaps(gaps);

  return NextResponse.json({
    niche: nicheName,
    type,
    source: "wordstat",
    gaps,
  });
}
