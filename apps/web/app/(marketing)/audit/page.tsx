import { AuditClient } from "./audit-client";
import { auditStartHref } from "@/lib/checkout";

/**
 * Серверная обёртка /audit: единственная задача — вычислить ссылку CTA
 * пакета по серверному флагу SELF_SERVE_CHECKOUT (G-018, dark launch) и
 * передать её клиентскому компоненту. Метаданные страницы — в layout.tsx.
 */
export const dynamic = "force-dynamic";

export default function AuditPage() {
  return <AuditClient auditStartHref={auditStartHref()} />;
}
