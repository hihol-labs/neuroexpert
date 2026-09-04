"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Vertical = { id: string; name: string };
type PairStatus = "collecting" | "empty";

/**
 * Форма заказа: POST /api/orders {vertical, city, email} → редирект на
 * confirmation_url ЮKassa. Ответ 202 (G-018b) — пара «вертикаль × город» ещё
 * не наполнена: показываем экран «готовим замер» (collecting) или честное
 * «спроса не нашли» (empty) словами сервера. Отказы pre-flight (503) тоже
 * показываются словами сервера, без 500.
 */
export function OrderForm({
  verticals,
  amountRub,
  initialVertical = "",
  initialCity = "",
}: {
  verticals: Vertical[];
  amountRub: number;
  initialVertical?: string;
  initialCity?: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pair, setPair] = useState<{ status: PairStatus; city: string; email: string; message: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const body = {
      vertical: String(form.get("vertical") || ""),
      city: String(form.get("city") || ""),
      email: String(form.get("email") || ""),
    };
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        confirmation_url?: string;
        status?: string;
      };
      if (res.ok && data.confirmation_url) {
        window.location.assign(data.confirmation_url);
        return;
      }
      if (res.status === 202 && (data.status === "collecting" || data.status === "empty")) {
        setPair({ status: data.status, city: body.city.trim(), email: body.email.trim(), message: data.error || "" });
        return;
      }
      setMessage(data.error || "Не удалось создать заказ. Деньги не списаны.");
    } catch {
      setMessage("Сеть недоступна. Деньги не списаны, попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  if (pair) {
    return (
      <section className="ln-application" id="order" data-order-form="audit_start" data-pair-status={pair.status}>
        <div className="ln-application-copy">
          <p className="sr-eyebrow">01 / {pair.status === "collecting" ? "ГОТОВИМ ЗАМЕР" : "ЗАМЕР НЕВОЗМОЖЕН"}</p>
          <h2>
            {pair.status === "collecting"
              ? `Готовим замер по городу ${pair.city}.`
              : `По городу ${pair.city} спроса в источниках не нашлось.`}
          </h2>
          <p>{pair.message}</p>
          {pair.status === "collecting" && (
            <p>
              Деньги не списаны. Когда данные по городу будут собраны, на <strong>{pair.email}</strong> придёт
              письмо со ссылкой — по ней откроется оплата.
            </p>
          )}
          <p>
            <Link href="/order/audit-start">Указать другой город</Link>
          </p>
        </div>
      </section>
    );
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
            <span>Вертикаль</span>
            <select name="vertical" required defaultValue={initialVertical}>
              <option value="" disabled>Выберите вертикаль</option>
              {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
          <label>
            <span>Город</span>
            <input
              name="city"
              type="text"
              required
              minLength={2}
              maxLength={80}
              defaultValue={initialCity}
              placeholder="Например, Екатеринбург"
            />
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
