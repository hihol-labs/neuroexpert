import { CheckoutHrefProvider } from "@/components/marketing/checkout-context";
import { auditStartHref } from "@/lib/checkout";

// G-013: ссылка заказа (dark/live) вычисляется на каждый запрос и отдаётся клиентским
// компонентам через контекст. Группа рендерится динамически, чтобы флаг
// SELF_SERVE_CHECKOUT не запекался в сборку (класс ошибки хотфикса /pricing 109be20).
export const dynamic = "force-dynamic";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <CheckoutHrefProvider orderHref={auditStartHref()}>
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <div className="relative">{children}</div>
      </div>
    </CheckoutHrefProvider>
  );
}
