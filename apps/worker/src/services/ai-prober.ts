// AI Prober — спрашивает AI платформы и оценивает качество ответа

import { createLLMProvider, buildGapAnalysisPrompt, type GapAnalysisResult } from "shared";

export interface AIProbeResult {
  response: string;
  hasExpertName: boolean;
  hasSpecificExamples: boolean;
  hasSourceLink: boolean;
  hasSpecificNumbers: boolean;
  gapScore: number;
}

type AIPlatform = "chatgpt" | "yandexgpt" | "gigachat" | "perplexity";

const PLATFORM_TO_PROVIDER: Record<AIPlatform, "openai" | "yandexgpt" | "gigachat"> = {
  chatgpt: "openai",
  yandexgpt: "yandexgpt",
  gigachat: "gigachat",
  perplexity: "openai", // Perplexity uses OpenAI-compatible API
};

export async function probeAI(question: string, platform: AIPlatform): Promise<AIProbeResult> {
  let response: string;

  try {
    if (platform === "perplexity") {
      response = await queryPerplexity(question);
    } else {
      const providerType = PLATFORM_TO_PROVIDER[platform];
      const provider = createLLMProvider(providerType);
      response = await provider.generateText(question, {
        maxTokens: 1024,
        temperature: 0,
      });
    }
  } catch (err) {
    console.error(`[ai-prober] ${platform} failed:`, err instanceof Error ? err.message : err);
    return { response: "", hasExpertName: false, hasSpecificExamples: false, hasSourceLink: false, hasSpecificNumbers: false, gapScore: 8 };
  }

  // Программная проверка 4 маркеров
  const hasExpertName = checkExpertName(response);
  const hasSpecificExamples = checkSpecificExamples(response);
  const hasSourceLink = checkSourceLink(response);
  const hasSpecificNumbers = checkSpecificNumbers(response);

  // LLM-оценка gap_score
  let gapScore = calculateBaseGapScore(hasExpertName, hasSpecificExamples, hasSourceLink, hasSpecificNumbers);

  try {
    const analysisProvider = createLLMProvider("openai");
    const gapResult = await analysisProvider.generateJSON<GapAnalysisResult>(
      buildGapAnalysisPrompt(question, response),
      { maxTokens: 512, temperature: 0 },
    );
    gapScore = gapResult.gap_score;
  } catch {
    // Используем программную оценку
  }

  return { response, hasExpertName, hasSpecificExamples, hasSourceLink, hasSpecificNumbers, gapScore };
}

function checkExpertName(text: string): boolean {
  // Ищем паттерны: "Dr. X", "профессор Y", "по мнению Z", имена с отчествами
  const patterns = [
    /(?:доктор|профессор|кандидат|академик|д\.м\.н|к\.м\.н)\s+[А-ЯЁ][а-яё]+/,
    /[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+ич|овна|евна/, // ФИО
    /по мнению\s+[А-ЯЁ]/,
    /как отмечает\s+[А-ЯЁ]/,
    /Dr\.\s+[A-Z]/i,
    /Professor\s+[A-Z]/i,
  ];
  return patterns.some((p) => p.test(text));
}

function checkSpecificExamples(text: string): boolean {
  const patterns = [
    /в моей практике/i,
    /из \d+ (пациентов|клиентов|случаев)/i,
    /конкретный (пример|случай|кейс)/i,
    /например,\s+.{20,}/,
    /\d+%\s+(пациентов|клиентов|случаев)/,
    /в \d{4}\s+году/,
  ];
  return patterns.some((p) => p.test(text));
}

function checkSourceLink(text: string): boolean {
  return /https?:\/\/[^\s)]+/.test(text);
}

function checkSpecificNumbers(text: string): boolean {
  const patterns = [
    /\d+\s*(мг|мл|г|кг|мм|см|м|л|ккал|ед|таб|капс)/i,  // дозировки: 200 мг, 5 мл
    /\d+[\s-]*(дней|недел|месяц|лет|час|минут|сут)/i,     // сроки: 14 дней, 3 месяца
    /\d{1,3}([.,]\d+)?%/,                                   // проценты: 85%, 12.5%
    /от\s+\d+\s+до\s+\d+/,                                  // диапазоны: от 5 до 10
    /\d{4,}\s*(руб|₽|\$|€|тыс)/i,                          // суммы: 5000 руб
    /\d+\s*(раз|курс|сеанс|приём|визит)/i,                 // частота: 3 раза, 10 сеансов
    /через\s+\d+\s*(дней|недел|месяц|час)/i,               // интервалы: через 2 недели
    /\d+\s*°[CС]/,                                          // температура: 37°C
  ];
  return patterns.some((p) => p.test(text));
}

async function queryPerplexity(question: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY not set");
  }

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [{ role: "user", content: question }],
      max_tokens: 1024,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Perplexity API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function calculateBaseGapScore(hasName: boolean, hasExamples: boolean, hasLink: boolean, hasNumbers: boolean): number {
  let falseCount = 0;
  if (!hasName) falseCount++;
  if (!hasExamples) falseCount++;
  if (!hasLink) falseCount++;
  if (!hasNumbers) falseCount++;
  return Math.round((falseCount / 4) * 10);
}
