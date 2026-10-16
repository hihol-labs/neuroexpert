export type MarketingOsToolKey =
  | "skills"
  | "voice_extractor"
  | "aeo_ai_seo"
  | "competitor_profiling"
  | "cro_audit"
  | "subagents"
  | "mcp_connectors"
  | "slash_workflows"
  | "scheduled_tasks"
  | "versioning"
  | "lead_magnets_reports"
  | "unit_economics";

export type MarketingOsTool = {
  key: MarketingOsToolKey;
  title: string;
  platformEffect: string;
  implementation: string;
  stage: number;
  humanReviewRequired: boolean;
};

export const MARKETING_OS_TOOLS: MarketingOsTool[] = [
  {
    key: "skills",
    title: "Исполняемые методики",
    platformEffect: "Одинаковое качество аудитов, контента, отчётов и задач роста без ручного копирования промптов.",
    implementation: "Единый реестр playbook-ов для AEO, CRO, конкурентов, контента, отчётов и Local Sales OS.",
    stage: 2,
    humanReviewRequired: true,
  },
  {
    key: "voice_extractor",
    title: "Профиль голоса эксперта",
    platformEffect: "Контент сохраняет лексику, ритм, ограничения и авторские обороты эксперта.",
    implementation: "После голосовой записи обновляется voice_profile и используется при генерации всех форматов.",
    stage: 3,
    humanReviewRequired: true,
  },
  {
    key: "aeo_ai_seo",
    title: "AEO / AI SEO workflow",
    platformEffect: "Спрос разбивается на информационные, сравнительные, рекомендательные и транзакционные кластеры.",
    implementation: "Prompt fan-out и gap-analysis получают кластер запроса, желаемый ответ бренда и следующий CTA.",
    stage: 6,
    humanReviewRequired: true,
  },
  {
    key: "competitor_profiling",
    title: "Профилирование конкурентов",
    platformEffect: "Local Sales OS показывает не только слабые места клиента, но и почему конкурент выглядит сильнее.",
    implementation: "Матрица: оффер, CTA, доверие, цены, страницы, отзывы, AI-упоминания и gaps.",
    stage: 11,
    humanReviewRequired: true,
  },
  {
    key: "cro_audit",
    title: "CRO-аудит страниц",
    platformEffect: "Страницы оцениваются по пути к заявке, а не по факту публикации.",
    implementation: "ICE-гипотезы для value proposition, CTA, доверия, FAQ, мобильного опыта и формы.",
    stage: 11,
    humanReviewRequired: true,
  },
  {
    key: "subagents",
    title: "Роли генерации",
    platformEffect: "Исследование, текст, фактчекинг, SEO/CRO и growth-задачи разделяются по ответственности.",
    implementation: "Набор ролей researcher, copywriter, fact_checker, seo_analyst, cro_analyst, growth_operator.",
    stage: 2,
    humanReviewRequired: true,
  },
  {
    key: "mcp_connectors",
    title: "Коннекторы данных",
    platformEffect: "B2B-пилоты быстрее передают документы, таблицы, CRM-выгрузки и материалы без ручного хаоса.",
    implementation: "Только read/draft-first режимы: Drive, Sheets, Docs, CRM и таск-трекеры без автопубликаций.",
    stage: 14,
    humanReviewRequired: true,
  },
  {
    key: "slash_workflows",
    title: "Операторские workflow-команды",
    platformEffect: "Оператор запускает типовые процедуры одной командой: отчёт, AEO-check, competitors, growth tasks.",
    implementation: "Команды мапятся на workflow_key и сохраняют runs с input/output и обязательным review.",
    stage: 8,
    humanReviewRequired: true,
  },
  {
    key: "scheduled_tasks",
    title: "Регулярные проверки",
    platformEffect: "Платформа сама обновляет мониторинг, но не принимает коммерческих решений без человека.",
    implementation: "Еженедельные отчёты, AEO-check, competitor update, refresh-content и daily growth tasks.",
    stage: 8,
    humanReviewRequired: true,
  },
  {
    key: "versioning",
    title: "Версионирование артефактов",
    platformEffect: "Можно понять, какая гипотеза, промпт, страница или отчёт изменили результат.",
    implementation: "generation_framework и workflow_runs фиксируют playbook, роль, версию и источник вывода.",
    stage: 2,
    humanReviewRequired: true,
  },
  {
    key: "lead_magnets_reports",
    title: "Лид-магниты, КП и отчёты",
    platformEffect: "B2B-продажи получают быстрые, проверяемые коммерческие материалы по единой структуре.",
    implementation: "Шаблоны аудита, КП, weekly report и post-audit follow-up с источниками и CTA.",
    stage: 13,
    humanReviewRequired: true,
  },
  {
    key: "unit_economics",
    title: "Юнит-экономика и revenue-сигналы",
    platformEffect: "Кабинет показывает деньги: CAC/CPL/ROMI, lost revenue и потенциал возврата обращений.",
    implementation: "Расчётные блоки для Local Sales OS: средний чек, конверсия, потерянные лиды и payback.",
    stage: 12,
    humanReviewRequired: true,
  },
];

