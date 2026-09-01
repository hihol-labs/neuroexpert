-- 025_jobs_archived_status.sql
-- QUEUE-1 (решение 2026-08-30, .itd/DECISIONS.md): статус 'archived' для
-- исторических упавших задач. Строки не удаляются; архивный статус выводит
-- их из сигнала наблюдаемости (health считает failed отдельно от archived —
-- правка health в QUEUE-3/G-018).

ALTER TABLE public.jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending','processing','completed','failed','retry','archived'));
