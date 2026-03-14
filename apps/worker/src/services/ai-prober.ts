// AI Prober — спрашивает AI платформы и оценивает качество ответа

import { createLLMProvider, buildGapAnalysisPrompt, type GapAnalysisResult } from "shared";

export interface AIProbeResult {
  response: string;
  hasExpertName: boolean;
  hasSpecificExamples: boolean;
  hasSourceLink: boolean;
  gapScore: number;
}

type AIPlatform = "chatgpt" | "yandexgpt";

const PLATFORM_TO_PROVIDER: Record<AIPlatform, "openai" | "yandexgpt"> = {
  chatgpt: "openai",
  yandexgpt: "yandexgpt",
};

export async function probeAI(question: string, platform: AIPlatform): Promise<AIProbeResult> {
  const providerType = PLATFORM_TO_PROVIDER[platform];
  const provider = createLLMProvider(providerType);

  // Получаем ответ AI на вопрос
  let response: string;
  try {
    response = await provider.generateText(question, {
      maxTokens: 1024,
      temperature: 0,
    });
  } catch (err) {
    console.error(`[ai-prober] ${platform} failed:`, err instanceof Error ? err.message : err);
    return { response: "", hasExpertName: false, hasSpecificExamples: false, hasSourceLink: false, gapScore: 8 };
  }

  // Программная проверка маркеров
  const hasExpertName = checkExpertName(response);
  const hasSpecificExamples = checkSpecificExamples(response);
  const hasSourceLink = checkSourceLink(response);

  // LLM-оценка gap_score
  let gapScore = calculateBaseGapScore(hasExpertName, hasSpecificExamples, hasSourceLink);

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

  return { response, hasExpertName, hasSpecificExamples, hasSourceLink, gapScore };
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

function calculateBaseGapScore(hasName: boolean, hasExamples: boolean, hasLink: boolean): number {
  let falseCount = 0;
  if (!hasName) falseCount++;
  if (!hasExamples) falseCount++;
  if (!hasLink) falseCount++;
  // 4th marker (specific numbers) — assume false for base calc
  falseCount++;
  return Math.round((falseCount / 4) * 10);
}
