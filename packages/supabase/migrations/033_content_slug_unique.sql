-- 033_content_slug_unique.sql
-- R-07 (2026-09-19). Slug статьи уникален в пределах эксперта.
-- Читатель /experts/<slug>/<articleSlug> выбирает статью по (expert_id, slug) через .single(): два
-- пакета с одним slug ломали бы обе страницы (404). До этой миграции уникальность ничем не
-- обеспечивалась; генератор с R-07 добавляет суффикс (-2, -3…) при коллизии.
-- Прод на 2026-09-19 (read-only проверка): дублей 0, slug IS NULL 0 - индекс строится без правок данных.
-- Если дубли появятся до применения, CREATE UNIQUE INDEX упадёт, транзакция откатится целиком -
-- данные миграция не меняет. Идемпотентно. Rollback: DROP INDEX IF EXISTS
-- public.content_packages_expert_slug_uniq;
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS content_packages_expert_slug_uniq
  ON public.content_packages (expert_id, slug)
  WHERE slug IS NOT NULL;

COMMIT;