export function getMarketingOsTool(key: MarketingOsToolKey): MarketingOsTool {
  const tool = MARKETING_OS_TOOLS.find((item) => item.key === key);
  if (!tool) throw new Error(`Unknown Marketing OS tool: ${key}`);
  return tool;
}

export const MARKETING_OS_AGENT_ROLES = [
  "researcher",
  "copywriter",
  "fact_checker",
  "seo_analyst",
  "cro_analyst",
  "growth_operator",
] as const;

export type MarketingOsAgentRole = (typeof MARKETING_OS_AGENT_ROLES)[number];

export const MARKETING_WORKFLOW_CONTRACT_REQUIRED_FIELDS = [
  "demand_source_id",
  "output_type",
  "target_page_or_task",
  "report_id",
  "lead_metric_key",
  "review_required",
] as const;

export type MarketingWorkflowContractField =
  (typeof MARKETING_WORKFLOW_CONTRACT_REQUIRED_FIELDS)[number];

export type MarketingWorkflowContract = {
  demand_source_id?: string;
  output_type?: string;
  target_page_or_task?: unknown;
  report_id?: string;
  lead_metric_key?: string;
  review_required?: boolean;
};

export type MarketingWorkflowContractValidation = {
  production_ready: boolean;
  missing_fields: MarketingWorkflowContractField[];
  contract: MarketingWorkflowContract;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function hasTarget(value: unknown): boolean {
  if (nonEmptyString(value)) return true;
  const record = asRecord(value);
  return Boolean(nonEmptyString(record.id) || nonEmptyString(record.type));
}

export function validateMarketingWorkflowContract(
  input: unknown,
  options?: { humanReviewRequired?: boolean },
): MarketingWorkflowContractValidation {
  const root = asRecord(input);
  const nested = asRecord(root.contract);
  const contract: MarketingWorkflowContract = {
    demand_source_id: nonEmptyString(nested.demand_source_id ?? root.demand_source_id),
    output_type: nonEmptyString(nested.output_type ?? root.output_type),
    target_page_or_task: nested.target_page_or_task ?? root.target_page_or_task,
    report_id: nonEmptyString(nested.report_id ?? root.report_id),
    lead_metric_key: nonEmptyString(nested.lead_metric_key ?? root.lead_metric_key),
    review_required:
      typeof nested.review_required === "boolean"
        ? nested.review_required
        : typeof root.review_required === "boolean"
          ? root.review_required
          : options?.humanReviewRequired,
  };

  const missing_fields: MarketingWorkflowContractField[] = [];
  if (!contract.demand_source_id) missing_fields.push("demand_source_id");
  if (!contract.output_type) missing_fields.push("output_type");
  if (!hasTarget(contract.target_page_or_task)) missing_fields.push("target_page_or_task");
  if (!contract.report_id) missing_fields.push("report_id");
  if (!contract.lead_metric_key) missing_fields.push("lead_metric_key");
  if (contract.review_required !== true) missing_fields.push("review_required");

  return {
    production_ready: missing_fields.length === 0,
    missing_fields,
    contract,
  };
}

export function attachMarketingWorkflowContractValidation(
  input: unknown,
  validation: MarketingWorkflowContractValidation,
): Record<string, unknown> {
  const root = asRecord(input);
  return {
    ...root,
    contract: {
      ...asRecord(root.contract),
      ...validation.contract,
    },
    contract_validation: {
      production_ready: validation.production_ready,
      missing_fields: validation.missing_fields,
    },
  };
}
