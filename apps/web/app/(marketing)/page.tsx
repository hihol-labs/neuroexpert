"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardCheck,
  MapPinned,
  PhoneMissed,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { FadeIn } from "@/components/marketing/fade-in";
import {
  LocalSalesAuditMockup,
  RevenueCalculatorMockup,
  SevenDayResultPanel,
} from "@/components/marketing/product-mockups";

type Card = {
  title: string;
  desc: string;
  icon: LucideIcon;
};

const routeCards = [
  {
    label: "Для бизнеса",
    title: "Найдём, где теряются клиенты",
    desc: "Карты, 2ГИС, Авито, отзывы, сайт, нейросети, звонки и переписки собираются в понятную карту потерь и задач.",
    href: "/for-business",
    action: "Сценарий для бизнеса",
    accent: "emerald",
  },
  {
    label: "Для эксперта",
    title: "Превратим спрос в страницы и запись",
    desc: "Система находит вопросы людей, помогает записать экспертный ответ и публикует страницу с кнопкой записи.",
    href: "/for-experts",
    action: "Сценарий для эксперта",
    accent: "cyan",
  },
];

const lossCards: Card[] = [
  {
    title: "Клиент видит конкурента раньше",
    desc: "Проверяем карты, локальную выдачу, отзывы, Авито и ответы нейросетей по коммерческим запросам.",
    icon: MapPinned,
  },
  {
    title: "Карточки не убеждают",
    desc: "Находим пустые услуги, слабые фото, отсутствие цен, устаревшие отзывы и непродающие описания.",
    icon: Star,
  },
  {
    title: "Обращения не доходят до продажи",
    desc: "Смотрим пропущенные звонки, долгие ответы, забытые переписки и клиентов без повторного касания.",
    icon: PhoneMissed,
  },
  {
    title: "Нет ежедневного плана",
    desc: "Вместо общего отчёта владелец получает конкретные задачи: что исправить сегодня и что измерить через неделю.",
    icon: ClipboardCheck,
  },
];

const steps: Card[] = [
  {
    title: "Собираем точки входа",
    desc: "Смотрим, где клиент выбирает: поиск, карты, отзывы, объявления, нейросети, формы, звонки и мессенджеры.",
    icon: Search,
  },
  {
    title: "Считаем потери",
    desc: "Показываем, где бизнес не виден, где сильнее конкурент и сколько выручки может быть под риском.",
    icon: BarChart3,
  },
  {
    title: "Запускаем рост",
    desc: "Исправляем карточки, отзывы, страницы, офферы, повторные касания и ежедневно ведём список действий.",
    icon: TrendingUp,
  },
];

