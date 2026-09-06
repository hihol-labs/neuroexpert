"use client";
// Цель Метрики «заказ оплачен» (G-012): отправляется на странице владельца заказа,
// когда статус paid/delivered, один раз на заказ в рамках браузерной сессии.
import { useEffect } from "react";
import { reachGoal } from "@/lib/analytics";

const PAID_STATUSES = new Set(["paid", "delivered"]);

export function OrderPaidGoal({ orderId, status, pkg }: { orderId: string; status: string; pkg: string }) {
  useEffect(() => {
    if (!PAID_STATUSES.has(status)) return;
    const key = `ym:order_paid:${orderId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage недоступен (приватный режим) — цель всё равно отправляем один раз за рендер
    }
    reachGoal("order_paid", { package: pkg, status });
  }, [orderId, status, pkg]);
  return null;
}
