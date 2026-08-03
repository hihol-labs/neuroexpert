"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Code2, Database, Radio } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";

const PLANS = [
  { id: "read", name: "Read", price: "Free", limit: "100 req / hour", description: "Public data для быстрых аудитов и discovery.", features: ["Experts, articles, questions", "Markers слабых ответов", "JSON + OpenAPI", "Без требований к attribution"] },
  { id: "pro", name: "Pro", price: "$99", limit: "1 000 req / hour", description: "Карта спроса и полные ответы для клиентского контура.", features: ["Всё из Read", "Blind spots + opportunity score", "Статьи, аудио и цитаты", "Commercial license + source"] },
  { id: "enterprise", name: "Enterprise", price: "Custom", limit: "Без лимитов", description: "Слой данных под брендом агентства и SLA.", features: ["Всё из Pro", "Webhooks и выделенный канал", "White-label по договору", "SLA 99.9% и менеджер"] },
];

const DATA_STREAM = [
  ["01", "question", "Вопрос клиента", "Как выбрать психолога для подростка?"],
  ["02", "volume", "Monthly volume", "4 200 / month"],
  ["03", "gap", "Gap score", "8 / 10"],
  ["04", "action", "Recommended action", "expert page → lead"],
];

export default function ForAgenciesPage() {
  return (
    <div className="sr-site ag-site">
      <MarketingHeader />
      <main>
        <section className="ag-hero">
          <div className="ag-hero-copy">
            <div className="sr-index"><span>01</span><span>Agency Control Plane</span></div>
            <p className="sr-eyebrow"><span /> Data layer for agencies</p>
            <h1>Не отчёт.<br /><em>Слой данных.</em></h1>
            <p>Встраивайте карту спроса в свои SEO/GEO-аудиты, контент-планы и клиентские кабинеты. Вопрос → сигнал → действие — в JSON, который можно запустить в работу.</p>
            <div className="ag-actions"><a className="sr-button sr-button-primary" href="#ag-form">Получить API-ключ <ArrowRight /></a><Link href="/api/v1/docs">Открыть OpenAPI <Code2 /></Link></div>
          </div>
          <AgencyConsole />
        </section>

        <section className="ag-proof"><article><span>INPUT</span><b>Real demand</b><small>не ручная гипотеза</small></article><article><span>PROCESS</span><b>4 AI platforms</b><small>сравнение ответа</small></article><article><span>OUTPUT</span><b>Lead action</b><small>готово для клиента</small></article></section>

        <section className="ag-pipeline">
          <header><p className="sr-eyebrow sr-eyebrow-dark"><span /> Data contract</p><h2>Соберите свой клиентский слой.</h2><p>НейроЭксперт отдаёт фактуру. Агентство добавляет стратегию, исполнение и собственный интерфейс.</p></header>
          <div className="ag-stream">{DATA_STREAM.map(([number, type, label, value]) => <article key={number}><span>{number}</span><i className={`ag-stream-icon ag-icon-${type}`} aria-hidden="true" /> <div><small>{label}</small><b>{value}</b></div><Radio aria-hidden="true" /></article>)}</div>
        </section>

        <section className="ag-plans" id="plans">
          <header><p className="sr-eyebrow"><span /> Access tiers</p><h2>Доступ к данным по масштабу.</h2></header>
          <div className="ag-plan-list">{PLANS.map((plan, index) => <article className={plan.id === "pro" ? "is-featured" : ""} key={plan.id}><div className="ag-plan-meta"><span>0{index + 1}</span>{plan.id === "pro" && <b>RECOMMENDED</b>}</div><h3>{plan.name}</h3><strong>{plan.price}</strong><small>{plan.limit}</small><p>{plan.description}</p><ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul><a href="#ag-form">Запросить доступ <ArrowRight /></a></article>)}</div>
        </section>

        <section className="ag-form-section" id="ag-form">
          <div><p className="sr-eyebrow sr-eyebrow-dark"><span /> Access request</p><h2>Подключите данные к своему процессу.</h2><p>Pro и Enterprise выдаём вручную после короткого созвона. Read можно запросить для теста интеграции.</p></div>
          <AgencyControlPlane />
        </section>

        <section className="ag-cta"><div><p>Для конечного бизнеса</p><h2>Нужна не API-выдача, а поток заявок?</h2></div><Link className="sr-button sr-button-light" href="/for-business">Открыть Local Sales OS <ArrowRight /></Link></section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function AgencyConsole() {
  return <div className="ag-console" aria-hidden="true"><header><span>AGENCY / DATA STREAM</span><span><i /> LIVE</span></header><div className="ag-motion-grid">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ animationDelay: `${(index % 7) * 130}ms` }} />)}<b /></div><div className="ag-console-output"><span>GET /blind-spots</span><strong>200 OK</strong><small>response mapped to client action</small></div><div className="ag-console-foot"><span>latency 420ms</span><span>source 4 platforms</span><span>format JSON</span></div></div>;
}

function AgencyControlPlane() {
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [contact, setContact] = useState("");
  const [plan, setPlan] = useState<"read" | "pro" | "enterprise">("pro");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null);
    try {
      const response = await fetch("/api/agency-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, agency, contact, plan, message }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Не удалось отправить заявку"); }
      setDone(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка отправки"); } finally { setSubmitting(false); }
  }

  if (done) return <div className="ag-success" role="status" aria-live="polite"><Check /><span>REQUEST RECEIVED</span><h3>Заявка в очереди доступа.</h3><p>Свяжемся в течение 24 часов. Пока можно изучить <Link href="/api/v1/docs">OpenAPI-документацию</Link>.</p></div>;

  return <form className="ag-form" onSubmit={handleSubmit} aria-busy={submitting}>
    <div className="ag-form-grid"><label><span>01 / Имя</span><input name="name" value={name} onChange={(event) => setName(event.target.value)} required placeholder="Имя" /></label><label><span>02 / Агентство</span><input name="agency" value={agency} onChange={(event) => setAgency(event.target.value)} required placeholder="Название компании" /></label></div>
    <label><span>03 / Email или Telegram</span><input name="contact" value={contact} onChange={(event) => setContact(event.target.value)} required placeholder="you@agency.ru или @username" /></label>
    <label><span>04 / Тариф доступа</span><select name="plan" value={plan} onChange={(event) => setPlan(event.target.value as "read" | "pro" | "enterprise")}><option value="read">Read / Free</option><option value="pro">Pro / $99 в месяц</option><option value="enterprise">Enterprise / custom</option></select></label>
    <label><span>05 / Ниши и сценарий</span><textarea name="message" value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Психология, юриспруденция, медицина..." /></label>
    {error && <p className="ag-form-error" role="alert">{error}</p>}
    <button type="submit" disabled={submitting}>{submitting ? "Отправляем..." : "Получить ключ"}<ArrowRight /></button><small>Beta-доступ выдаём вручную после короткого созвона.</small>
  </form>;
}
