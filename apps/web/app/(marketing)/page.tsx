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
    title: "Панель потерь и задач",
    desc: "Карты, 2ГИС, Авито, отзывы, сайт, AI-ответы, звонки и переписки собираются в управленческую панель.",
    href: "/for-business",
    action: "Сценарий для бизнеса",
  },
  {
    label: "Для эксперта",
    title: "Карта спроса и страницы",
    desc: "Система находит вопросы людей, помогает записать экспертный ответ и публикует страницу с кнопкой записи.",
    href: "/for-experts",
    action: "Сценарий для эксперта",
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
    desc: "Владелец получает конкретные задачи: что исправить сегодня и что измерить через неделю.",
    icon: ClipboardCheck,
  },
];

const steps: Card[] = [
  {
    title: "Собираем точки входа",
    desc: "Поиск, карты, отзывы, объявления, нейросети, формы, звонки и мессенджеры.",
    icon: Search,
  },
  {
    title: "Считаем потери",
    desc: "Показываем, где бизнес не виден, где сильнее конкурент и сколько выручки под риском.",
    icon: BarChart3,
  },
  {
    title: "Запускаем рост",
    desc: "Исправляем карточки, отзывы, страницы, офферы, повторные касания и ежедневные задачи.",
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
    <section className="border-y border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Платформа в цифрах</p>
        <div className={`mt-5 grid gap-6 ${items.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="text-3xl font-bold text-slate-950">
                {item.value.toLocaleString("ru-RU")}
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <MarketingHeader />

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                SaaS-платформа контроля клиентского потока
              </div>
            </FadeIn>

            <FadeIn delay={120}>
              <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-[1.06] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Найдём, где бизнес теряет клиентов, и запустим рост продаж
              </h1>
            </FadeIn>

            <FadeIn delay={240}>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
                НейроЭксперт показывает конкретные точки потерь: слабые карточки,
                конкурентов в выдаче, ответы нейросетей, пропущенные обращения
                и задачи, которые влияют на заявки, записи и выручку.
              </p>
            </FadeIn>

            <FadeIn delay={360}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/for-business"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Посмотреть панель потерь
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="rounded-md border border-slate-300 bg-white px-7 py-3.5 text-center text-base font-semibold text-slate-950 transition-colors hover:bg-slate-100"
                >
                  Как это работает
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Для индивидуальных экспертов: спрос, голосовой ответ, страница и запись.
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={240}>
            <LocalSalesAuditMockup />
          </FadeIn>
        </div>
      </section>

      <PlatformStatsSection />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 md:grid-cols-2">
            {routeCards.map((route, index) => (
              <FadeIn key={route.title} delay={index * 100}>
                <Link
                  href={route.href}
                  className="group block h-full rounded-lg border border-slate-200 bg-white p-7 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-blue-700">{route.label}</p>
                  <h2 className="mt-3 text-2xl font-bold text-slate-950">{route.title}</h2>
                  <p className="mt-3 leading-relaxed text-slate-600">{route.desc}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                    {route.action}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold text-blue-700">Главная мысль</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Дизайн показывает не магию AI, а контроль денег
            </h2>
            <p className="mt-4 text-slate-600">
              В центре интерфейса: карта потерь, задачи на сегодня,
              потерянная выручка, конкуренты, отзывы и каналы, где клиент уходит.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {lossCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <FadeIn key={card.title} delay={index * 70}>
                  <div className="h-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <FadeIn>
            <SevenDayResultPanel />
          </FadeIn>
          <FadeIn delay={140}>
            <RevenueCalculatorMockup />
          </FadeIn>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold text-blue-700">Практический процесс</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Не презентация, а операционный контур продаж
            </h2>
          </FadeIn>

          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <FadeIn key={step.title} delay={index * 120}>
                  <div className="h-full rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-slate-950">{step.title}</h3>
                    <p className="mt-3 leading-relaxed text-slate-600">{step.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn delay={460} className="mt-10 text-center">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900">
              Разобрать оба сценария
              <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-sm font-semibold text-blue-700">Для кого особенно полезно</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Там, где клиент выбирает быстро и сравнивает рядом
            </h2>
          </FadeIn>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            {niches.map((niche, index) => (
              <FadeIn key={niche} delay={Math.min(index * 40, 320)}>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <Building2 className="mx-auto h-5 w-5 text-slate-600" />
                  <p className="mt-2 text-sm font-medium text-slate-700">{niche}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold">Узнайте, где ваш бизнес теряет клиентов</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              Первый шаг — аудит продаж: карта потерь, сравнение с конкурентами,
              задачи на неделю и оценка обращений, которые ещё можно вернуть.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/for-business"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-7 py-3.5 text-base font-semibold text-slate-950 transition-colors hover:bg-slate-100"
              >
                Получить аудит продаж
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/launch"
                className="rounded-md border border-white/25 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Запуск под ключ
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
