"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, LayoutDashboard, Search, TrendingUp, Users } from "lucide-react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { FadeIn } from "@/components/marketing/fade-in";
import {
  LocalSalesAuditMockup,
  RevenueCalculatorMockup,
  SevenDayResultPanel,
} from "@/components/marketing/product-mockups";

const ALL_NICHES = [
  { Icon: Building2, name: "Стоматологии", focus: true },
  { Icon: Building2, name: "Косметологии", focus: true },
  { Icon: Building2, name: "Салоны красоты", focus: true },
  { Icon: Building2, name: "Автосервисы", focus: true },
  { Icon: Building2, name: "Юрфирмы", focus: true },
  { Icon: Users, name: "Медцентры", focus: false },
  { Icon: Users, name: "Детские центры", focus: false },
  { Icon: Users, name: "Логопеды", focus: false },
  { Icon: Users, name: "Психологи", focus: false },
  { Icon: Users, name: "Ремонт квартир", focus: false },
  { Icon: Users, name: "Клининг", focus: false },
  { Icon: Users, name: "Кондиционеры", focus: false },
  { Icon: Users, name: "Окна и двери", focus: false },
  { Icon: Users, name: "Образование", focus: false },
  { Icon: Users, name: "Фитнес", focus: false },
];

const STEPS = [
  { num: "01", title: "Находим спрос и потери", desc: "Смотрим поиск, карты, Авито, отзывы, сайт, звонки и нейросети. Видно, где клиент не доходит до заявки или выбирает конкурента.", Icon: Search },
  { num: "02", title: "Запускаем точки входа", desc: "Упаковываем карточки, страницы, FAQ, CTA, отзывы и экспертные ответы под реальные вопросы людей.", Icon: LayoutDashboard },
  { num: "03", title: "Доводим до продаж", desc: "Даём ежедневные задачи, возвращаем потерянные лиды и считаем трафик, клики, обращения, записи и повторные касания.", Icon: TrendingUp },
];

const STATS = [
  { value: "2 входа", label: "Solo для экспертов и Local Sales OS для бизнеса" },
  { value: "5 модулей", label: "видимость, конкуренты, задачи, отзывы и потерянные лиды" },
  { value: "30 дней", label: "на запуск первых точек входа и измеримых сигналов" },
];

const PRODUCT_ROUTES = [
  {
    title: "Business / Local Sales OS",
    desc: "Для локального бизнеса: аудит видимости, гео-рейтинг, ежедневные задачи, отзывы и возврат потерянных лидов.",
    href: "/for-business",
    cta: "Для бизнеса",
    accent: "cyan",
  },
  {
    title: "Solo / НейроЭксперт",
    desc: "Для индивидуальных экспертов: реальные вопросы людей, голосовые ответы, SEO/AIO-страницы и кнопка записи.",
    href: "/for-experts",
    cta: "Для эксперта",
    accent: "purple",
  },
];

const LOCAL_MODULES = [
  { title: "Аудит видимости", desc: "Яндекс Карты, 2ГИС, Авито, VK, сайт, Telegram, отзывы и формы." },
  { title: "Гео и AI-рейтинг", desc: "Позиции по запросам рядом, цена, срочно, AI-ответы и конкуренты." },
  { title: "Ежедневные задачи", desc: "Что добавить, исправить, поднять, ответить и опубликовать сегодня." },
  { title: "Отзывы", desc: "Сбор положительных отзывов и перехват негатива до публичной публикации." },
  { title: "Потерянные лиды", desc: "Пропущенные звонки, сообщения без ответа и клиенты без follow-up." },
];

const CLIENT_CHANNELS = [
  { title: "Поиск", desc: "Страницы под вопросы, услуги, цены, районы и сравнения, где клиент уже выбирает решение." },
  { title: "Карты и 2ГИС", desc: "Карточки, услуги, фото, рейтинг, отзывы, кнопки звонка, маршрута и записи." },
  { title: "Авито и соцсети", desc: "Профили, объявления, офферы, доказательства работ и понятные CTA." },
  { title: "Нейросети", desc: "Проверяем, кого ChatGPT, Алиса, Perplexity и другие системы называют вместо вас." },
  { title: "Входящие обращения", desc: "Звонки, формы, мессенджеры, скорость ответа, follow-up и возврат старых клиентов." },
  { title: "Экспертные страницы", desc: "Голосовые ответы превращаются в страницы с кнопкой записи, заявки или консультации." },
];

