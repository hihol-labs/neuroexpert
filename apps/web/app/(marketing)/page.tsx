"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { NeuralBackground } from "@/components/marketing/neural-bg";

const ALL_NICHES = [
  { icon: "🧠", name: "Психология", focus: true },
  { icon: "⚖️", name: "Юриспруденция", focus: true },
  { icon: "🥗", name: "Нутрициология", focus: true },
  { icon: "💰", name: "Финансы", focus: true },
  { icon: "📊", name: "Бизнес-консалтинг", focus: true },
  { icon: "🏥", name: "Медицина", focus: false },
  { icon: "💪", name: "Фитнес и спорт", focus: false },
  { icon: "📚", name: "Образование", focus: false },
  { icon: "📱", name: "Маркетинг и SMM", focus: false },
  { icon: "💻", name: "IT и программирование", focus: false },
  { icon: "🎨", name: "Дизайн и архитектура", focus: false },
  { icon: "🏠", name: "Недвижимость", focus: false },
  { icon: "👔", name: "Карьера и HR", focus: false },
  { icon: "✨", name: "Косметология", focus: false },
  { icon: "🗣️", name: "Логопедия", focus: false },
  { icon: "🎯", name: "Коучинг", focus: false },
  { icon: "🧮", name: "Бухгалтерия и аудит", focus: false },
  { icon: "🐾", name: "Ветеринария", focus: false },
  { icon: "🛡️", name: "Страхование", focus: false },
  { icon: "✈️", name: "Туризм", focus: false },
];

const STEPS = [
  { num: "01", title: "Находим вопрос", desc: "Анализируем тысячи запросов, где нейросети дают слабые ответы — без экспертов, без конкретики.", icon: "🔍" },
  { num: "02", title: "Наговариваете ответ", desc: "Получаете заказ в Telegram. Наговариваете 3-10 минут голосом. Мы создаём 5 форматов контента.", icon: "🎙️" },
  { num: "03", title: "Получаете клиентов", desc: "Публикуем экспертную статью. Нейросети цитируют вас, поисковики ранжируют.", icon: "🚀" },
];

const STATS = [
  { value: "500K+", label: "экспертов в РФ ищут клиентов" },
  { value: "86%", label: "профессионалов используют AI" },
  { value: "0", label: "аналогов в России" },
];

