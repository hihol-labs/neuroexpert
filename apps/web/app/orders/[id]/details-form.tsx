"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS = ["website", "brand", "avg_check", "conversion", "competitors", "notes"] as const;

/**
 * Форма дозаполнения: PATCH /api/orders/[id] (owner-only). Доступна и на экране ожидания, и после
 * доставки (R-05b): чек и конверсия нужны, чтобы отчёт посчитал потери в рублях.
 */
export function DetailsForm({ orderId, initial, delivered = false }: { orderId: string; initial: Record<string, string>; delivered?: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Последнее состояние, подтверждённое сервером: от него считается, какие поля изменены.
  const [baseline, setBaseline] = useState<Record<string, string>>(initial);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(null);
    const form = new FormData(event.currentTarget);
    // Только изменённые поля: устаревшая вторая вкладка не стирает то, что сохранила первая
    // (нетронутое поле в PATCH не попадает, сервер оставляет сохранённое значение).
    const body = Object.fromEntries(
      FIELDS.map((name) => [name, String(form.get(name) || "").trim()] as const).filter(([name, value]) => value !== (baseline[name] ?? "")),
    );
    if (Object.keys(body).length === 0) {
      setSaved("Изменений нет.");
      setPending(false);
      return;
    }
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.details && typeof data.details === "object") setBaseline(data.details as Record<string, string>);
        setSaved(delivered ? "Сохранено — расчёт в отчёте обновлён." : "Сохранено — учтём в отчёте.");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setSaved(typeof data?.error === "string" ? data.error : "Не удалось сохранить, попробуйте ещё раз.");
      }
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
        <h2>{delivered ? "Добавьте чек и конверсию — посчитаем потери в рублях." : "Пока считается отчёт — уточните исходные точки."}</h2>
        <p>Необязательно. Сайт или название нужны, чтобы проверить, называют ли вас нейросети. Чек и конверсия — ваша оценка: с ними отчёт покажет потери в клиентах и рублях.</p>
      </div>
      <form onSubmit={onSubmit} className="ln-form">
        <div className="ln-form-grid">
          <label className="ln-form-wide"><span>Сайт</span><input name="website" type="url" defaultValue={initial.website ?? ""} placeholder="https://" maxLength={200} /></label>
          <label className="ln-form-wide"><span>Название, как вас называют клиенты</span><input name="brand" type="text" defaultValue={initial.brand ?? ""} placeholder="Например: Улыбка Плюс" maxLength={100} /></label>
          <label><span>Средний чек, ₽ (ваша оценка)</span><input name="avg_check" type="text" inputMode="numeric" defaultValue={initial.avg_check ?? ""} placeholder="15000" maxLength={20} /></label>
          <label><span>Доля спрашивающих, которые становятся вашими клиентами, % (ваша оценка; 0,1% = 1 клиент на 1000 запросов)</span><input name="conversion" type="text" inputMode="decimal" defaultValue={initial.conversion ?? ""} placeholder="0,1" maxLength={10} /></label>
          <label className="ln-form-wide"><span>Конкуренты</span><textarea name="competitors" rows={2} defaultValue={initial.competitors ?? ""} placeholder="3–5 компаний, с которыми вас сравнивают" maxLength={1000} /></label>
          <label className="ln-form-wide"><span>Что уже пробовали</span><textarea name="notes" rows={3} defaultValue={initial.notes ?? ""} maxLength={2000} /></label>
        </div>
        {saved && <p className="ln-form-success" role="status">{saved}</p>}
        <button type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button>
      </form>
    </section>
  );
}
