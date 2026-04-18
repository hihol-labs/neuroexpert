"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { NeuralBackground } from "@/components/marketing/neural-bg";

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay);
          obs.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(30px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {children}
    </div>
  );
}

const PROBLEMS = [
  {
    icon: "🕵️",
    title: "Клиенты требуют GEO/AIO, инструментов нет",
    desc: "SEO-аудит для AI-search вы делаете руками: спросить ChatGPT, скопировать ответ, оценить. На клиента уходит день. Не масштабируется.",
  },
  {
    icon: "🌑",
    title: "Слепые зоны не видны через классические трекеры",
    desc: "Классические SEO-трекеры показывают позиции в Google. Они не покажут: на какие популярные вопросы ChatGPT и Perplexity отвечают без ссылки на вашего клиента — хотя именно там его сейчас ищут.",
  },
  {
    icon: "📞",
    title: "Защитить чек на GEO-проект нечем",
    desc: "Клиент спрашивает «что вы будете делать?» — в ответ общие слова. Нужны цифры: какие вопросы, какой gap_score, какой объём.",
  },
];

const FEATURES = [
  {
    icon: "🎯",
    title: "Карта слепых зон AI",
    desc: "JSON со списком вопросов в нише, по которым AI отвечает слабо: opportunity_score, gap_score 0–10, маркеры (нет цифр / нет источника / нет имени эксперта).",
    color: "purple",
  },
  {
    icon: "📊",
    title: "Реальный спрос",
    desc: "monthly_volume из Wordstat + sub_queries (Query Fan-Out). Ранжируйте контент-план клиента по реальному поисковому объёму, а не интуиции.",
    color: "violet",
  },
  {
    icon: "✅",
    title: "Готовые экспертные ответы",
    desc: "В тарифах Pro+ — endpoint /answers: полные SEO-статьи (2900+ слов), TL;DR, цитаты, аудио, лицензия с attribution. White-label источник контента для агентств.",
    color: "purple",
  },
  {
    icon: "🤖",
    title: "Probing 4 AI-платформ",
    desc: "ChatGPT + YandexGPT + Perplexity + GigaChat. Для каждого вопроса — реальный ответ AI с разбором по 4 маркерам качества (citations, examples, numbers).",
    color: "violet",
  },
  {
    icon: "🔌",
    title: "REST + OpenAPI 3.0",
    desc: "Bearer auth, JSON-only, документация по стандарту OpenAPI. Простая интеграция в любой ваш дашборд / Bitrix / Google Sheets через Apps Script.",
    color: "purple",
  },
  {
    icon: "🇷🇺",
    title: "Российские источники",
    desc: "Wordstat, Яндекс Кью, YandexGPT, GigaChat — данные релевантны рунету, не американскому SERP. Без VPN, без обхода блокировок, законно.",
    color: "violet",
  },
];

const USE_CASES = [
  {
    niche: "Психология",
    metric: "gap_score",
    metricLabel: "0–10 по каждому вопросу",
    insight: "GET /blind-spots?niche=psychology возвращает JSON: список высокообъёмных вопросов, по которым AI-ответ не содержит имени эксперта / примеров / источника / цифр. Контент-брифы для клиента генерируются из этого списка.",
    color: "from-purple-500/15 to-violet-500/5 border-purple-500/30",
  },
  {
    niche: "Юриспруденция",
    metric: "TAM",
    metricLabel: "считается на стороне агентства",
    insight: "GET /blind-spots?niche=legal отдаёт monthly_volume + opportunity_score по каждому вопросу. Ваша формула «volume × CTR × LTV» на выходе даёт оценку TAM по AI-каналу для конкретного клиента.",
    color: "from-violet-500/15 to-purple-500/5 border-violet-500/30",
  },
  {
    niche: "Медицина",
    metric: "4 платформы",
    metricLabel: "ChatGPT · Perplexity · YandexGPT · GigaChat",
    insight: "По каждому вопросу — probe всех 4 AI-платформ с 4 маркерами качества ответа (имя эксперта / примеры / источник / цифры). Видно где AI даёт generic-ответ без рекомендации врача — whitespace для контентной работы.",
    color: "from-purple-500/15 to-violet-500/5 border-purple-500/30",
  },
];

