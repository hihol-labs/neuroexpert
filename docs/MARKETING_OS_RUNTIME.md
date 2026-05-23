# Marketing OS Runtime

Дата: 2026-05-23

## Что добавлено

Marketing OS — это операционный слой НейроЭксперта, который переводит методики из материала про Claude Code в продуктовые workflow платформы.

Главный принцип: AI готовит анализ, текст, гипотезу или отчёт, но публикация, отправка, коммерческое решение и внешнее обещание проходят human review.

## Инструменты

| Инструмент | Реализация в платформе |
|---|---|
| Skills / playbooks | `packages/shared/src/marketing-os.ts` — единый реестр методик и стадий внедрения |
| Voice extractor | `profiles.voice_profile`, prompt `buildVoiceProfilePrompt()`, использование в `generate_content` |
| AEO / AI SEO | `query-fanout` теперь возвращает cluster, intent, desired answer и CTA |
| Competitor profiling | prompt `buildCompetitorProfilingPrompt()` для будущих B2B workflows |
| CRO audit | prompt `buildCroAuditPrompt()` и таблица `page_quality_checks` |
| Subagents | роли зафиксированы как `researcher`, `copywriter`, `fact_checker`, `seo_analyst`, `cro_analyst`, `growth_operator` |
| MCP / connectors | пока только read/draft-first контракт, без автоотправки и автопубликации |
| Slash/workflows | таблица `marketing_workflow_runs` фиксирует workflow_key, роль, input/output и review status |
| Scheduled tasks | в реестр внесены регулярные проверки; запуск — только после gate worker/core |
| Versioning | `content_packages.generation_framework` хранит версию методики и роли генерации |
| Lead magnets / reports | prompts для weekly report и коммерческих материалов |
| Unit economics | prompt `buildUnitEconomicsPrompt()` для B2B revenue-сигналов |

## Порядок внедрения

1. Сначала закрыть P0 gate: SMTP/magic link, понятная ошибка login, `/api/health`.
2. Затем Stage 2-3: worker/core E2E, voice profile в реальном content flow.
3. Затем Stage 6-8: AEO-кластеры, workflow visibility, регулярные проверки.
4. Затем Stage 11-14: B2B competitor profiling, CRO, Local Sales OS, MCP-коннекторы.

## Ограничения

- Не подменять реальные provider answers заглушками.
- Не публиковать контент и не отправлять письма автоматически.
- Не делать risky scraping карт, Авито или 2ГИС.
- Не обещать клиентам фиксированное число заявок без фактических данных.
- Все выводы в B2B-аудитах должны иметь source, collected_at, confidence и признак manual/automatic.

## Что проверить после деплоя

- `/api/health` показывает `auth.status`, `auth.magic_link_ready`, worker queue counts.
- `generate_content` создаёт `voice_profile` и сохраняет `generation_framework`.
- `expand_query` сохраняет `aeo_cluster`, `user_intent`, `desired_answer`, `next_cta`.
- Главная страница показывает блок Marketing OS без горизонтального overflow на mobile.
