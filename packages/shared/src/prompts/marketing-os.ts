export type VoiceProfile = {
  lexical_markers: string[];
  syntax_markers: string[];
  signature_phrases: string[];
  taboo_words: string[];
  evidence_style: string;
  editing_rules: string[];
};

export function buildVoiceProfilePrompt(params: {
  transcript: string;
  existingProfile?: VoiceProfile | null;
}): string {
  const existing = params.existingProfile
    ? `\nТекущий профиль голоса:\n${JSON.stringify(params.existingProfile, null, 2)}\n`
    : "";

  return `Извлеки voice profile эксперта из расшифровки.

${existing}
Новая расшифровка:
${params.transcript.slice(0, 6000)}

Задача:
- Не придумывай стиль, которого нет в тексте.
- Сохрани только устойчивые признаки речи.
- Если текущий профиль уже есть, аккуратно дополни его новой фактурой.
- Не сохраняй персональные данные, диагнозы клиентов или чувствительные подробности.

Ответь JSON:
{
  "lexical_markers": ["какие слова и формулировки эксперт реально использует"],
  "syntax_markers": ["длина фраз, ритм, типичные конструкции"],
  "signature_phrases": ["фирменные обороты без персональных данных"],
  "taboo_words": ["слова, которые не стоит использовать в его контенте"],
  "evidence_style": "как эксперт обычно доказывает мысль: кейсы, цифры, осторожные оговорки",
  "editing_rules": ["как редактировать текст, чтобы сохранить голос"]
}`;
}

export function formatVoiceProfileForPrompt(profile?: VoiceProfile | null): string {
  if (!profile) return "";
  const lines = [
    profile.lexical_markers?.length ? `Лексика: ${profile.lexical_markers.join(", ")}` : "",
    profile.syntax_markers?.length ? `Синтаксис: ${profile.syntax_markers.join(", ")}` : "",
    profile.signature_phrases?.length ? `Обороты: ${profile.signature_phrases.join(", ")}` : "",
    profile.taboo_words?.length ? `Не использовать: ${profile.taboo_words.join(", ")}` : "",
    profile.evidence_style ? `Доказательность: ${profile.evidence_style}` : "",
    profile.editing_rules?.length ? `Правила редактуры: ${profile.editing_rules.join("; ")}` : "",
  ].filter(Boolean);

  return lines.length
    ? `\nПрофиль голоса эксперта:\n${lines.join("\n")}\nСохраняй эти признаки, но не имитируй дословно и не добавляй факты вне расшифровки.\n`
    : "";
}

export function buildAeoPromptClusterPrompt(params: {
  brandOrExpert: string;
  category: string;
  audience: string;
  region?: string;
}): string {
  return `Собери AEO / AI SEO кластеры запросов.

Бренд или эксперт: ${params.brandOrExpert}
Категория: ${params.category}
Аудитория: ${params.audience}
Регион: ${params.region ?? "не указан"}

Верни 30-50 запросов в 4 типах:
- informational: что это, как работает, симптомы, признаки, инструкция
- comparative: X vs Y, сравнение подходов, кому подходит
- recommendation: лучший специалист/компания/решение для ситуации
- transactional: цена, запись, консультация, где купить, где сделать

Для каждого запроса укажи боль пользователя, желательный ответ бренда/эксперта и следующий CTA.

Ответь JSON:
[
  {
    "cluster": "informational|comparative|recommendation|transactional",
    "query": "запрос",
    "user_pain": "какая боль стоит за запросом",
    "desired_answer": "какой ответ должен быть представлен на сайте",
    "next_cta": "какое действие предложить"
  }
]`;
}

export function buildCompetitorProfilingPrompt(params: {
  ownOffer: string;
  competitors: string[];
  focus?: string[];
}): string {
  return `Сделай структурный competitor profiling.

Наш оффер:
${params.ownOffer}

Конкуренты:
${params.competitors.map((item) => `- ${item}`).join("\n")}

Фокус анализа:
${(params.focus?.length ? params.focus : ["позиционирование", "оффер", "CTA", "доверие", "цены", "контент", "отзывы", "AI-видимость"]).map((item) => `- ${item}`).join("\n")}

Верни JSON:
{
  "matrix": [
    {
      "competitor": "название или URL",
      "positioning": "главный месседж",
      "audience": "для кого",
      "offer": "что продают",
      "cta": "главный следующий шаг",
      "trust_signals": ["доказательства"],
      "pricing_signal": "что видно по цене",
      "content_strategy": "что публикуют",
      "weaknesses": ["слабые места"]
    }
  ],
  "market_gaps": ["что не закрыто никем"],
  "actions_for_us": ["что усилить у нас"]
}`;
}

export function buildCroAuditPrompt(params: {
  pageUrlOrDescription: string;
  audience: string;
  goal: string;
  currentConversion?: string;
}): string {
  return `Проведи CRO-аудит страницы.

Страница:
${params.pageUrlOrDescription}

Аудитория: ${params.audience}
Цель страницы: ${params.goal}
Текущая конверсия: ${params.currentConversion ?? "не указана"}

Оцени по шкале 1-10:
1. Ясность ценности на первом экране
2. Соответствие аудитории
3. Трение в CTA
4. Доверие и доказательства
5. FAQ/возражения
6. Мобильный опыт
7. Путь до заявки

Для слабых зон дай ICE-гипотезы.

Ответь JSON:
{
  "scores": [{"dimension": "название", "score": 1, "reason": "почему"}],
  "critical_issues": ["до 3 критичных проблем"],
  "hypotheses": [
    {
      "hypothesis": "Если изменить X на Y, ожидаем Z, потому что ...",
      "impact": 1,
      "confidence": 1,
      "effort": 1,
      "ice_score": 1
    }
  ]
}`;
}

export function buildWeeklyGrowthReportPrompt(params: {
  period: string;
  completedTasks: string[];
  metrics: string[];
  blockers?: string[];
}): string {
  return `Собери недельный отчёт Local Sales OS.

Период: ${params.period}

Выполненные задачи:
${params.completedTasks.map((item) => `- ${item}`).join("\n") || "- нет данных"}

Метрики:
${params.metrics.map((item) => `- ${item}`).join("\n") || "- нет данных"}

Блокеры:
${(params.blockers ?? []).map((item) => `- ${item}`).join("\n") || "- нет"}

Формат:
- Executive summary: 3-5 строк
- Что улучшилось
- Что просело
- Что сделать на следующей неделе
- Какие данные нужны от клиента

Не обещай фиксированных клиентов без данных.`;
}

export function buildUnitEconomicsPrompt(params: {
  channel: string;
  spend: number;
  leads: number;
  sales: number;
  revenue: number;
  grossMarginPercent?: number;
}): string {
  return `Рассчитай unit economics по каналу.

Канал: ${params.channel}
Расход: ${params.spend}
Лиды: ${params.leads}
Продажи: ${params.sales}
Выручка: ${params.revenue}
Валовая маржа, %: ${params.grossMarginPercent ?? "не указана"}

Верни CAC/CPL/CR/ROMI/payback-вывод и 3 действия по улучшению.`;
}
