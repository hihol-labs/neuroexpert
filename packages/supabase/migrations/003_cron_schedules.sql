-- 003_cron_schedules.sql
-- НейроЭксперт — pg_cron расписание задач

-- Еженедельный сбор спроса и формирование заказов (понедельник 03:00 UTC)
SELECT cron.schedule('weekly-demand', '0 3 * * 1',
  $$INSERT INTO public.jobs (type, payload) SELECT 'collect_demand', jsonb_build_object('niche_id', id) FROM public.niches WHERE is_active = TRUE$$
);

-- Еженедельный трекинг цитирования (среда 04:00 UTC)
SELECT cron.schedule('weekly-citations', '0 4 * * 3',
  $$INSERT INTO public.jobs (type, payload) SELECT 'track_citations', jsonb_build_object('expert_id', id) FROM public.profiles WHERE subscription_tier NOT IN ('free') AND is_published = TRUE$$
);

-- Ежедневная отправка sitemap (06:00 UTC)
SELECT cron.schedule('daily-sitemap', '0 6 * * *',
  $$INSERT INTO public.jobs (type, payload) VALUES ('submit_sitemap', '{}')$$
);

-- Еженедельный трекинг SERP (четверг 05:00 UTC)
SELECT cron.schedule('weekly-serp', '0 5 * * 4',
  $$INSERT INTO public.jobs (type, payload) SELECT 'track_serp', jsonb_build_object('expert_id', id) FROM public.profiles WHERE subscription_tier IN ('expert','business','enterprise') AND is_published = TRUE$$
);

-- Ежемесячный пересчёт Trust Score (1-е число, 02:00 UTC)
SELECT cron.schedule('monthly-trust', '0 2 1 * *',
  $$INSERT INTO public.jobs (type, payload) SELECT 'calculate_trust_score', jsonb_build_object('expert_id', id) FROM public.profiles WHERE is_published = TRUE$$
);

-- Ежедневная проверка Content Freshness (07:00 UTC)
-- Помечает статьи старше 90 дней как needs_refresh
SELECT cron.schedule('daily-freshness', '0 7 * * *',
  $$UPDATE public.content_packages SET refresh_status = 'needs_refresh', updated_at = now() WHERE status = 'published' AND refresh_status = 'fresh' AND ((last_refreshed_at IS NULL AND published_at < now() - interval '90 days') OR (last_refreshed_at IS NOT NULL AND last_refreshed_at < now() - interval '90 days'))$$
);

-- Еженедельная проверка Core Web Vitals (пятница 03:00 UTC)
SELECT cron.schedule('weekly-cwv', '0 3 * * 5',
  $$INSERT INTO public.jobs (type, payload) VALUES ('check_cwv', '{}')$$
);