const PLANS = [
  {
    name: "Read",
    price: "Free",
    period: "",
    desc: "Public data: эксперты, статьи, вопросы",
    limit: "100 запросов/час",
    features: [
      "GET /experts — каталог экспертов",
      "GET /articles — публикации",
      "GET /questions — вопросы + gap-маркеры",
      "Без attribution-требований",
    ],
    cta: "Получить ключ →",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/мес",
    priceNote: "≈ 9 000 ₽/мес · оплата в рублях по курсу ЦБ",
    desc: "Карта слепых зон + полные ответы",
    limit: "1 000 запросов/час",
    features: [
      "Всё из Read",
      "GET /blind-spots — opportunity map",
      "GET /answers — полные статьи + аудио + цитаты",
      "Лицензия: коммерческое использование с attribution",
      "Email-поддержка ≤ 24 ч",
    ],
    cta: "Запросить Pro →",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "По запросу",
    period: "",
    desc: "Custom limits, SLA, white-label",
    limit: "Без лимитов",
    features: [
      "Всё из Pro",
      "Webhook на новые слепые зоны в нише",
      "White-label: ответы без attribution (по договору)",
      "SLA 99.9%, dedicated channel",
      "Персональный менеджер",
    ],
    cta: "Обсудить →",
    highlight: false,
  },
];

const CODE_SAMPLE = `# Найти слепые зоны AI в нише психологии
curl -H "Authorization: Bearer ne_..." \\
  "https://neuroexpertise.ru/api/v1/blind-spots?niche=psychology&min_gap_score=7&min_volume=1500"

# Response
{
  "data": [
    {
      "question": "Как выбрать психолога для подростка?",
      "monthly_volume": 4200,
      "gap_score": 8,
      "opportunity_score": 73.4,
      "markers": {
        "has_expert_name": false,
        "has_specific_examples": false,
        "has_source_link": false,
        "has_specific_numbers": true
      },
      "weakness_summary": "AI отвечает абстрактно, без конкретного эксперта и источников",
      "sub_queries": [
        "Подростковый психолог Москва цена",
        "Психолог для подростка с тревожностью"
      ],
      "niche": { "name": "Психология", "slug": "psychology" }
    }
    // ... ещё 46 вопросов
  ],
  "niche_summary": [...],
  "pagination": { "total": 47, "limit": 50, "has_more": false }
}`;

function AgencyLeadForm() {
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [contact, setContact] = useState("");
  const [plan, setPlan] = useState<"read" | "pro" | "enterprise">("pro");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agency-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, agency, contact, plan, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось отправить заявку");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">📬</div>
        <h3 className="text-xl font-semibold text-white mb-2">Заявка получена</h3>
        <p className="text-gray-400">
          Свяжемся в течение 24 часов и выдадим ключ для тестирования. Параллельно
          можно изучить{" "}
          <Link href="/api/v1/docs" className="text-purple-400 hover:text-purple-300 underline">
            OpenAPI-документацию
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Ваше имя</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            placeholder="Имя"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Агентство / компания</label>
          <input
            type="text"
            required
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            placeholder="Название агентства"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">Email или Telegram</label>
        <input
          type="text"
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
          placeholder="you@agency.ru или @username"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">Какой тариф интересует</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as "read" | "pro" | "enterprise")}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur-md focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
        >
          <option value="read">Read (Free)</option>
          <option value="pro">Pro ($99/мес · оплата в ₽)</option>
          <option value="enterprise">Enterprise (custom)</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Какие ниши интересуют (опционально)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 resize-none"
          placeholder="Психология, юриспруденция, медицина..."
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="group relative w-full rounded-2xl px-8 py-4 text-lg font-semibold text-white overflow-hidden transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-600" />
        <span className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-violet-600 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
        <span className="relative">{submitting ? "Отправка..." : "Получить ключ"}</span>
      </button>
      <p className="text-xs text-center text-gray-500">
        Pro и Enterprise сейчас в beta — выдаём ключи вручную после короткого созвона
      </p>
    </form>
  );
}

