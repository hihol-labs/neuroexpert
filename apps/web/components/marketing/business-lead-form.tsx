"use client";

import { ArrowRight, Check } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";

type Lead = {
  name: string;
  company: string;
  contact: string;
  city: string;
  niche: string;
  website: string;
  platforms: string;
  competitors: string;
  avg_check: string;
  current_leads: string;
  message: string;
};

const initialLead: Lead = {
  name: "", company: "", contact: "", city: "", niche: "", website: "", platforms: "",
  competitors: "", avg_check: "", current_leads: "", message: "",
};

export function BusinessLeadForm() {
  const [lead, setLead] = useState(initialLead);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const update = (field: keyof Lead) => (value: string) => setLead((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!lead.name.trim() || !lead.company.trim() || !lead.contact.trim()) return;
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/b2b-leads", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Ошибка отправки");
      setStatus("sent");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка отправки");
      setStatus("idle");
    }
  };

  if (status === "sent") return <FormSuccess />;

  return (
    <form className="br-form" onSubmit={submit} aria-busy={status === "sending"}>
      <div className="br-form-grid">
        <FormField label="Имя *" value={lead.name} onChange={update("name")} placeholder="Иван" required />
        <FormField label="Компания *" value={lead.company} onChange={update("company")} placeholder="Название" required />
        <FormField label="Контакт *" value={lead.contact} onChange={update("contact")} placeholder="Telegram или телефон" required />
        <FormField label="Город" value={lead.city} onChange={update("city")} placeholder="Москва" />
        <FormField label="Ниша" value={lead.niche} onChange={update("niche")} placeholder="Стоматология" />
        <FormField label="Сайт" value={lead.website} onChange={update("website")} placeholder="site.ru" />
      </div>
      <FormField label="Что сейчас теряется?" value={lead.message} onChange={update("message")} placeholder="Мало звонков, пропущенные обращения, конкуренты выше в картах…" multiline />
      <OptionalFields lead={lead} update={update} />
      {error && <p className="br-form-error" role="alert">{error}</p>}
      <button className="br-form-submit" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Отправляем…" : "Получить карту потерь"}<ArrowRight aria-hidden="true" />
      </button>
      <p className="br-form-privacy">Без доступа к кабинетам на первом этапе. Нужны только ссылки и контекст.</p>
    </form>
  );
}

function OptionalFields({ lead, update }: { lead: Lead; update: (field: keyof Lead) => (value: string) => void }) {
  return (
    <details className="br-form-more">
      <summary>Добавить данные для более точного разбора</summary>
      <div className="br-form-grid">
        <FormField label="Площадки" value={lead.platforms} onChange={update("platforms")} placeholder="Карты, 2ГИС, Авито" />
        <FormField label="Конкуренты" value={lead.competitors} onChange={update("competitors")} placeholder="3–5 компаний" />
        <FormField label="Средний чек" value={lead.avg_check} onChange={update("avg_check")} placeholder="35 000 ₽" />
        <FormField label="Обращения сейчас" value={lead.current_leads} onChange={update("current_leads")} placeholder="30 в месяц" />
      </div>
    </details>
  );
}

function FormField({ label, value, onChange, placeholder, required, multiline }: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; multiline?: boolean;
}) {
  const common = { value, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), placeholder, required };
  return (
    <label className={multiline ? "br-form-field br-form-field-wide" : "br-form-field"}>
      <span>{label}</span>
      {multiline ? <textarea {...common} rows={3} /> : <input {...common} type="text" />}
    </label>
  );
}

function FormSuccess() {
  return (
    <div className="br-form-success" role="status" aria-live="polite">
      <Check aria-hidden="true" /><span>Заявка принята / 01</span>
      <h3>Маршрут спроса начали собирать.</h3>
      <p>Свяжемся с вами, уточним площадки и предложим формат диагностики.</p>
    </div>
  );
}
