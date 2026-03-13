// Filter Prompts — фильтрация и приоритизация вопросов

export const SYSTEM_PROMPT_FILTER = `Ты — аналитик спроса. Твоя задача — из списка вопросов выбрать те,
которые наиболее перспективны для экспертного контента.

Критерии отбора:
1. Вопрос подразумевает экспертный ответ (не гугл-факт)
2. Ответ нейросети на этот вопрос предположительно слабый (общие фразы, нет конкретики)
3. Эксперт-практик может дать значительно лучший ответ
4. Вопрос достаточно конкретный (не «что такое X?», а «как решить Y при условии Z?»)

Ответь в формате JSON.`;

export interface FilteredQuestion {
  index: number;
  question: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

export function buildFilterPrompt(questions: string[]): string {
  const numbered = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");

  return `Оцени каждый вопрос по перспективности для экспертного контента.

ВОПРОСЫ:
${numbered}

Для каждого вопроса определи:
- priority: "high" | "medium" | "low"
- reason: почему такой приоритет (1 предложение)

Ответь JSON-массивом:
[
  {
    "index": 1,
    "question": "текст вопроса",
    "priority": "high",
    "reason": "почему"
  }
]`;
}