export default function ForAgenciesPage() {
  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#040714]" />
        <NeuralBackground />
      </div>

      <div className="relative z-10">
        <MarketingHeader />

        {/* ===== HERO ===== */}
        <section className="min-h-[85vh] flex items-center justify-center">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-5 py-2 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-purple-400" />
                </span>
                <span className="text-sm font-medium text-purple-300">Knowledge API · для SEO-агентств</span>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <h1 className="mt-10 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
                <span className="text-purple-400 [text-shadow:_0_0_40px_rgba(168,85,247,0.5),_0_0_80px_rgba(168,85,247,0.2)]">
                  Карта слепых зон AI
                </span>
                <br />
                <span className="text-white">для агентств</span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-300 leading-relaxed">
                JSON-эндпоинты с реальными данными: какие вопросы в нише клиента
                нейросети отвечают плохо, какой объём спроса, каких маркеров
                качества ответа не хватает.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-300 leading-relaxed">
                Готовые данные для GEO/AIO-аудитов и контент-планов — без
                ручных опросов ChatGPT, Perplexity, YandexGPT и GigaChat.
              </p>
            </FadeIn>

            <FadeIn delay={450}>
              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#form"
                  className="group relative rounded-2xl px-10 py-4 text-lg font-semibold text-white overflow-hidden transition-all hover:scale-105 border border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl" />
                  <span className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
                  <span className="relative">Получить ключ</span>
                </a>
                <Link
                  href="/api/v1/docs"
                  className="rounded-2xl border border-purple-400/30 bg-white/5 px-10 py-4 text-lg font-semibold text-white backdrop-blur-md hover:bg-white/10 hover:border-purple-400/60 transition-all"
                >
                  OpenAPI-документация
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ===== ПРОБЛЕМЫ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Знакомые проблемы агентства?
              </h2>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {PROBLEMS.map((p, i) => (
                <FadeIn key={p.title} delay={i * 150}>
                  <div className="relative h-full rounded-3xl border border-red-500/15 bg-[#04080f]/60 p-8 backdrop-blur-xl hover:border-red-400/30 transition-all overflow-hidden">
                    <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-red-400/30 to-transparent" />
                    <span className="text-4xl">{p.icon}</span>
                    <h3 className="mt-4 text-xl font-semibold text-white">{p.title}</h3>
                    <p className="mt-3 text-gray-400 leading-relaxed">{p.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ВОЗМОЖНОСТИ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Что внутри Knowledge API</h2>
              <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
                Данные собираются ежедневно из Wordstat + Яндекс Кью + 4 AI-платформ. Готовое сырьё
                для GEO/AIO-аудитов клиента.
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((b, i) => (
                <FadeIn key={b.title} delay={i * 100}>
                  <div
                    className={`relative h-full rounded-3xl border bg-[#04080f]/60 p-8 backdrop-blur-xl transition-all overflow-hidden ${
                      b.color === "violet"
                        ? "border-violet-500/20 hover:border-violet-400/40"
                        : "border-purple-500/20 hover:border-purple-400/40"
                    }`}
                  >
                    <div
                      className={`absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent to-transparent ${
                        b.color === "violet" ? "via-violet-400/30" : "via-purple-400/30"
                      }`}
                    />
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                        b.color === "violet"
                          ? "bg-violet-500/15 border-violet-500/25"
                          : "bg-purple-500/15 border-purple-500/25"
                      }`}
                    >
                      <span className="text-2xl">{b.icon}</span>
                    </div>
                    <h3
                      className={`mt-4 text-lg font-semibold ${
                        b.color === "violet" ? "text-violet-300" : "text-purple-300"
                      }`}
                    >
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">{b.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== USE CASES ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Сырые данные из API</h2>
              <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
                Что возвращает /blind-spots — структура ответа и поля по 3 примерным нишам
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {USE_CASES.map((c, i) => (
                <FadeIn key={c.niche} delay={i * 150}>
                  <div className={`relative h-full rounded-3xl border bg-gradient-to-br ${c.color} p-8 backdrop-blur-xl overflow-hidden`}>
                    <div className="text-sm font-medium text-purple-300 mb-2">{c.niche}</div>
                    <div className="text-5xl font-bold text-white tracking-tight">{c.metric}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{c.metricLabel}</div>
                    <p className="mt-6 text-sm text-gray-300 leading-relaxed">{c.insight}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CODE SAMPLE ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-5xl px-6">
            <FadeIn className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Один cURL — карта на месяц</h2>
              <p className="mt-4 text-gray-400 max-w-xl mx-auto">
                Bearer-токен, JSON, без обёрток. Совместимо с любым стеком.
              </p>
            </FadeIn>

            <FadeIn>
              <div className="rounded-3xl border border-purple-500/20 bg-[#04080f]/80 backdrop-blur-xl overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/5 px-6 py-3">
                  <span className="h-3 w-3 rounded-full bg-red-400/60" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <span className="h-3 w-3 rounded-full bg-green-400/60" />
                  <span className="ml-3 text-xs text-gray-500 font-mono">terminal · curl</span>
                </div>
                <pre className="px-6 py-5 text-sm text-gray-300 font-mono overflow-x-auto leading-relaxed">
                  <code>{CODE_SAMPLE}</code>
                </pre>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ===== ТАРИФЫ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Тарифы Knowledge API</h2>
              <p className="mt-4 text-gray-400 max-w-xl mx-auto">
                Read бесплатно навсегда. Pro и Enterprise — beta, выдаём вручную после короткого созвона.
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {PLANS.map((plan, i) => (
                <FadeIn key={plan.name} delay={i * 100}>
                  <div
                    className={`relative h-full rounded-3xl border p-8 backdrop-blur-xl overflow-hidden flex flex-col ${
                      plan.highlight
                        ? "border-purple-500/30 bg-purple-500/5 shadow-[0_0_30px_rgba(168,85,247,0.08)]"
                        : "border-white/10 bg-[#04080f]/60"
                    }`}
                  >
                    {plan.highlight && (
                      <>
                        <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
                        <div className="absolute top-4 right-4 rounded-full bg-purple-500/20 border border-purple-500/30 px-3 py-1 text-xs font-medium text-purple-300">
                          Популярный
                        </div>
                      </>
                    )}

                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{plan.desc}</p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-purple-400">{plan.price}</span>
                      {plan.period && <span className="text-gray-500">{plan.period}</span>}
                    </div>
                    {plan.priceNote && (
                      <div className="mt-1 text-xs text-gray-500">{plan.priceNote}</div>
                    )}
                    <div className="mt-2 text-xs text-purple-300/70 uppercase tracking-wider">{plan.limit}</div>

                    <ul className="mt-6 space-y-3 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-purple-400 flex-shrink-0 mt-0.5">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <a
                      href="#form"
                      className={`mt-8 block w-full rounded-2xl py-3 text-center font-semibold transition-all ${
                        plan.highlight
                          ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:opacity-90"
                          : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {plan.cta}
                    </a>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ФОРМА ЗАЯВКИ ===== */}
        <section id="form" className="py-24">
          <div className="mx-auto max-w-2xl px-6">
            <FadeIn>
              <div className="rounded-3xl border border-purple-500/20 bg-[#04080f]/60 p-10 backdrop-blur-xl overflow-hidden relative">
                <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
                <h2 className="text-2xl font-bold text-white text-center mb-2">Получить ключ</h2>
                <p className="text-gray-400 text-center mb-8">
                  Read-ключ выдаём сразу после регистрации. Pro/Enterprise — после короткого созвона.
                </p>
                <AgencyLeadForm />
              </div>
            </FadeIn>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </div>
  );
}
