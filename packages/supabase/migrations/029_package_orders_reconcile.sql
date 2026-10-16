-- R-01 (ADR-004). Сверка платежей и брошенные корзины. Additive, transactional.
-- Rollback: stop new worker, restore pre-029 backup if reverting schema; never DROP columns
-- with delivered artifacts.
--
-- Статус 'expired' — pending-заказ старше окна протухания без подтверждённого платежа.
-- Не терминален для денег: payment.succeeded переводит expired -> paid (state.ts, webhook,
-- reconcile). Колонки *_email_sent_at — идемпотентность писем клиенту о провале/возврате.
BEGIN;
ALTER TABLE public.package_orders
 DROP CONSTRAINT package_orders_status_check,
 DROP CONSTRAINT package_orders_job_requires_paid,
 ADD COLUMN expired_at timestamptz,
 ADD COLUMN failure_email_sent_at timestamptz,
 ADD COLUMN failure_email_last_error text,
 ADD COLUMN refund_email_sent_at timestamptz,
 ADD COLUMN refund_email_last_error text,
 ADD COLUMN reconciled_at timestamptz;
ALTER TABLE public.package_orders
 ADD CONSTRAINT package_orders_status_check CHECK (status IN ('pending','paid','delivered','failed','refunded','expired')),
 ADD CONSTRAINT package_orders_job_requires_paid CHECK (job_id IS NULL OR status IN ('paid','delivered','failed','refunded')),
 ADD CONSTRAINT package_orders_expired_check CHECK (
   (status = 'expired' AND expired_at IS NOT NULL AND paid_at IS NULL) OR
   (status <> 'expired')),
 ADD CONSTRAINT package_orders_failure_email_check CHECK (failure_email_sent_at IS NULL OR paid_at IS NOT NULL),
 ADD CONSTRAINT package_orders_refund_email_check CHECK (refund_email_sent_at IS NULL OR status = 'refunded');
-- Свип сверки берёт pending/expired старыми первыми; health считает pending старше окна.
CREATE INDEX idx_package_orders_reconcile ON public.package_orders(created_at) WHERE status IN ('pending','expired');
NOTIFY pgrst, 'reload schema';
COMMIT;
