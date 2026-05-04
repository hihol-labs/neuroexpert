"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { FadeIn } from "@/components/marketing/fade-in";

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
  { num: "01", title: "Находим спрос", desc: "Собираем реальные вопросы людей, оцениваем частотность, намерение и шанс получить заявку.", icon: "🔍" },
  { num: "02", title: "Вы отвечаете голосом", desc: "Наговариваете 3-10 минут. Мы сохраняем вашу экспертизу и превращаем ответ в страницу под конкретный спрос.", icon: "🎙️" },
  { num: "03", title: "Страница приводит заявки", desc: "Публикуем материал с SEO, AI-разметкой и кнопкой записи. Дальше измеряем трафик, клики и заявки.", icon: "🚀" },
];

const STATS = [
  { value: "20", label: "ниш для поиска реального спроса" },
  { value: "10 мин", label: "достаточно для первого экспертного ответа" },
  { value: "1 вопрос", label: "одна страница под конкретную заявку" },
];

function PlatformStatsSection() {
  const [stats, setStats] = useState<{ experts: number; articles: number; citations: number; niches: number } | null>(null);

  useEffect(() => {
    fetch("/api/platform-stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats || (stats.experts === 0 && stats.articles === 0)) return null;

  const items = [
    { value: stats.experts, label: "экспертов на платформе" },
    { value: stats.articles, label: "опубликованных статей" },
    { value: stats.citations, label: "AI-упоминаний" },
    { value: stats.niches, label: "профессиональных ниш" },
  ].filter((s) => s.value > 0);

  if (items.length === 0) return null;

  return (
    <section className="py-8">
      <div className="mx-auto max-w-4xl px-6">
        <div className="rounded-3xl border border-purple-500/15 bg-[#04080f]/60 p-6 backdrop-blur-xl">
          <p className="text-center text-xs text-gray-500 uppercase tracking-wider mb-4">Платформа в цифрах</p>
          <div className={`grid gap-6 ${items.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
            {items.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-purple-400 [text-shadow:_0_0_20px_rgba(168,85,247,0.4)]">
                  {s.value.toLocaleString("ru-RU")}
                </div>
                <p className="mt-1 text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
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
                <span className="text-sm font-medium text-cyan-300">Карта спроса для экспертов</span>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <h1 className="mt-10 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
                <span className="text-white">Найдём вопросы,</span>
                <br />
                <span className="text-cyan-400 [text-shadow:_0_0_40px_rgba(34,211,238,0.5),_0_0_80px_rgba(34,211,238,0.2)]">
                  по которым люди
                </span>
                <br />
                <span className="text-white">уже ищут эксперта</span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-300 leading-relaxed">
                Вы не придумываете темы для контента. Мы показываем, где уже есть спрос,
                превращаем ваш голос в экспертную страницу и ставим на неё кнопку записи.
              </p>
            </FadeIn>

            <FadeIn delay={450}>
              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/audit"
                  className="group relative rounded-2xl px-10 py-4 text-lg font-semibold text-white overflow-hidden transition-all hover:scale-105 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)]"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl" />
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
                  <span className="relative">Получить карту спроса</span>
                </Link>
                <Link
                  href="/launch"
                  className="rounded-2xl border border-cyan-400/30 bg-white/5 px-10 py-4 text-lg font-semibold text-white backdrop-blur-md shadow-[0_0_10px_rgba(34,211,238,0.15)] hover:bg-white/10 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all"
                >
                  Запуск под ключ
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
              <p className="mt-6 text-center text-xs text-gray-500">
                Сначала спрос и заявки. AI-упоминания — дополнительный канал, а не единственное обещание.
              </p>
            </div>
          </div>
        </section>

        {/* ===== PLATFORM STATS ===== */}
        <PlatformStatsSection />

        {/* ===== ДВА КАНАЛА ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Один спрос — несколько путей к заявке
              </h2>
              <p className="mt-4 text-gray-400 max-w-xl mx-auto">
                Каждая страница закрывает конкретный вопрос пользователя
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2">
              <FadeIn delay={100}>
                <div className="relative h-full rounded-3xl border border-purple-500/20 bg-[#04080f]/60 p-8 backdrop-blur-xl hover:border-purple-400/40 transition-all group overflow-hidden">
                  <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/25 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-purple-300">AI-поиск может привести вас в ответ</h3>
                  <p className="mt-3 text-gray-400 leading-relaxed">
                    Мы проверяем, как ChatGPT, Perplexity, YandexGPT и GigaChat отвечают на вопрос,
                    и создаём страницу, которую им проще понять и использовать как источник.
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
                  <h3 className="mt-5 text-xl font-semibold text-cyan-300">Поиск приводит людей на страницу записи</h3>
                  <p className="mt-3 text-gray-400 leading-relaxed">
                    Яндекс и Google получают страницу под реальный вопрос: с понятным ответом,
                    структурой, Schema.org и кнопкой «Записаться».
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
              <p className="mt-2 text-sm text-gray-500">От 1 до 10 ниш по тарифу. Начните бесплатно с одной.</p>
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
                  Узнайте, где в вашей нише уже есть спрос
                </h2>
                <p className="mt-4 text-gray-400">
                  Бесплатная карта спроса покажет вопросы, по которым люди уже ищут решение,
                  и темы, из которых стоит делать первые страницы для заявок.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/audit"
                    className="group relative rounded-2xl px-10 py-4 text-lg font-semibold text-white overflow-hidden transition-transform hover:scale-105"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
                    <span className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 blur-xl opacity-40 group-hover:opacity-70 transition-opacity" />
                    <span className="relative">Получить карту спроса</span>
                  </Link>
                  <Link
                    href="/for-experts"
                    className="rounded-2xl border border-white/15 bg-white/5 px-10 py-4 text-lg font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition-all"
                  >
                    Как это приводит заявки
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <MarketingFooter />
    </>
  );
}
