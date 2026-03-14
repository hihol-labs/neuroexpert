-- 008_cron_generate_orders.sql
-- Еженедельная генерация заказов (понедельник 04:00 UTC, после collect_demand в 03:00)

SELECT cron.schedule('weekly-generate-orders', '0 4 * * 1',
  $$INSERT INTO public.jobs (type, payload, priority) SELECT 'generate_orders', jsonb_build_object('niche_id', id), 3 FROM public.niches WHERE is_active = TRUE$$
);
