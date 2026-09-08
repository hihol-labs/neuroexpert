-- R-02 (ADR-004). Алерты оператору: дедупликация в БД (общая для worker и web, переживает
-- перезапуски). Additive, transactional. Rollback: DROP TABLE public.operator_alerts и функций.
BEGIN;
CREATE TABLE public.operator_alerts (
  key           text PRIMARY KEY,
  kind          text NOT NULL,
  last_sent_at  timestamptz,
  count         integer NOT NULL DEFAULT 0,
  last_message  text,
  last_error    text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operator_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_operator_alerts_last_sent ON public.operator_alerts(last_sent_at);

-- true = отправлять (нет строки или last_sent_at старше окна дедупликации); false = дубль в окне.
CREATE FUNCTION public.claim_operator_alert(p_key text, p_kind text, p_message text, p_dedup_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE v_last timestamptz; v_now timestamptz := clock_timestamp();
BEGIN
  -- Атомарность для нового ключа при конкурентных репликах: строка создаётся идемпотентно
  -- (ON CONFLICT DO NOTHING), после чего решение принимается под блокировкой существующей строки.
  INSERT INTO public.operator_alerts(key, kind, last_sent_at, count, last_message, updated_at)
    VALUES (p_key, p_kind, NULL, 0, NULL, v_now)
    ON CONFLICT (key) DO NOTHING;
  SELECT last_sent_at INTO v_last FROM public.operator_alerts WHERE key = p_key FOR UPDATE;
  IF v_last IS NULL OR v_last < v_now - make_interval(secs => GREATEST(p_dedup_seconds, 0)) THEN
    UPDATE public.operator_alerts SET last_sent_at = v_now, count = count + 1, last_message = left(p_message, 3500),
      last_error = NULL, updated_at = v_now WHERE key = p_key;
    RETURN true;
  END IF;
  UPDATE public.operator_alerts SET count = count + 1, last_message = left(p_message, 3500), updated_at = v_now WHERE key = p_key;
  RETURN false;
END;
$$;

-- Отправка не удалась: фиксируем ошибку и снимаем last_sent_at, чтобы следующий повод отправил снова.
CREATE FUNCTION public.record_operator_alert_error(p_key text, p_error text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  UPDATE public.operator_alerts SET last_error = left(p_error, 500), last_sent_at = NULL, updated_at = clock_timestamp() WHERE key = p_key;
$$;

REVOKE ALL ON TABLE public.operator_alerts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_operator_alert(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_operator_alert_error(text, text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.operator_alerts TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_operator_alert(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_operator_alert_error(text, text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
