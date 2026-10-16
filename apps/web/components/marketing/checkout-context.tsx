"use client";
// Ссылка заказа Audit Start для клиентских компонентов (G-013). Серверный флаг
// SELF_SERVE_CHECKOUT недоступен в браузере (не NEXT_PUBLIC_*), а запекать его в сборку
// нельзя (класс ошибки хотфикса /pricing 109be20). Поэтому серверный layout группы
// marketing вычисляет auditStartHref() на каждый запрос и отдаёт его через контекст.
import { createContext, useContext } from "react";
import { LAUNCH_AUDIT_START_HREF } from "@/lib/checkout";

const OrderHrefContext = createContext<string>(LAUNCH_AUDIT_START_HREF);

export function CheckoutHrefProvider({ orderHref, children }: { orderHref: string; children: React.ReactNode }) {
  return <OrderHrefContext.Provider value={orderHref}>{children}</OrderHrefContext.Provider>;
}

/** Актуальная ссылка заказа (dark → форма заявки Launch, live → /order/audit-start). */
export function useOrderHref(): string {
  return useContext(OrderHrefContext);
}
