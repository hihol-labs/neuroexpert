-- G-019. Additive schema, transactional. Applied once by migration ledger.
-- Rollback: stop new worker, restore pre-028 database backup if reverting schema.
-- Never DROP delivered artifacts to roll back app code; keep this additive schema.
BEGIN;
ALTER TABLE public.package_orders
 DROP CONSTRAINT package_orders_status_check,
 DROP CONSTRAINT package_orders_job_requires_paid,
 ADD COLUMN report jsonb,
 ADD COLUMN report_mode text,
 ADD COLUMN delivered_at timestamptz,
 ADD COLUMN sla_deadline_at timestamptz,
 ADD COLUMN payment_test boolean,
 ADD COLUMN payment_shop_id text,
 ADD COLUMN payment_verified_at timestamptz,
 ADD COLUMN notification_status text NOT NULL DEFAULT 'not_required',
 ADD COLUMN notification_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN notification_next_attempt_at timestamptz,
 ADD COLUMN notification_sent_at timestamptz,
 ADD COLUMN notification_last_error text,
 ADD COLUMN refund_status text NOT NULL DEFAULT 'not_required',
 ADD COLUMN refund_id text,
 ADD COLUMN refund_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN refund_next_attempt_at timestamptz,
 ADD COLUMN refund_last_error text;
UPDATE public.package_orders SET sla_deadline_at = paid_at + interval '60 minutes' WHERE paid_at IS NOT NULL;
UPDATE public.package_orders SET refund_status = 'succeeded' WHERE status = 'refunded';
ALTER TABLE public.package_orders
 ADD CONSTRAINT package_orders_status_check CHECK (status IN ('pending','paid','delivered','failed','refunded')),
 ADD CONSTRAINT package_orders_job_requires_paid CHECK (job_id IS NULL OR status IN ('paid','delivered','failed','refunded')),
 ADD CONSTRAINT package_orders_report_mode_check CHECK (report_mode IS NULL OR report_mode IN ('full','degraded')),
 ADD CONSTRAINT package_orders_report_shape_check CHECK (report IS NULL OR COALESCE(
   jsonb_typeof(report) = 'object' AND report->>'schema_version' = '1' AND
   CASE WHEN jsonb_typeof(report->'gaps') = 'array' THEN jsonb_array_length(report->'gaps') = 10 ELSE false END, false)),
 ADD CONSTRAINT package_orders_report_state_check CHECK (
   (report IS NULL AND report_mode IS NULL AND delivered_at IS NULL AND status <> 'delivered') OR
   (report IS NOT NULL AND report_mode IS NOT NULL AND delivered_at IS NOT NULL AND status IN ('delivered','refunded'))),
 ADD CONSTRAINT package_orders_sla_check CHECK (
   (paid_at IS NULL AND sla_deadline_at IS NULL AND status NOT IN ('paid','delivered')) OR
   (paid_at IS NOT NULL AND sla_deadline_at IS NOT NULL AND sla_deadline_at = paid_at + interval '60 minutes')),
 ADD CONSTRAINT package_orders_delivery_before_deadline_check CHECK (delivered_at IS NULL OR
   (paid_at IS NOT NULL AND delivered_at >= paid_at AND delivered_at < sla_deadline_at)),
 ADD CONSTRAINT package_orders_payment_verification_check CHECK (payment_verified_at IS NULL OR
   (payment_test IS NOT NULL AND payment_shop_id IS NOT NULL AND length(btrim(payment_shop_id)) > 0 AND yukassa_payment_id IS NOT NULL)),
 ADD CONSTRAINT package_orders_notification_check CHECK (notification_attempts >= 0 AND (
   (notification_status = 'not_required' AND notification_sent_at IS NULL) OR
   (notification_status = 'pending' AND report IS NOT NULL AND notification_next_attempt_at IS NOT NULL AND notification_sent_at IS NULL) OR
   (notification_status = 'sent' AND report IS NOT NULL AND notification_sent_at IS NOT NULL))),
 ADD CONSTRAINT package_orders_refund_check CHECK (refund_attempts >= 0 AND (
   refund_status = 'not_required' OR
   (refund_status = 'pending' AND status = 'failed' AND paid_at IS NOT NULL AND refund_next_attempt_at IS NOT NULL) OR
   (refund_status = 'submitted' AND status = 'failed' AND refund_id IS NOT NULL AND refund_next_attempt_at IS NOT NULL) OR
   (refund_status = 'succeeded' AND status = 'refunded')));
CREATE UNIQUE INDEX idx_package_orders_refund_id ON public.package_orders(refund_id) WHERE refund_id IS NOT NULL;
CREATE INDEX idx_package_orders_delivery_sla ON public.package_orders(sla_deadline_at) WHERE status = 'paid';
CREATE INDEX idx_package_orders_notification_due ON public.package_orders(notification_next_attempt_at) WHERE notification_status = 'pending';
CREATE INDEX idx_package_orders_refund_due ON public.package_orders(refund_next_attempt_at) WHERE refund_status IN ('pending','submitted');

