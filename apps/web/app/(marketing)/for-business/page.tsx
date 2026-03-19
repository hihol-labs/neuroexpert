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
    icon: "🔇",
    title: "AI не знает ваших экспертов",
    desc: "ChatGPT и Perplexity рекомендуют конкурентов, потому что у них есть структурированный контент.",
  },
  {
    icon: "📉",
    title: "Контент-маркетинг не масштабируется",
    desc: "Нанимать копирайтеров для 5-10 экспертов — дорого. Они не знают специфику.",
  },
  {
    icon: "🕳️",
    title: "Клиенты ищут, но не находят вас",
    desc: "Тысячи запросов в вашей нише — с нулевыми экспертными ответами в выдаче.",
  },
];

const BENEFITS = [
  {
    icon: "👥",
    title: "Управление командой",
    desc: "Подключите до 5 экспертов и до 10 ниш на тариф Business. Каждый получает персональные заказы и публикации.",
    color: "cyan",
  },
  {
    icon: "📊",
    title: "AI Visibility Scanner",
    desc: "Отслеживайте, как часто нейросети цитируют ваших экспертов. Share of Voice по нише.",
    color: "purple",
  },
  {
    icon: "🏷️",
    title: "Брендированные публикации",
    desc: "Статьи публикуются от имени вашей компании. Логотип, ссылки, контакты.",
    color: "cyan",
  },
  {
    icon: "🔗",
    title: "Интеграция с CRM",
    desc: "Заявки от клиентов автоматически попадают в вашу CRM. Webhook и API.",
    color: "purple",
  },
  {
    icon: "📈",
    title: "Аналитика и отчёты",
    desc: "Trust Score, цитирования, SERP-позиции, конверсия — всё в одном дашборде.",
    color: "cyan",
  },
  {
    icon: "🤝",
    title: "Персональный менеджер",
    desc: "Выделенный менеджер помогает с онбордингом, стратегией контента и оптимизацией.",
    color: "purple",
  },
];

const INDUSTRIES = [
  { icon: "🏥", name: "Клиники и медцентры" },
  { icon: "⚖️", name: "Юридические фирмы" },
  { icon: "🏦", name: "Финансовые компании" },
  { icon: "🎓", name: "Образовательные центры" },
  { icon: "💆", name: "Салоны красоты и клиники" },
  { icon: "🏗️", name: "Строительные компании" },
  { icon: "🐾", name: "Ветеринарные клиники" },
  { icon: "🧘", name: "Wellness и фитнес" },
  { icon: "💼", name: "Консалтинговые компании" },
  { icon: "🛡️", name: "Страховые компании" },
];

const PLANS = [
  {
    name: "Business",
    price: "24 990",
    period: "/мес",
    desc: "Для клиник, юрфирм и команд",
    features: [
      "До 5 экспертов",
      "AI Visibility Scanner",
      "Брендированные публикации",
      "Безлимит контент-пакетов",
      "Все 5 форматов контента",
      "Кросспост в соцсети",
      "Аналитика AI-цитирований",
      "Персональный менеджер",
      "0% комиссия с заявок",
    ],
    cta: "Оставить заявку",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "По запросу",
    period: "",
    desc: "White-label, SLA, API",
    features: [
      "Безлимит экспертов",
      "White-label публикации",
      "Knowledge API доступ",
      "Кастомные интеграции",
      "Выделенная инфраструктура",
      "SLA 99.9%",
      "Приоритетная поддержка",
      "Кастомные отчёты",
      "Обучение команды",
    ],
    cta: "Связаться с нами",
    highlight: false,
  },
];

function B2BLeadForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [experts, setExperts] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !contact.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/b2b-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          contact: contact.trim(),
          experts_count: experts,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка отправки");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-3xl border border-green-500/20 bg-green-500/10 p-8 text-center backdrop-blur-xl">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-white">Заявка отправлена!</h3>
        <p className="mt-3 text-gray-400">
          Мы свяжемся с вами в течение 24 часов.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Имя *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            placeholder="Иван Иванов"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Компания *
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            placeholder="Название компании"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Контакт (Telegram / телефон) *
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            placeholder="@telegram или +7..."
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Кол-во экспертов
          </label>
          <select
            value={experts}
            onChange={(e) => setExperts(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 [&>option]:bg-gray-900"
          >
            <option value="">Выберите...</option>
            <option value="1-3">1-3</option>
            <option value="3-5">3-5</option>
            <option value="5-10">5-10</option>
            <option value="10+">10+</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Расскажите о задаче
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-md focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none"
          placeholder="Какие задачи хотите решить..."
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="group relative w-full rounded-2xl px-8 py-4 text-lg font-semibold text-white overflow-hidden transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
        <span className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
        <span className="relative">
          {submitting ? "Отправка..." : "Оставить заявку"}
        </span>
      </button>
    </form>
  );
}

