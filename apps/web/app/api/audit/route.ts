import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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
// Step 1: Generate real questions for a niche via LLM
// ============================================================

interface GeneratedQuestion {
  question: string;
  search_intent: string;
}

async function generateQuestions(
  openai: OpenAI,
  nicheName: string,
  count: number,
): Promise<GeneratedQuestion[]> {
  const r = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_BULK || "gpt-4o-mini",
    max_tokens: 800,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Ты — SEO-аналитик. Генерируй реальные поисковые запросы, которые люди задают в Яндексе и Google по теме "${nicheName}". Выбирай вопросы с высоким коммерческим или информационным интентом, на которые нейросети дают слабые ответы (без имён экспертов, без конкретики). Ответь JSON.`,
      },
      {
        role: "user",
        content: `Сгенерируй ${count} самых популярных и коммерчески важных вопросов для ниши "${nicheName}".

Требования:
- Вопросы должны быть на русском языке
- Каждый вопрос — реальный поисковый запрос (как люди пишут в поиске)
- Выбирай вопросы, на которые ИИ обычно даёт поверхностные ответы без экспертизы
- search_intent: "informational" | "commercial" | "transactional"

JSON: {"questions": [{"question": "...", "search_intent": "..."}]}`,
      },
    ],
  });

  const parsed = JSON.parse(r.choices[0]?.message?.content || '{"questions":[]}') as {
    questions: GeneratedQuestion[];
  };
  return parsed.questions.slice(0, count);
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
  const markers = await analyzeWithOpenAI(openai, question, aiResponse);

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

  const analyzer = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });
  const markers = await analyzeWithOpenAI(analyzer, question, aiResponse);

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
  proxiedFetch?: FetchFn,
): Promise<PlatformResult | null> {
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
    },
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
// Niche list (static — matches seed niches)
// ============================================================

const NICHE_NAMES: Record<string, string> = {
  "a0000000-0000-0000-0000-000000000001": "Психология и психотерапия",
  "a0000000-0000-0000-0000-000000000002": "Юриспруденция",
  "a0000000-0000-0000-0000-000000000003": "Нутрициология",
  "a0000000-0000-0000-0000-000000000004": "Финансы и инвестиции",
  "a0000000-0000-0000-0000-000000000005": "Бизнес-консалтинг",
  "a0000000-0000-0000-0000-000000000006": "Медицина и здоровье",
  "a0000000-0000-0000-0000-000000000007": "Фитнес и спорт",
  "a0000000-0000-0000-0000-000000000008": "Образование и репетиторство",
  "a0000000-0000-0000-0000-000000000009": "Маркетинг и SMM",
  "a0000000-0000-0000-0000-000000000010": "IT и программирование",
  "a0000000-0000-0000-0000-000000000011": "Дизайн и архитектура",
  "a0000000-0000-0000-0000-000000000012": "Недвижимость",
  "a0000000-0000-0000-0000-000000000013": "Карьера и HR",
  "a0000000-0000-0000-0000-000000000014": "Косметология и эстетика",
  "a0000000-0000-0000-0000-000000000015": "Логопедия и дефектология",
  "a0000000-0000-0000-0000-000000000016": "Коучинг и саморазвитие",
  "a0000000-0000-0000-0000-000000000017": "Бухгалтерия и аудит",
  "a0000000-0000-0000-0000-000000000018": "Ветеринария",
  "a0000000-0000-0000-0000-000000000019": "Страхование",
  "a0000000-0000-0000-0000-000000000020": "Туризм и путешествия",
};

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
  if (!NICHE_NAMES[niche_id]) {
    return NextResponse.json({ error: "Ниша не найдена" }, { status: 404 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI-сервис временно недоступен" },
      { status: 503 },
    );
  }

  const nicheName = NICHE_NAMES[niche_id];
  const questionCount = type === "free" ? 3 : 10;

  const proxiedFetch = await createProxiedFetch();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(proxiedFetch && { fetch: proxiedFetch }),
  });

  // Step 1: Generate real questions dynamically
  let questions: GeneratedQuestion[];
  try {
    questions = await generateQuestions(openai, nicheName, questionCount);
  } catch (err) {
    console.error("[audit] Failed to generate questions:", err);
    return NextResponse.json(
      { error: "Не удалось сгенерировать вопросы" },
      { status: 500 },
    );
  }

  if (questions.length === 0) {
    return NextResponse.json({ niche: nicheName, type, gaps: [] });
  }

  // Step 2: For each question, check AI platforms in real-time
  const checkers: Array<
    (q: string, pf?: FetchFn) => Promise<PlatformResult | null>
  > = [checkChatGPT, checkPerplexity, checkYandexGPT, checkGigaChat];

  const gaps = await Promise.all(
    questions.map(async (q, idx) => {
      const results = await Promise.all(
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

      const platforms = results.filter(Boolean) as PlatformResult[];

      const avgGapScore =
        platforms.length > 0
          ? Math.round(
              platforms.reduce((sum, p) => sum + p.markers.gap_score, 0) /
                platforms.length,
            )
          : 0;

      // Estimated monthly volume based on search intent
      const estimatedVolume: Record<string, number> = {
        transactional: 3000,
        commercial: 5000,
        informational: 8000,
      };

      return {
        id: `gen-${idx}`,
        question: q.question,
        search_intent: q.search_intent,
        avg_gap_score: avgGapScore,
        estimated_monthly_volume: estimatedVolume[q.search_intent] ?? 5000,
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
    }),
  );

  gaps.sort((a, b) => b.avg_gap_score - a.avg_gap_score);

  return NextResponse.json({ niche: nicheName, type, gaps });
}
