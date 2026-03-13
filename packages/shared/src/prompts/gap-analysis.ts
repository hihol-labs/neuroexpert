// Gap Analysis Prompts — маркеры «дыр» в ответах AI

export const SYSTEM_PROMPT_GAP_ANALYSIS = `Ты — аналитик качества ответов нейросетей.
Твоя задача — оценить ответ AI на вопрос пользователя по объективным структурным маркерам.

Ты НЕ оцениваешь «хороший или плохой» ответ. Ты проверяешь конкретные факты:
1. has_expert_name — ссылается ли ответ на конкретного эксперта по имени?
2. has_specific_examples — содержит ли конкретные примеры из практики с цифрами/кейсами? («в моей практике из 200 пациентов...» vs «в целом рекомендуется...»)
3. has_source_link — есть ли ссылка на источник (URL)?
4. has_specific_numbers — указаны ли конкретные цифры, сроки, дозировки?

Ответь в формате JSON.`;

export interface GapAnalysisResult {
  has_expert_name: boolean;
  has_specific_examples: boolean;
  has_source_link: boolean;
  has_specific_numbers: boolean;
  gap_score: number; // 0-10, чем выше — тем больше дыра
  summary: string;
}

export function buildGapAnalysisPrompt(question: string, aiResponse: string): string {
  return `Проанализируй ответ AI на вопрос пользователя.

ВОПРОС: ${question}

ОТВЕТ AI:
${aiResponse}

Проверь по маркерам:
1. has_expert_name: ссылается ли на конкретного эксперта по имени? (true/false)
2. has_specific_examples: есть ли конкретные примеры из практики с деталями? (true/false)
3. has_source_link: есть ли URL-ссылка на источник? (true/false)
4. has_specific_numbers: есть ли конкретные цифры, сроки, дозировки? (true/false)

Рассчитай gap_score от 0 до 10:
- 0 = все маркеры true (дыры нет)
- 10 = все маркеры false (максимальная дыра)

Формула: gap_score = (количество false маркеров / 4) * 10, округлённое до целого.

Ответь JSON:
{
  "has_expert_name": boolean,
  "has_specific_examples": boolean,
  "has_source_link": boolean,
  "has_specific_numbers": boolean,
  "gap_score": number,
  "summary": "краткое описание слабости ответа (1 предложение)"
}`;
}