CREATE FUNCTION public.guard_package_order_delivery() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF OLD.paid_at IS NOT NULL AND NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
   RAISE EXCEPTION 'package order paid_at is immutable';
  END IF;
  IF OLD.payment_verified_at IS NOT NULL AND
    (NEW.payment_test IS DISTINCT FROM OLD.payment_test OR NEW.payment_shop_id IS DISTINCT FROM OLD.payment_shop_id OR
     NEW.payment_verified_at IS DISTINCT FROM OLD.payment_verified_at OR NEW.yukassa_payment_id IS DISTINCT FROM OLD.yukassa_payment_id) THEN
   RAISE EXCEPTION 'verified payment identity is immutable';
  END IF;
  IF OLD.report IS NOT NULL AND (NEW.report IS DISTINCT FROM OLD.report OR NEW.report_mode IS DISTINCT FROM OLD.report_mode OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at) THEN
   RAISE EXCEPTION 'delivered report is immutable';
  END IF;
  IF OLD.status IN ('failed','refunded') AND NEW.status IN ('paid','delivered') THEN
   RAISE EXCEPTION 'terminal package order cannot become deliverable';
  END IF;
 END IF;
 NEW.sla_deadline_at := NEW.paid_at + interval '60 minutes';
 IF NEW.status = 'refunded' THEN
  NEW.refund_status := 'succeeded'; NEW.refund_next_attempt_at := NULL;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_package_order_delivery BEFORE INSERT OR UPDATE ON public.package_orders FOR EACH ROW EXECUTE FUNCTION public.guard_package_order_delivery();

CREATE FUNCTION public.complete_package_audit(p_order_id uuid, p_report jsonb, p_mode text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE v_order public.package_orders%ROWTYPE; v_now timestamptz;
BEGIN
 SELECT * INTO v_order FROM public.package_orders WHERE id = p_order_id FOR UPDATE;
 IF NOT FOUND THEN RETURN 'missing'; END IF;
 IF v_order.status = 'delivered' THEN RETURN 'already_delivered'; END IF;
 IF v_order.status <> 'paid' THEN RETURN 'ignored'; END IF;
 v_now := clock_timestamp();
 IF v_order.sla_deadline_at IS NULL OR v_now >= v_order.sla_deadline_at THEN
  UPDATE public.package_orders SET status='failed', failure_reason='audit_sla_breached', refund_status='pending', refund_next_attempt_at=v_now WHERE id=p_order_id;
  RETURN 'sla_breached';
 END IF;
 UPDATE public.package_orders SET status='delivered', report=p_report, report_mode=p_mode,
  delivered_at=v_now, failure_reason=NULL, notification_status='pending', notification_next_attempt_at=v_now WHERE id=p_order_id;
 RETURN 'delivered';
END;
$$;
CREATE FUNCTION public.fail_package_audit(p_order_id uuid, p_reason text, p_only_if_sla_breached boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE v_order public.package_orders%ROWTYPE; v_now timestamptz;
BEGIN
 SELECT * INTO v_order FROM public.package_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR v_order.status <> 'paid' THEN RETURN false; END IF;
 v_now := clock_timestamp();
 IF p_only_if_sla_breached AND v_order.sla_deadline_at IS NOT NULL AND v_now < v_order.sla_deadline_at THEN RETURN false; END IF;
 UPDATE public.package_orders SET status='failed', failure_reason=COALESCE(NULLIF(btrim(p_reason),''),'audit_failed'),
  refund_status='pending', refund_next_attempt_at=v_now WHERE id=p_order_id;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_package_audit(uuid,jsonb,text) FROM PUBLIC, anon, authenticated;
-- Recover a paid order after a process crash between payment activation and job handoff.
CREATE FUNCTION public.ensure_package_audit_job(p_order_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE v_order public.package_orders%ROWTYPE; v_job uuid;
BEGIN
 SELECT * INTO v_order FROM public.package_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR v_order.status <> 'paid' THEN RETURN NULL; END IF;
 IF v_order.job_id IS NOT NULL THEN RETURN v_order.job_id; END IF;
 INSERT INTO public.jobs(type,payload,priority) VALUES ('run_audit',jsonb_build_object(
  'order_id',v_order.id,'package',v_order.package,'niche_id',v_order.niche_id,'city',v_order.city,'owner_id',v_order.owner_id),1) RETURNING id INTO v_job;
 UPDATE public.package_orders SET job_id=v_job WHERE id=p_order_id;
 RETURN v_job;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_package_audit_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_package_audit_job(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.fail_package_audit(uuid,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_package_audit(uuid,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_package_audit(uuid,text,boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
