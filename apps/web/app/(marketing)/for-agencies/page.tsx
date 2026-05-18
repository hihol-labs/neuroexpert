"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { FadeIn } from "@/components/marketing/fade-in";

const PROBLEMS = [
  {
    icon: "🕵️",
    title: "Клиент хочет заявки, а не отчёт про нейросети",
    desc: "SEO/GEO звучит модно, но клиент спрашивает проще: какие вопросы уже задают мои покупатели и как из них получить обращения?",
  },
  {
    icon: "🌑",
    title: "Классические трекеры не показывают карту спроса",
    desc: "Позиции по семантике есть, но не видно, где нейросети отвечают без клиента, где есть коммерческое намерение и какие страницы запускать первыми.",
  },
  {
    icon: "📞",
    title: "Сложно обосновать чек на новый канал",
    desc: "Нужны не общие слова, а цифры: вопрос, спрос в месяц, намерение клиента, балл слабости ответа, целевое действие и прогнозируемый путь к заявке.",
  },
];

const FEATURES = [
  {
    icon: "🎯",
    title: "Карта возможностей спроса",
    desc: "Список вопросов в нише: спрос в месяц, намерение клиента, оценка возможности, балл слабости ответа нейросети и рекомендуемое целевое действие.",
    color: "blue",
  },
  {
    icon: "📊",
    title: "Реальный спрос",
    desc: "Спрос в месяц из Wordstat и похожие запросы. Ранжируйте контент-план клиента по реальному поисковому объёму, а не интуиции.",
    color: "sky",
  },
  {
    icon: "✅",
    title: "Готовые экспертные страницы",
    desc: "В тарифах Pro+ — полные ответы: структура для поиска, короткое резюме, FAQ, цитаты, аудио и лицензия с указанием источника. Источник для клиентских страниц и брифов.",
    color: "blue",
  },
  {
    icon: "🤖",
    title: "Проверка 4 нейросетевых платформ",
    desc: "ChatGPT + YandexGPT + Perplexity + GigaChat. Для каждого вопроса — реальный ответ нейросети и разбор, почему клиент сейчас не попадает в ответ.",
    color: "sky",
  },
  {
    icon: "🔌",
    title: "REST + OpenAPI 3.0",
    desc: "Bearer auth, JSON-only, документация по стандарту OpenAPI. Простая интеграция в любой ваш дашборд / Bitrix / Google Sheets через Apps Script.",
    color: "blue",
  },
  {
    icon: "🇷🇺",
    title: "Российские источники",
    desc: "Wordstat, Яндекс Кью, YandexGPT, GigaChat — данные релевантны рунету, не американскому SERP. Без VPN, без обхода блокировок, законно.",
    color: "sky",
  },
];

const USE_CASES = [
  {
    niche: "Психология",
    metric: "слабость",
    metricLabel: "0–10 по каждому вопросу",
    insight: "Запрос /blind-spots?niche=psychology возвращает вопросы со спросом, намерением клиента, слабостью ответа нейросети и целевым действием. Из списка собирается контент-план страниц под заявки.",
    color: "bg-blue-50 border-blue-500/30",
  },
  {
    niche: "Юриспруденция",
    metric: "TAM",
    metricLabel: "считается на стороне агентства",
    insight: "Запрос /blind-spots?niche=legal отдаёт спрос в месяц и оценку возможности по каждому вопросу. Ваша формула оценки даёт потенциал лидогенерации.",
    color: "bg-blue-50 border-sky-500/30",
  },
  {
    niche: "Медицина",
    metric: "4 платформы",
    metricLabel: "ChatGPT · Perplexity · YandexGPT · GigaChat",
    insight: "По каждому вопросу — проверка всех 4 нейросетевых платформ и разбор слабости ответа. Видно, где пациенту нужен конкретный врач, клиника или первичная запись, а в ответе только общий текст.",
    color: "bg-blue-50 border-blue-500/30",
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
      "GET /questions — вопросы + маркеры слабых ответов",
      "Без требований к указанию источника",
    ],
    cta: "Получить ключ →",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/мес",
    priceNote: "≈ 9 000 ₽/мес · оплата в рублях по курсу ЦБ",
    desc: "Карта спроса + полные ответы",
    limit: "1 000 запросов/час",
    features: [
      "Всё из Read",
      "GET /blind-spots — карта возможностей спроса",
      "GET /answers — полные статьи + аудио + цитаты",
      "Лицензия: коммерческое использование с указанием источника",
      "Email-поддержка ≤ 24 ч",
    ],
    cta: "Запросить Pro →",
    highlight: true,
  },
  {
    name: "Индивидуальный",
    price: "По запросу",
    period: "",
    desc: "Индивидуальные лимиты, SLA, слой под вашим брендом",
    limit: "Без лимитов",
    features: [
      "Всё из Pro",
      "Webhook на новые возможности спроса в нише",
      "Слой под вашим брендом: ответы без указания источника по договору",
      "SLA 99.9%, выделенный канал связи",
      "Персональный менеджер",
    ],
    cta: "Обсудить →",
    highlight: false,
  },
];