const RESULT_SIGNALS = [
  "где бизнес или эксперт сейчас не виден",
  "кто забирает спрос и почему",
  "какие точки входа нужно запустить первыми",
  "какие действия делать сегодня и на этой неделе",
  "какие клики, обращения, записи и заявки появились",
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
        <section className="min-h-[92vh]">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <FadeIn>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-5 py-2 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative h-2 w-2 rounded-full bg-cyan-400" />
                  </span>
                  <span className="text-sm font-medium text-cyan-200">Local Sales OS + НейроЭксперт Solo</span>
                </div>
              </FadeIn>

              <FadeIn delay={150}>
                <h1 className="mt-8 max-w-3xl text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
                  Найдём, где бизнес теряет клиентов, и запустим рост продаж
                </h1>
              </FadeIn>

              <FadeIn delay={300}>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
                  Показываем не абстрактную “AI-видимость”, а конкретные точки потерь:
                  карты, 2ГИС, Авито, отзывы, AI-ответы, звонки, переписки,
                  конкурентов и задачи, которые двигают заявки.
                </p>
              </FadeIn>

              <FadeIn delay={420}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/for-business"
                    className="rounded-2xl bg-cyan-300 px-8 py-4 text-base font-semibold text-slate-950 transition-colors hover:bg-cyan-200"
                  >
                    Получить Local Sales Audit
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
                  >
                    Как это работает
                  </Link>
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  Для Solo-экспертов: карта спроса, голосовые ответы, страницы и заявки.
                </p>
              </FadeIn>
            </div>

            <FadeIn delay={260}>
              <LocalSalesAuditMockup />
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
                Главная цель — новые обращения, записи и продажи. Видимость в нейросетях усиливает канал, но не заменяет коммерческий результат.
              </p>
            </div>
          </div>
        </section>

        {/* ===== PLATFORM STATS ===== */}
        <PlatformStatsSection />

        {/* ===== КАНАЛЫ КЛИЕНТОВ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Где появляется и где теряется клиентский поток
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-400">
                Мы соединяем каналы, которые обычно живут отдельно: поиск,
                карты, отзывы, Авито, нейросети, страницы и входящие обращения.
                Так становится видно не только “сколько заявок пришло”, но и где
                продажи уже проседают.
              </p>
            </FadeIn>

            <div className="grid gap-4 md:grid-cols-3">
              {CLIENT_CHANNELS.map((channel, i) => (
                <FadeIn key={channel.title} delay={i * 60}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                    <h3 className="text-base font-semibold text-white">{channel.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">{channel.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={400} className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
              <p className="text-sm font-semibold text-cyan-200">Что показываем в результате</p>
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {RESULT_SIGNALS.map((signal) => (
                  <div key={signal} className="rounded-xl border border-white/10 bg-[#04080f]/60 p-4 text-sm text-gray-300">
                    {signal}
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ===== ПРИМЕР ОТЧЁТА ===== */}
        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-[1.2fr_0.8fr]">
            <FadeIn>
              <SevenDayResultPanel />
            </FadeIn>
            <FadeIn delay={140}>
              <RevenueCalculatorMockup />
            </FadeIn>
          </div>
        </section>

        {/* ===== ПРОДУКТЫ И МОДУЛИ ===== */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Два входа в одну систему привлечения
              </h2>
              <p className="mt-4 text-gray-400 max-w-xl mx-auto">
                B2B-канал становится главным коммерческим слоем, а Solo-эксперты
                остаются источником контента, данных и органического роста.
              </p>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2">
              {PRODUCT_ROUTES.map((route, i) => (
                <FadeIn key={route.title} delay={(i + 1) * 100}>
                  <div className={`relative h-full rounded-3xl border bg-[#04080f]/60 p-8 backdrop-blur-xl transition-all overflow-hidden ${
                    route.accent === "cyan"
                      ? "border-cyan-500/25 hover:border-cyan-400/45"
                      : "border-purple-500/25 hover:border-purple-400/45"
                  }`}>
                    <div className={`absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent to-transparent ${
                      route.accent === "cyan" ? "via-cyan-400/50" : "via-purple-400/50"
                    }`} />
                    <p className={`text-sm font-semibold ${
                      route.accent === "cyan" ? "text-cyan-300" : "text-purple-300"
                    }`}>
                      {route.title}
                    </p>
                    <p className="mt-4 text-gray-300 leading-relaxed">{route.desc}</p>
                    <Link
                      href={route.href}
                      className={`mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all ${
                        route.accent === "cyan"
                          ? "bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                          : "bg-purple-500/15 text-purple-100 hover:bg-purple-500/25"
                      }`}
                    >
                      {route.cta}
                    </Link>
                  </div>
                </FadeIn>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {LOCAL_MODULES.map((module, i) => (
                <FadeIn key={module.title} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                    <h3 className="text-sm font-semibold text-white">{module.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">{module.desc}</p>
                  </div>
                </FadeIn>
              ))}
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
                      <step.Icon className="h-4 w-4" /> Шаг {step.num}
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
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Для какого бизнеса</h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-400">
                Лучше всего работает там, где клиент ищет рядом, сравнивает отзывы,
                смотрит карточку компании и быстро выбирает, кому оставить заявку.
              </p>
              <p className="mt-2 text-sm text-gray-500">Для индивидуальных специалистов остаётся отдельный вход — НейроЭксперт Solo.</p>
            </FadeIn>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {ALL_NICHES.map((niche, i) => (
                <FadeIn key={niche.name} delay={Math.min(i * 30, 400)}>
                  <div className={`group rounded-2xl border p-4 text-center backdrop-blur-xl transition-all hover:scale-105 cursor-default ${
                    niche.focus
                      ? "border-cyan-500/25 bg-cyan-500/10 hover:border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.08)]"
                      : "border-white/10 bg-[#04080f]/50 hover:border-cyan-500/20 hover:bg-cyan-500/5"
                  }`}>
                    <niche.Icon className={`mx-auto h-6 w-6 transition-transform group-hover:scale-110 ${niche.focus ? "text-cyan-300" : "text-gray-500"}`} />
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
                  Узнайте, где ваш бизнес теряет заявки
                </h2>
                <p className="mt-4 text-gray-400">
                  Аудит видимости покажет слабые места в картах, поиске, Авито,
                  отзывах, нейросетях и обработке входящих обращений.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/for-business"
                    className="group relative rounded-2xl px-10 py-4 text-lg font-semibold text-white overflow-hidden transition-transform hover:scale-105"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
                    <span className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 blur-xl opacity-40 group-hover:opacity-70 transition-opacity" />
                    <span className="relative">Получить аудит видимости</span>
                  </Link>
                  <Link
                    href="/launch"
                    className="rounded-2xl border border-white/15 bg-white/5 px-10 py-4 text-lg font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition-all"
                  >
                    Запуск под ключ
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