export default function ForBusinessPage() {
  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#04080f]" />
        <NeuralBackground />
      </div>

      <div className="relative z-10">
        <MarketingHeader />

        {/* ===== HERO ===== */}
        <section className="min-h-[85vh] flex items-center justify-center">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <span className="text-sm font-medium text-cyan-300">
                  Для бизнеса
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <h1 className="mt-10 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
                <span className="text-white">Сделайте экспертов</span>
                <br />
                <span className="text-cyan-400 [text-shadow:_0_0_40px_rgba(34,211,238,0.5),_0_0_80px_rgba(34,211,238,0.2)]">
                  видимыми для AI
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-300 leading-relaxed">
                Клиники, юрфирмы, консалтинговые компании — ваши эксперты
                наговаривают ответы голосом. Мы превращаем их знания в контент,
                который цитируют нейросети и ранжируют поисковики.
              </p>
            </FadeIn>

            <FadeIn delay={450}>
              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#form"
                  className="group relative rounded-2xl px-10 py-4 text-lg font-semibold text-white overflow-hidden transition-all hover:scale-105 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)]"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl" />
                  <span className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
                  <span className="relative">Оставить заявку</span>
                </a>
                <Link
                  href="/audit"
                  className="rounded-2xl border border-cyan-400/30 bg-white/5 px-10 py-4 text-lg font-semibold text-white backdrop-blur-md hover:bg-white/10 hover:border-cyan-400/60 transition-all"
                >
                  Бесплатный аудит
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
                Знакомые проблемы?
              </h2>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {PROBLEMS.map((p, i) => (
                <FadeIn key={p.title} delay={i * 150}>
                  <div className="relative h-full rounded-3xl border border-red-500/15 bg-[#04080f]/60 p-8 backdrop-blur-xl hover:border-red-400/30 transition-all overflow-hidden">
                    <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-red-400/30 to-transparent" />
                    <span className="text-4xl">{p.icon}</span>
                    <h3 className="mt-4 text-xl font-semibold text-white">
                      {p.title}
                    </h3>
                    <p className="mt-3 text-gray-400 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== РЕШЕНИЕ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Что получает бизнес
              </h2>
              <p className="mt-4 text-gray-400 max-w-xl mx-auto">
                Полный цикл: от голоса эксперта до клиента из нейросети
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b, i) => (
                <FadeIn key={b.title} delay={i * 100}>
                  <div
                    className={`relative h-full rounded-3xl border bg-[#04080f]/60 p-8 backdrop-blur-xl transition-all overflow-hidden ${
                      b.color === "purple"
                        ? "border-purple-500/20 hover:border-purple-400/40"
                        : "border-cyan-500/20 hover:border-cyan-400/40"
                    }`}
                  >
                    <div
                      className={`absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent to-transparent ${
                        b.color === "purple"
                          ? "via-purple-400/30"
                          : "via-cyan-400/30"
                      }`}
                    />
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                        b.color === "purple"
                          ? "bg-purple-500/15 border-purple-500/25"
                          : "bg-cyan-500/15 border-cyan-500/25"
                      }`}
                    >
                      <span className="text-2xl">{b.icon}</span>
                    </div>
                    <h3
                      className={`mt-4 text-lg font-semibold ${
                        b.color === "purple"
                          ? "text-purple-300"
                          : "text-cyan-300"
                      }`}
                    >
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ОТРАСЛИ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-5xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Для каких компаний
              </h2>
            </FadeIn>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
              {INDUSTRIES.map((ind, i) => (
                <FadeIn key={ind.name} delay={Math.min(i * 50, 400)}>
                  <div className="rounded-2xl border border-white/10 bg-[#04080f]/50 p-4 text-center backdrop-blur-xl hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all">
                    <span className="text-2xl">{ind.icon}</span>
                    <p className="mt-2 text-xs font-medium text-gray-400">
                      {ind.name}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ТАРИФЫ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-5xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Тарифы для бизнеса
              </h2>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2">
              {PLANS.map((plan, i) => (
                <FadeIn key={plan.name} delay={i * 150}>
                  <div
                    className={`relative rounded-3xl border p-8 backdrop-blur-xl overflow-hidden ${
                      plan.highlight
                        ? "border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_30px_rgba(34,211,238,0.08)]"
                        : "border-white/10 bg-[#04080f]/60"
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                    )}

                    <h3 className="text-2xl font-bold text-white">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{plan.desc}</p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-cyan-400">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-gray-500">{plan.period}</span>
                      )}
                    </div>

                    <ul className="mt-6 space-y-3">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-sm text-gray-300"
                        >
                          <span className="text-cyan-400 flex-shrink-0">
                            ✓
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <a
                      href="#form"
                      className={`mt-8 block w-full rounded-2xl py-3 text-center font-semibold transition-all ${
                        plan.highlight
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90"
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
              <div className="rounded-3xl border border-cyan-500/20 bg-[#04080f]/60 p-10 backdrop-blur-xl overflow-hidden relative">
                <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  Обсудим ваш проект
                </h2>
                <p className="text-gray-400 text-center mb-8">
                  Расскажите о вашей компании — мы подберём решение
                </p>
                <B2BLeadForm />
              </div>
            </FadeIn>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </div>
  );
}
