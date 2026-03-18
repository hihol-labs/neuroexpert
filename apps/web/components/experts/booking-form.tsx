"use client";

import { useEffect, useState } from "react";

interface Props {
  expertId: string;
  expertName: string;
}

interface Slot {
  time: string;
  available: boolean;
}

export function BookingForm({ expertId, expertName }: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [hasSchedule, setHasSchedule] = useState<boolean | null>(null);

  // Check if expert has schedule configured
  useEffect(() => {
    fetch(`/api/bookings?expert_id=${expertId}`)
      .then((r) => r.json())
      .then((data) => setHasSchedule((data.schedule?.length ?? 0) > 0))
      .catch(() => setHasSchedule(false));
  }, [expertId]);

  // Load available slots when date changes
  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setTime("");
    fetch(`/api/bookings?expert_id=${expertId}&date=${date}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [expertId, date]);

  if (hasSchedule === null) return null;
  if (!hasSchedule) return null; // Expert hasn't configured schedule

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact || !date || !time) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expert_id: expertId,
          client_name: name,
          client_contact: contact,
          client_message: message || null,
          booking_date: date,
          booking_time: time,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-green-800 font-medium">
          Запись отправлена! Эксперт подтвердит время.
        </p>
      </div>
    );
  }

  // Min date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  // Max date: 30 days from now
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  return (
    <div className="border rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-4">
        Записаться к {expertName}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Ваше имя *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Контакт (Telegram/телефон) *
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Дата *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={minDate}
            max={maxDateStr}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {date && (
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Время *
            </label>
            {loading ? (
              <p className="text-sm text-gray-400">Загрузка слотов...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400">
                Нет доступных слотов в этот день
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setTime(slot.time)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      time === slot.time
                        ? "bg-blue-600 text-white border-blue-600"
                        : slot.available
                          ? "text-gray-700 border-gray-300 hover:border-blue-400"
                          : "text-gray-300 border-gray-200 cursor-not-allowed line-through"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Сообщение
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="О чём хотите поговорить..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !name || !contact || !date || !time}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Отправка..." : "Записаться"}
        </button>
      </form>
    </div>
  );
}
