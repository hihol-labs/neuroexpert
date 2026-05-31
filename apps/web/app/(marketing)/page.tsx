import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Search,
  TrendingUp,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { FadeIn } from "@/components/marketing/fade-in";
import { generateServiceSchema } from "@/lib/schema-org";

type Card = {
  title: string;
  desc: string;
  icon: LucideIcon;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

const steps: Card[] = [
  {
    title: "Находим спрос",
    desc: "Поиск, карты, отзывы, объявления, нейросети, формы, звонки и мессенджеры показывают, где уже есть намерение клиента.",
    icon: Search,
  },
  {
    title: "Собираем точку входа",
    desc: "Карточка, страница, FAQ, отзыв, оффер или повторное касание становятся понятным маршрутом к обращению.",
    icon: BarChart3,
  },
  {
    title: "Доводим до действия",
    desc: "У клиента есть следующий шаг: звонок, запись, заявка, маршрут, вопрос в мессенджере или повторный контакт.",
    icon: FileText,
  },
  {
    title: "Измеряем заявку или потерю",
    desc: "Смотрим показы, клики, формы, звонки, заявки и причины, почему интерес не стал продажей.",
    icon: BarChart3,
  },
  {
    title: "Запускаем рост",
    desc: "Исправляем карточки, отзывы, страницы, офферы, повторные касания и ежедневные задачи.",
    icon: TrendingUp,
  },
];

function HeroOutcomePanel() {
  return (
    <div className="rounded-lg border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">Local Sales OS</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">План роста на сегодня</h2>
        </div>
        <div className="rounded-md bg-blue-50 px-3 py-2 text-right">
          <p className="text-xs font-medium text-blue-700">цель</p>
          <p className="text-sm font-bold text-slate-950">заявки</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {[
          ["Спрос", "люди ищут услугу рядом и сравнивают цену"],
          ["Точка входа", "карточка, страница услуги, FAQ и отзывы"],
          ["Действие", "звонок, запись, заявка или повторный контакт"],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-2 rounded-md bg-slate-50 p-3 sm:grid-cols-[110px_1fr]">
            <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-800">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-800">Следующее действие клиента</p>
        <p className="mt-1 text-2xl font-bold text-slate-950">заявка / запись / продажа</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const schemas = [
    generateServiceSchema({
      name: "НейроЭксперт",
      description:
        "Local Sales OS для привлечения клиентов из карт, поиска, отзывов и ответов нейросетей.",
      url: APP_URL,
      serviceType: "Local sales and demand generation SaaS",
      offers: [
        { name: "Local Sales OS для бизнеса", url: `${APP_URL}/for-business` },
        { name: "Отдельная ветка для экспертов", url: `${APP_URL}/for-experts` },
        { name: "Тарифы", url: `${APP_URL}/pricing` },
      ],
    }),
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <MarketingHeader />

      <section className="border-b border-blue-100 bg-blue-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800 shadow-sm sm:px-4">
                Local Sales OS для локального бизнеса
              </div>
            </FadeIn>

            <FadeIn delay={120}>
              <h1 className="mt-6 max-w-3xl text-3xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:mt-7 sm:text-5xl lg:text-6xl">
                Превращаем спрос в заявки, записи и продажи
              </h1>
            </FadeIn>

            <FadeIn delay={240}>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-700 sm:mt-6 sm:text-lg">
                НейроЭксперт показывает, где локальный бизнес теряет обращения,
                какие точки входа стоит усилить и какие действия быстрее всего
                двигают результат. Формула простая: спрос → точка входа →
                действие клиента → заявка, запись или продажа.
              </p>
            </FadeIn>

            <FadeIn delay={360}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/for-business"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  Получить аудит Local Sales OS
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/launch"
                  className="rounded-md border border-slate-300 bg-white px-7 py-3.5 text-center text-base font-semibold text-slate-950 transition-colors hover:bg-slate-100"
                >
                  Запуск под ключ
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Для индивидуальных экспертов есть отдельная ветка: спрос → экспертный ответ → страница → запись.
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={240}>
            <HeroOutcomePanel />
          </FadeIn>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <FadeIn>
              <Link
                href="/for-business"
                className="group block h-full rounded-lg border border-blue-200 bg-blue-50 p-7 shadow-sm transition hover:border-blue-300 hover:bg-blue-100/70"
              >
                <p className="text-sm font-semibold text-blue-700">Основной сценарий</p>
                <h2 className="mt-3 text-2xl font-bold text-slate-950">
                  Local Sales OS для бизнеса, где клиент выбирает рядом и быстро
                </h2>
                <p className="mt-3 leading-relaxed text-slate-700">
                  Карты, 2ГИС, Авито, отзывы, сайт, AI-ответы, звонки и переписки
                  собираются в одну систему: спрос → точка входа → действие клиента →
                  заявка, запись или продажа.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                  Сценарий для бизнеса
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </FadeIn>
            <FadeIn delay={120}>
              <Link
                href="/for-experts"
                className="group block h-full rounded-lg border border-slate-200 bg-white p-7 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-500">Отдельная ветка</p>
                <h2 className="mt-3 text-xl font-bold text-slate-950">
                  Для экспертов
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Помогаем превратить голосовой экспертный ответ в страницу,
                  которая ведёт человека к записи или консультации.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                  Подробнее
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="border-y border-emerald-100 bg-emerald-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeIn className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold text-emerald-700">Практический процесс</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Одна формула вместо набора разрозненных инструментов
            </h2>
            <p className="mt-4 text-slate-600">
              Спрос → точка входа → действие клиента → заявка, запись или продажа.
              Каждый шаг должен отвечать собственнику, что сделать сейчас.
            </p>
          </FadeIn>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <FadeIn key={step.title} delay={index * 120}>
                  <div className="h-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <Icon className="h-5 w-5 text-emerald-700" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn delay={460} className="mt-10 text-center">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900">
              Посмотреть механику работы
              <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      <section className="bg-blue-700 py-14 text-white sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <FadeIn>
            <h2 className="text-2xl font-bold sm:text-3xl">Получите план по формуле спрос → заявка</h2>
            <p className="mx-auto mt-4 max-w-2xl text-blue-50">
              Покажем, где есть спрос, какую точку входа усилить, какое действие
              должен сделать клиент и как довести это до заявки, записи или продажи.
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