const niches = [
  "Стоматологии",
  "Косметологии",
  "Салоны красоты",
  "Автосервисы",
  "Юридические фирмы",
  "Медцентры",
  "Детские центры",
  "Ремонт квартир",
  "Клининг",
  "Окна и кондиционеры",
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
    { value: stats.experts, label: "экспертов" },
    { value: stats.articles, label: "публичных страниц" },
    { value: stats.citations, label: "упоминаний в нейросетях" },
    { value: stats.niches, label: "ниш" },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <section className="py-8">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-3xl border border-white/10 bg-[#101715]/75 p-6 backdrop-blur-xl">
          <p className="text-center text-xs uppercase tracking-[0.18em] text-gray-500">Платформа в цифрах</p>
          <div className={`mt-5 grid gap-6 ${items.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
            {items.map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-3xl font-bold text-emerald-300">
                  {item.value.toLocaleString("ru-RU")}
                </div>
                <p className="mt-1 text-xs text-gray-400">{item.label}</p>
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

      <section className="min-h-[88vh]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-2 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                <span className="text-sm font-medium text-emerald-200">
                  Клиенты из поиска, карт, отзывов и нейросетей
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={120}>
              <h1 className="mt-8 max-w-3xl text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
                Найдём, где бизнес теряет клиентов, и запустим рост продаж
              </h1>
            </FadeIn>

            <FadeIn delay={240}>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
                НейроЭксперт показывает конкретные точки потерь: слабые карточки,
                конкурентов в выдаче, ответы нейросетей, пропущенные обращения
                и действия, которые влияют на заявки, записи и выручку.
              </p>
            </FadeIn>

            <FadeIn delay={360}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/for-business"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-8 py-4 text-base font-semibold text-[#07100e] transition-colors hover:bg-emerald-200"
                >
                  Получить аудит продаж
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
                >
                  Как это работает
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Для индивидуальных экспертов есть отдельный сценарий: спрос, голосовой ответ, страница и запись.
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={240}>
            <LocalSalesAuditMockup />
          </FadeIn>
        </div>
      </section>

      <PlatformStatsSection />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 md:grid-cols-2">
            {routeCards.map((route, index) => (
              <FadeIn key={route.title} delay={index * 100}>
                <Link
                  href={route.href}
                  className={`group block h-full rounded-3xl border bg-[#101715]/75 p-7 backdrop-blur-xl transition ${
                    route.accent === "emerald"
                      ? "border-emerald-300/20 hover:border-emerald-300/45"
                      : "border-cyan-300/20 hover:border-cyan-300/45"
                  }`}
                >
                  <p className={route.accent === "emerald" ? "text-sm font-semibold text-emerald-300" : "text-sm font-semibold text-cyan-300"}>
                    {route.label}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-white">{route.title}</h2>
                  <p className="mt-3 leading-relaxed text-gray-400">{route.desc}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
                    {route.action}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold text-emerald-300">Главная мысль</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Мы понимаем, где теряются деньги
            </h2>
            <p className="mt-4 text-gray-400">
              Дизайн и продуктовая логика теперь строятся вокруг карты потерь:
              где клиент не увидел бизнес, где поверил конкуренту, где не получил ответ
              и какие действия возвращают поток обращений.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {lossCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <FadeIn key={card.title} delay={index * 70}>
                  <div className="h-full rounded-2xl border border-white/10 bg-[#101715]/75 p-5 backdrop-blur-xl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200 ring-1 ring-emerald-300/20">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">{card.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

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

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold text-emerald-300">Практический процесс</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Не отчёт ради отчёта, а путь к продажам
            </h2>
          </FadeIn>

          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <FadeIn key={step.title} delay={index * 120}>
                  <div className="h-full rounded-3xl border border-white/10 bg-[#101715]/75 p-7 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300 text-sm font-bold text-[#07100e]">
                        {index + 1}
                      </span>
                      <Icon className="h-5 w-5 text-emerald-300" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-3 leading-relaxed text-gray-400">{step.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn delay={460} className="mt-10 text-center">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition-colors hover:text-emerald-200">
              Разобрать оба сценария
              <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-sm font-semibold text-emerald-300">Для кого особенно полезно</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Там, где клиент выбирает быстро и сравнивает рядом
            </h2>
          </FadeIn>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            {niches.map((niche, index) => (
              <FadeIn key={niche} delay={Math.min(index * 40, 320)}>
                <div className="rounded-2xl border border-white/10 bg-[#101715]/70 p-4 text-center backdrop-blur-xl transition hover:border-emerald-300/30">
                  <Building2 className="mx-auto h-5 w-5 text-emerald-300" />
                  <p className="mt-2 text-sm font-medium text-gray-300">{niche}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <FadeIn>
            <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.08] p-10 text-center backdrop-blur-xl">
              <h2 className="text-3xl font-bold text-white">
                Узнайте, где ваш бизнес теряет клиентов
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-300">
                Первый шаг — аудит продаж: карта потерь, сравнение с конкурентами,
                задачи на неделю и оценка обращений, которые ещё можно вернуть.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/for-business"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-8 py-4 text-base font-semibold text-[#07100e] transition-colors hover:bg-emerald-200"
                >
                  Получить аудит продаж
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/launch"
                  className="rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
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
