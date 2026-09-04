"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Niche = { id: string; name: string };

/**
 * Форма заказа: POST /api/orders → редирект на confirmation_url ЮKassa.
 * Все отказы pre-flight (503) показываются словами сервера — они уже честные
 * («готовим замер по вашему городу», «недостаточно платформ»), без 500.
 */
export function OrderForm({ niches, amountRub }: { niches: Niche[]; amountRub: number }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const body = {
      niche_id: String(form.get("niche_id") || ""),
      city: String(form.get("city") || ""),
      email: String(form.get("email") || ""),
    };
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; confirmation_url?: string };
      if (res.ok && data.confirmation_url) {
        window.location.assign(data.confirmation_url);
        return;
      }
      setMessage(data.error || "Не удалось создать заказ. Деньги не списаны.");
    } catch {
      setMessage("Сеть недоступна. Деньги не списаны, попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ln-application" id="order" data-order-form="audit_start">
      <div className="ln-application-copy">
        <p className="sr-eyebrow">01 / ЗАКАЗ</p>
        <h2>Три поля — и система начинает замер.</h2>
        <p>Email станет вашим аккаунтом: письмо со ссылкой на статус придёт сразу после оплаты.</p>
        <div><strong>{amountRub.toLocaleString("ru-RU")} ₽</strong><span>разово, без подписки</span></div>
      </div>
      <form onSubmit={onSubmit} className="ln-form">
        <div className="ln-form-grid">
          <label>
            <span>Ниша</span>
            <select name="niche_id" required defaultValue="">
              <option value="" disabled>Выберите нишу</option>
              {niches.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </label>
          <label>
            <span>Город</span>
            <input name="city" type="text" required minLength={2} maxLength={80} placeholder="Например, Екатеринбург" />
          </label>
          <label className="ln-form-wide">
            <span>Email</span>
            <input name="email" type="email" required placeholder="you@company.ru" />
          </label>
        </div>
        {message && <p className="ln-form-success" role="status">{message}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Проверяем, выполним ли замер…" : "Перейти к оплате"} <ArrowRight />
        </button>
        <p>
          Нажимая кнопку, вы соглашаетесь с <Link href="/terms">офертой</Link> и{" "}
          <Link href="/privacy">политикой конфиденциальности</Link>.
        </p>
      </form>
    </section>
  );
}
