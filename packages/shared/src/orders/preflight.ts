/**
 * Pre-flight «данные раньше денег» (контракт Audit Start v1, §6; вертикали v1, §2).
 *
 * Платёж НЕ создаётся, если замер заведомо невыполним: платформ меньше порога
 * или по паре «ниша × город» нет собранных вопросов. Функция чистая — все
 * сигналы передаются снаружи, чтобы её можно было тестировать без БД и сети.
 *
 * ЗАЯВЛЕННАЯ ГРАНИЦА: `countConfiguredPlatforms` считает платформы, у которых
 * настроены ключи (то же множество, что собирает /api/audit), а не живость в
 * момент запроса. Живой ping провайдеров и порог по фактическим ответам —
 * G-019 (исполнение отчёта, degraded mode §4). Здесь это отсекает заведомо
 * пустую конфигурацию, не обещая больше.
 */

export const PREFLIGHT_MIN_PLATFORMS = 2;
export const PREFLIGHT_MIN_QUESTIONS = 1;

export type PreflightDecision =
  | { allow: true }
  | { allow: false; reason: "platforms" | "questions"; message: string };

export interface PreflightSignals {
  configuredPlatforms: number;
  questionCount: number;
}

export function decidePreflight(signals: PreflightSignals): PreflightDecision {
  if (!(signals.configuredPlatforms >= PREFLIGHT_MIN_PLATFORMS)) {
    return {
      allow: false,
      reason: "platforms",
      message: "Сервис временно недоступен: недостаточно AI-платформ для замера. Оплата не открыта.",
    };
  }
  if (!(signals.questionCount >= PREFLIGHT_MIN_QUESTIONS)) {
    return {
      allow: false,
      reason: "questions",
      message: "Готовим замер по вашей нише и городу — оставьте email, пришлём письмо, когда данные будут собраны. Оплата пока не открыта.",
    };
  }
  return { allow: true };
}

/** Платформы, доступные /api/audit при данной конфигурации окружения. */
export function countConfiguredPlatforms(env: Record<string, string | undefined>): number {
  let n = 0;
  if (env.OPENAI_API_KEY) n += 1; // ChatGPT
  if (env.PERPLEXITY_API_KEY) n += 1;
  if (env.YANDEX_API_KEY && env.YANDEX_FOLDER_ID) n += 1; // YandexGPT
  if (env.GIGACHAT_CLIENT_ID && env.GIGACHAT_CLIENT_SECRET) n += 1;
  return n;
}