function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => { el.style.opacity = "1"; el.style.transform = "translateY(0)"; }, delay); obs.unobserve(el); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={className} style={{ opacity: 0, transform: "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}>{children}</div>;
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      {/* FIXED background: neural network */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#04080f]" />
        <NeuralBackground />
      </div>

      {/* Scrollable content */}
      <div className="relative z-10">
        <MarketingHeader />

        {/* ===== HERO ===== */}
        <section className="min-h-[92vh] flex items-center justify-center">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <span className="text-sm font-medium text-cyan-300">AI-платформа для экспертов</span>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <h1 className="mt-10 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
                <span className="text-white">Наговори 10 минут —</span>
                <br />
                <span className="text-cyan-400 [text-shadow:_0_0_40px_rgba(34,211,238,0.5),_0_0_80px_rgba(34,211,238,0.2)]">
                  получи клиентов
                </span>
                <br />
                <span className="text-white">из поиска и нейросетей</span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-300 leading-relaxed">
                Без написания текстов, без SMM, без бюджета на рекламу.
                Мы находим вопросы, которые задают тысячи людей.
                Превращаем ваш голос в экспертный контент.
              </p>
            </FadeIn>

            <FadeIn delay={450}>
              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/audit"
                  className="group relative rounded-2xl px-10 py-4 text-lg font-semibold text-white overflow-hidden transition-transform hover:scale-105"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl" />
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
                  <span className="relative">Бесплатный аудит AI-видимости</span>
                </Link>
                <Link
                  href="/register"
                  className="rounded-2xl border border-white/15 bg-white/5 px-10 py-4 text-lg font-semibold text-white backdrop-blur-md hover:bg-white/10 hover:border-white/25 transition-all"
                >
                  Регистрация
                </Link>
              </div>
            </FadeIn>

          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className="py-12">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-3xl border border-white/10 bg-[#04080f]/60 p-8 backdrop-blur-xl">
              <div className="grid gap-8 md:grid-cols-3">
                {STATS.map((s, i) => (
                  <FadeIn key={s.value} delay={i * 100} className="text-center">
                    <div className="text-4xl font-bold text-cyan-400 [text-shadow:_0_0_20px_rgba(34,211,238,0.4)]">
                      {s.value}
                    </div>
                    <p className="mt-2 text-sm text-gray-400">{s.label}</p>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== ДВА КАНАЛА ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Два канала привлечения клиентов
              </h2>
              <p className="mt-4 text-gray-400 max-w-xl mx-auto">
                Одно действие — два результата
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2">
              <FadeIn delay={100}>
                <div className="relative h-full rounded-3xl border border-purple-500/20 bg-[#04080f]/60 p-8 backdrop-blur-xl hover:border-purple-400/40 transition-all group overflow-hidden">
                  <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/25 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-purple-300">Нейросети цитируют вас</h3>
                  <p className="mt-3 text-gray-400 leading-relaxed">
                    ChatGPT, Perplexity, YandexGPT находят ваш экспертный контент
                    и рекомендуют вас в ответах на вопросы пользователей.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["ChatGPT", "Perplexity", "YandexGPT", "GigaChat"].map((n) => (
                      <span key={n} className="rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs text-purple-300">{n}</span>
                    ))}
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={200}>
                <div className="relative h-full rounded-3xl border border-cyan-500/20 bg-[#04080f]/60 p-8 backdrop-blur-xl hover:border-cyan-400/40 transition-all group overflow-hidden">
                  <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/25 shadow-[0_0_25px_rgba(34,211,238,0.2)]">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-cyan-300">Поисковики ранжируют вас</h3>
                  <p className="mt-3 text-gray-400 leading-relaxed">
                    Google и Яндекс показывают ваши статьи в топе
                    благодаря SEO-оптимизации, Schema.org и E-E-A-T.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["Google", "Яндекс", "Bing", "Schema.org"].map((n) => (
                      <span key={n} className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs text-cyan-300">{n}</span>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ===== 3 ШАГА ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Как это работает</h2>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <FadeIn key={step.num} delay={i * 150}>
                  <div className="relative h-full rounded-3xl border border-white/10 bg-[#04080f]/60 p-8 backdrop-blur-xl hover:border-cyan-500/20 transition-all overflow-hidden">
                    <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                      <span>{step.icon}</span> Шаг {step.num}
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-3 text-gray-400 leading-relaxed">{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={500} className="mt-10 text-center">
              <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                Подробнее о платформе
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </FadeIn>
          </div>
        </section>

        {/* ===== ДЛЯ КОГО ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Для каких экспертов</h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-400">
                Платформа для практикующих специалистов, которые хотят клиентов
                без ведения соцсетей и бюджета на рекламу.
              </p>
            </FadeIn>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {ALL_NICHES.map((niche, i) => (
                <FadeIn key={niche.name} delay={Math.min(i * 30, 400)}>
                  <div className={`group rounded-2xl border p-4 text-center backdrop-blur-xl transition-all hover:scale-105 cursor-default ${
                    niche.focus
                      ? "border-cyan-500/25 bg-cyan-500/10 hover:border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.08)]"
                      : "border-white/10 bg-[#04080f]/50 hover:border-cyan-500/20 hover:bg-cyan-500/5"
                  }`}>
                    <span className="text-2xl group-hover:scale-110 inline-block transition-transform">{niche.icon}</span>
                    <h3 className={`mt-2 text-sm font-semibold ${niche.focus ? "text-cyan-300" : "text-gray-400"}`}>{niche.name}</h3>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-3xl px-6">
            <FadeIn>
              <div className="rounded-3xl border border-cyan-500/20 bg-[#04080f]/60 p-12 backdrop-blur-xl text-center overflow-hidden relative">
                <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                <h2 className="text-3xl font-bold text-white">
                  Узнайте, как AI видит вашу нишу
                </h2>
                <p className="mt-4 text-gray-400">
                  Бесплатный аудит покажет вопросы с максимальным спросом и слабыми ответами нейросетей.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/audit"
                    className="group relative rounded-2xl px-10 py-4 text-lg font-semibold text-white overflow-hidden transition-transform hover:scale-105"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
                    <span className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 blur-xl opacity-40 group-hover:opacity-70 transition-opacity" />
                    <span className="relative">Узнать свои точки роста</span>
                  </Link>
                  <Link
                    href="/for-experts"
                    className="rounded-2xl border border-white/15 bg-white/5 px-10 py-4 text-lg font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition-all"
                  >
                    Зачем это эксперту
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </div>
  );
}
