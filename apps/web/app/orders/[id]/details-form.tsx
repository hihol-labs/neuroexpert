"use client";

import { useState } from "react";

/** Форма дозаполнения на экране ожидания: PATCH /api/orders/[id] (owner-only). */
export function DetailsForm({ orderId, initial }: { orderId: string; initial: Record<string, string> }) {
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(null);
    const form = new FormData(event.currentTarget);
    const body = {
      website: String(form.get("website") || ""),
      competitors: String(form.get("competitors") || ""),
      notes: String(form.get("notes") || ""),
    };
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaved(res.ok ? "Сохранено — учтём в отчёте." : "Не удалось сохранить, попробуйте ещё раз.");
    } catch {
      setSaved("Сеть недоступна, попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ln-application" id="details" data-order-details>
      <div className="ln-application-copy">
        <p className="sr-eyebrow">02 / УТОЧНЕНИЕ</p>
        <h2>Пока считается отчёт — уточните исходные точки.</h2>
        <p>Необязательно. Сайт и конкуренты делают выводы отчёта конкретнее.</p>
      </div>
      <form onSubmit={onSubmit} className="ln-form">
        <div className="ln-form-grid">
          <label className="ln-form-wide"><span>Сайт</span><input name="website" type="url" defaultValue={initial.website ?? ""} placeholder="https://" maxLength={200} /></label>
          <label className="ln-form-wide"><span>Конкуренты</span><textarea name="competitors" rows={2} defaultValue={initial.competitors ?? ""} placeholder="3–5 компаний, с которыми вас сравнивают" maxLength={1000} /></label>
          <label className="ln-form-wide"><span>Что уже пробовали</span><textarea name="notes" rows={3} defaultValue={initial.notes ?? ""} maxLength={2000} /></label>
        </div>
        {saved && <p className="ln-form-success" role="status">{saved}</p>}
        <button type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button>
      </form>
    </section>
  );
}