const CODE_SAMPLE = `# Найти возможности спроса в нише психологии
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
      "weakness_summary": "Нейросеть отвечает абстрактно, без конкретного эксперта и источников",
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
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-slate-950 mb-2">Заявка получена</h3>
        <p className="text-slate-600">
          Свяжемся в течение 24 часов и выдадим ключ для тестирования. Параллельно
          можно изучить{" "}
          <Link href="/api/v1/docs" className="text-blue-700 hover:text-blue-700 underline">
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
          <label className="mb-2 block text-sm font-medium text-slate-700">Ваше имя</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500  focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            placeholder="Имя"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Агентство / компания</label>
          <input
            type="text"
            required
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500  focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            placeholder="Название агентства"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Email или Telegram</label>
        <input
          type="text"
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500  focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          placeholder="you@agency.ru или @username"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Какой тариф интересует</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as "read" | "pro" | "enterprise")}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950  focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        >
          <option value="read">Read (Free)</option>
          <option value="pro">Pro ($99/мес · оплата в ₽)</option>
          <option value="enterprise">Enterprise (custom)</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Какие ниши интересуют (опционально)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-gray-500  focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none"
          placeholder="Психология, юриспруденция, медицина..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-blue-700 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
      >
        {submitting ? "Отправка..." : "Получить ключ"}
      </button>
      <p className="text-xs text-center text-slate-500">
        Pro и Enterprise сейчас в beta — выдаём ключи вручную после короткого созвона
      </p>
    </form>
  );
}

export default function ForAgenciesPage() {
  return (
    <>
      <MarketingHeader />

        {/* ===== HERO ===== */}
        <section className="flex min-h-[calc(100dvh-69px)] items-center justify-center sm:min-h-[85vh]">
          <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-20">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-sm font-medium text-blue-700">API спроса для агентств</span>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <h1 className="mt-8 text-3xl font-bold tracking-tight leading-[1.1] sm:mt-10 sm:text-6xl lg:text-7xl">
                <span className="text-blue-700 ">
                  Карта спроса
                </span>
                <br />
                <span className="text-slate-950">для агентств</span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="mx-auto mt-6 max-w-2xl text-base text-slate-700 leading-relaxed sm:mt-8 sm:text-lg">
                API с реальными данными: какие вопросы люди задают
                в нише клиента, где поиск и нейросети отвечают слабо, какой
                там спрос и какое целевое действие вести к заявке.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-700 leading-relaxed sm:text-lg">
                Данные для SEO/GEO-аудитов, контент-планов и управляемых программ
                лидогенерации клиентов без ручных опросов нейросетевых платформ.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500 leading-relaxed">
                Важно: для конечного бизнеса мы продаём систему локальных продаж и запуск канала привлечения клиентов.
                Для агентств — данные, API и слой под вашим брендом, который можно встроить
                в собственные аудиты и клиентские кабинеты.
              </p>
            </FadeIn>

            <FadeIn delay={450}>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:mt-12 sm:flex-row sm:gap-4">
                <a
                  href="#form"
                  className="rounded-xl bg-blue-700 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-blue-800 sm:rounded-2xl sm:px-10 sm:py-4 sm:text-lg"
                >
                  Получить ключ
                </a>
                <Link
                  href="/for-business"
                  className="rounded-xl border border-blue-400/30 bg-white px-6 py-3.5 text-base font-semibold text-slate-950 hover:border-blue-400/60 hover:bg-slate-100 sm:rounded-2xl sm:px-10 sm:py-4 sm:text-lg transition-all"
                >
                  Для конечного бизнеса
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ===== ПРОБЛЕМЫ ===== */}
        <section className="py-14 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">
                Знакомые проблемы агентства?
              </h2>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {PROBLEMS.map((p, i) => (
                <FadeIn key={p.title} delay={i * 150}>
                  <div className="relative h-full rounded-2xl border border-red-100 bg-white p-5 transition-all hover:border-red-200 hover:shadow-sm sm:rounded-3xl sm:p-8">
                    <span className="text-4xl">{p.icon}</span>
                    <h3 className="mt-4 text-xl font-semibold text-slate-950">{p.title}</h3>
                    <p className="mt-3 text-slate-600 leading-relaxed">{p.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ВОЗМОЖНОСТИ ===== */}
        <section className="py-14 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">Что внутри API спроса</h2>
              <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
                Данные собираются ежедневно из Wordstat + Яндекс Кью + 4 нейросетевых платформ. Готовое сырьё
                для SEO/GEO-аудитов, брифов и страниц под заявки.
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((b, i) => (
                <FadeIn key={b.title} delay={i * 100}>
                  <div
                    className={`relative h-full rounded-2xl border bg-white p-5 transition-all hover:shadow-sm sm:rounded-3xl sm:p-8 ${
                      b.color === "sky"
                        ? "border-sky-500/20 hover:border-sky-400/40"
                        : "border-blue-500/20 hover:border-blue-400/40"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                        b.color === "sky"
                          ? "bg-sky-500/15 border-sky-500/25"
                          : "bg-blue-500/15 border-blue-500/25"
                      }`}
                    >
                      <span className="text-2xl">{b.icon}</span>
                    </div>
                    <h3
                      className={`mt-4 text-lg font-semibold ${
                        b.color === "sky" ? "text-blue-700" : "text-blue-700"
                      }`}
                    >
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{b.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== USE CASES ===== */}
        <section className="py-14 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">Сырые данные из API</h2>
              <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
                Что возвращает /blind-spots — структура ответа для карты спроса по 3 примерным нишам
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {USE_CASES.map((c, i) => (
                <FadeIn key={c.niche} delay={i * 150}>
                  <div className={`relative h-full rounded-2xl ${c.color} p-5 sm:rounded-3xl sm:p-8`}>
                    <div className="text-sm font-medium text-blue-700 mb-2">{c.niche}</div>
                    <div className="text-3xl font-bold text-slate-950 tracking-tight sm:text-5xl">{c.metric}</div>
                    <div className="text-xs text-slate-600 uppercase tracking-wider mt-1">{c.metricLabel}</div>
                    <p className="mt-6 text-sm text-slate-700 leading-relaxed">{c.insight}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CODE SAMPLE ===== */}
        <section className="py-14 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <FadeIn className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">Один cURL — карта спроса на месяц</h2>
              <p className="mt-4 text-slate-600 max-w-xl mx-auto">
                Bearer-токен, JSON, без обёрток. Совместимо с любым стеком.
              </p>
            </FadeIn>

            <FadeIn>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 sm:px-6">
                  <span className="h-3 w-3 rounded-full bg-red-400/60" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <span className="h-3 w-3 rounded-full bg-green-400/60" />
                  <span className="ml-3 text-xs text-slate-500 font-mono">terminal · curl</span>
                </div>
                <pre className="overflow-x-auto px-4 py-4 text-xs leading-relaxed text-slate-700 font-mono sm:px-6 sm:py-5 sm:text-sm">
                  <code>{CODE_SAMPLE}</code>
                </pre>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ===== ТАРИФЫ ===== */}
        <section className="py-14 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">Тарифы API спроса</h2>
              <p className="mt-4 text-slate-600 max-w-xl mx-auto">
                Read бесплатно навсегда. Pro и индивидуальный тариф — тестовый запуск, выдаём вручную после короткого созвона.
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {PLANS.map((plan, i) => (
                <FadeIn key={plan.name} delay={i * 100}>
                  <div
                    className={`relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 sm:rounded-3xl sm:p-8 ${
                      plan.highlight
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {plan.highlight && (
                      <>
                        <div className="absolute top-4 right-4 rounded-full bg-white border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700">
                          Популярный
                        </div>
                      </>
                    )}

                    <h3 className="text-2xl font-bold text-slate-950">{plan.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{plan.desc}</p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-blue-700 sm:text-4xl">{plan.price}</span>
                      {plan.period && <span className="text-slate-500">{plan.period}</span>}
                    </div>
                    {plan.priceNote && (
                      <div className="mt-1 text-xs text-slate-500">{plan.priceNote}</div>
                    )}
                    <div className="mt-2 text-xs text-blue-700/70 uppercase tracking-wider">{plan.limit}</div>

                    <ul className="mt-6 space-y-3 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-blue-700 flex-shrink-0 mt-0.5">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <a
                      href="#form"
                      className={`mt-8 block w-full rounded-2xl py-3 text-center font-semibold transition-all ${
                        plan.highlight
                          ? "bg-blue-700 text-white hover:bg-blue-800"
                          : "border border-slate-300 bg-white text-slate-950 hover:bg-slate-100"
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
        <section id="form" className="py-14 sm:py-24">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <FadeIn>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-10">
                <h2 className="text-2xl font-bold text-slate-950 text-center mb-2">Получить ключ</h2>
                <p className="text-slate-600 text-center mb-8">
                  Read-ключ выдаём сразу после регистрации. Pro/Enterprise — после короткого созвона.
                </p>
                <AgencyLeadForm />
              </div>
            </FadeIn>
          </div>
        </section>

        <MarketingFooter />
    </>
  );
}
