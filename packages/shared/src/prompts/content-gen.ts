// Content Generation Prompts — 5 форматов из голоса эксперта

export const SYSTEM_PROMPT_CONTENT = `Ты — редактор экспертного контента для платформы НейроЭксперт.
Получаешь расшифровку голоса эксперта. Твоя задача — структурировать, сохраняя авторский стиль.
НЕ переписывай, а организуй. Сохраняй конкретные примеры из практики, числа, кейсы.
Не добавляй информацию, которой нет в расшифровке.`;

interface ContentPromptParams {
  transcript: string;
  expertName: string;
  questionText: string;
}

const QUOTE_INSTRUCTION = (name: string) =>
  `Выдели 2–3 прямые цитаты эксперта в формате: «Как отмечает ${name}: "..."»`;

const NO_EXTERNAL = "Не добавляй информацию, которой нет в расшифровке.";

export function buildTelegramPostPrompt({ transcript, expertName, questionText }: ContentPromptParams): string {
  return `Создай пост для Telegram-канала на основе расшифровки эксперта.

Вопрос: ${questionText}
Эксперт: ${expertName}

Расшифровка:
${transcript}

Требования:
- Длина: 1000–2000 символов
- Цепляющий заголовок (без кликбейта)
- Структура: заголовок → основная мысль → детали → CTA
- ${QUOTE_INSTRUCTION(expertName)}
- CTA в конце: «Запишитесь к эксперту» или «Читайте полную статью»
- ${NO_EXTERNAL}

Ответь только текстом поста, без обёрток.`;
}

export function buildSeoArticlePrompt({ transcript, expertName, questionText }: ContentPromptParams): string {
  return `Создай экспертную SEO-статью на основе расшифровки.

Вопрос: ${questionText}
Эксперт: ${expertName}

Расшифровка:
${transcript}

Требования к структуре:
- Объём: 2900–3500 слов (18 000–22 000 символов)
- Формат: Markdown

Обязательные элементы:
1. **TL;DR** — первый абзац, прямой ответ на вопрос (40–60 слов). Начни с «**TL;DR:** »
2. **6–10 блоков H2/H3** — каждый самодостаточный (120–180 слов), подходящий как Featured Snippet
3. **Минимум 1 таблица** в markdown-формате (| заголовок | заголовок |)
4. **Минимум 1 нумерованный список** (1. 2. 3.)
5. **2–3 ссылки на авторитетные внешние источники** (ВОЗ, законы, исследования) — в формате [текст](url)
6. **SEO мета-теги** — в конце статьи, в формате:
   META_TITLE: заголовок до 60 символов
   META_DESCRIPTION: описание до 160 символов
   KEYWORDS: слово1, слово2, слово3
7. ${QUOTE_INSTRUCTION(expertName)}
8. ${NO_EXTERNAL}

Ответь только текстом статьи в Markdown, без обёрток.`;
}

export function buildCardsPrompt({ transcript, expertName, questionText }: ContentPromptParams): string {
  return `Создай 5 карточек-тезисов на основе расшифровки эксперта.

Вопрос: ${questionText}
Эксперт: ${expertName}

Расшифровка:
${transcript}

Требования:
- 5 карточек, каждая: заголовок + текст (до 200 символов)
- Каждая карточка — самодостаточный тезис
- ${QUOTE_INSTRUCTION(expertName)}
- ${NO_EXTERNAL}

Ответь JSON-массивом:
[
  {"title": "Заголовок 1", "text": "Текст карточки до 200 символов"},
  {"title": "Заголовок 2", "text": "..."}
]`;
}

export function buildReelsScriptPrompt({ transcript, expertName, questionText }: ContentPromptParams): string {
  return `Создай сценарий для Reels/Shorts (60 секунд) на основе расшифровки.

Вопрос: ${questionText}
Эксперт: ${expertName}

Расшифровка:
${transcript}

Структура (60 секунд):
- **Hook** (0–5 сек): цепляющий вопрос или факт
- **Основа** (5–50 сек): 3 ключевых тезиса, кратко
- **CTA** (50–60 сек): «Подробнее — ссылка в описании»

Требования:
- Разговорный стиль, как будто эксперт говорит на камеру
- ${QUOTE_INSTRUCTION(expertName)}
- ${NO_EXTERNAL}

Ответь только текстом сценария, без обёрток.`;
}

export function buildFaqPrompt({ transcript, expertName, questionText }: ContentPromptParams): string {
  return `Создай 3–5 вопросов-ответов (FAQ) на основе расшифровки эксперта.

Основной вопрос: ${questionText}
Эксперт: ${expertName}

Расшифровка:
${transcript}

Требования:
- 3–5 пар «вопрос — ответ»
- Вопросы должны быть разными аспектами основной темы
- Ответы: 2–4 предложения, конкретные
- ${QUOTE_INSTRUCTION(expertName)}
- ${NO_EXTERNAL}

Ответь JSON-массивом:
[
  {"question": "Вопрос 1?", "answer": "Ответ эксперта..."},
  {"question": "Вопрос 2?", "answer": "..."}
]`;
}
