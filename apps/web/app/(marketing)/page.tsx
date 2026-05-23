import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Baby,
  Brush,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Home,
  MapPinned,
  PhoneMissed,
  Scale,
  Scissors,
  Search,
  Sparkles,
  Star,
  Stethoscope,
  TrendingUp,
  Wind,
  Wrench,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { FadeIn } from "@/components/marketing/fade-in";
import {
  LocalSalesAuditMockup,
  RevenueCalculatorMockup,
  SevenDayResultPanel,
} from "@/components/marketing/product-mockups";
import { generateServiceSchema } from "@/lib/schema-org";
import { MARKETING_OS_TOOLS } from "shared";

type Card = {
  title: string;
  desc: string;
  icon: LucideIcon;
};

const routeCards = [
  {
    label: "Для бизнеса",
    title: "Новые клиенты из локальных каналов",
    desc: "Карты, 2ГИС, Авито, отзывы, сайт, страницы под локальный спрос, ответы нейросетей, звонки и переписки превращаются в план действий для роста продаж.",
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

const lossCards: Card[] = [
  {
    title: "Больше обращений из карт",
    desc: "Усиливаем карточки, услуги, цены, фото, отзывы и оффер там, где клиент выбирает компанию рядом.",
    icon: MapPinned,
  },
  {
    title: "Больше доверия перед обращением",
    desc: "Показываем, какие отзывы, FAQ, доказательства и формулировки помогают человеку обратиться именно к вам.",
    icon: Star,
  },
  {
    title: "Больше клиентов из поиска и нейросетей",
    desc: "Создаём страницы под услуги, районы, цены и вопросы клиентов, чтобы бизнес находили не только в картах.",
    icon: FileText,
  },
  {
    title: "Задачи из поведения клиентов",
    desc: "Если страницу смотрят, но не звонят, или кликают по телефону без продажи, система показывает, что исправить.",
    icon: BarChart3,
  },
  {
    title: "Больше продаж из уже пришедших лидов",
    desc: "Помогаем возвращать пропущенные звонки, долгие ответы, забытые переписки и клиентов без повторного касания.",
    icon: PhoneMissed,
  },
  {
    title: "Понятный план на каждый день",
    desc: "Владелец видит, что сделать сегодня: обновить услугу, ответить на отзыв, усилить страницу или вернуть клиента.",
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
    title: "Выбираем точки роста",
    desc: "Показываем, какие каналы, услуги и формулировки быстрее всего могут дать новые обращения.",
    icon: BarChart3,
  },
  {
    title: "Собираем страницы под спрос",
    desc: "Услуги, районы, FAQ, отзывы и понятный призыв к действию превращаются в страницы для поиска и нейросетей.",
    icon: FileText,
  },
  {
    title: "Смотрим поведение клиентов",
    desc: "Просмотры, клики, формы, звонки и повторяющиеся вопросы превращаются в понятные задачи.",
    icon: BarChart3,
  },
  {
    title: "Запускаем рост",
    desc: "Исправляем карточки, отзывы, страницы, офферы, повторные касания и ежедневные задачи.",
    icon: TrendingUp,
  },
];

const antiSeoCards: Card[] = [
  {
    title: "Сначала спрос",
    desc: "Страница создаётся только когда есть запрос, понятное намерение клиента, услуга и следующий шаг.",
    icon: Search,
  },
  {
    title: "Не текст, а точка входа",
    desc: "На странице должны быть ответ, доказательства, FAQ, цена или диапазон и кнопка звонка, записи или заявки.",
    icon: FileText,
  },
  {
    title: "Меряем путь до действия",
    desc: "Смотрим не количество страниц, а индексацию, показы, клики, CTA, заявки и обработку обращения.",
    icon: BarChart3,
  },
  {
    title: "Через 2-4 недели решаем",
    desc: "Страницу оставляем, усиливаем, объединяем или убираем. Слабые страницы не копятся ради отчёта.",
    icon: ClipboardCheck,
  },
];

const marketingOsTools = MARKETING_OS_TOOLS.filter((tool) =>
  ["skills", "voice_extractor", "aeo_ai_seo", "competitor_profiling", "cro_audit", "scheduled_tasks"].includes(tool.key),
);

const niches = [
  { name: "Стоматологии", icon: Stethoscope, point: "запись на консультацию" },
  { name: "Косметологии", icon: Sparkles, point: "пакеты процедур" },
  { name: "Салоны красоты", icon: Scissors, point: "первый визит" },
  { name: "Автосервисы", icon: Wrench, point: "срочные заявки" },
  { name: "Юридические фирмы", icon: Scale, point: "первичный разбор" },
  { name: "Медцентры", icon: HeartPulse, point: "диагностика и запись" },
  { name: "Детские центры", icon: Baby, point: "пробное занятие" },
  { name: "Ремонт квартир", icon: Home, point: "расчёт сметы" },
  { name: "Клининг", icon: Brush, point: "заказ уборки" },
  { name: "Окна и кондиционеры", icon: Wind, point: "замер и выезд" },
];

export default function LandingPage() {
  const schemas = [
    generateServiceSchema({
      name: "НейроЭксперт",
      description:
        "Платформа для привлечения клиентов из карт, поиска, отзывов и ответов нейросетей.",
      url: APP_URL,
      serviceType: "AI and search visibility SaaS",
      offers: [
        { name: "Для бизнеса", url: `${APP_URL}/for-business` },
        { name: "Для эксперта", url: `${APP_URL}/for-experts` },
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
                SaaS-платформа привлечения клиентов
              </div>
            </FadeIn>

            <FadeIn delay={120}>
              <h1 className="mt-6 max-w-3xl text-3xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:mt-7 sm:text-5xl lg:text-6xl">
                Поможем получать больше клиентов из карт, поиска, отзывов и AI
              </h1>
            </FadeIn>

            <FadeIn delay={240}>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-700 sm:mt-6 sm:text-lg">
                НейроЭксперт показывает, какие каналы уже могут приводить клиентов,
                что мешает клиенту выбрать вас, какие страницы под спрос стоит
                запустить, что показывает поведение клиентов и какие действия
                быстрее всего двигают записи, обращения и продажи.
              </p>
            </FadeIn>

            <FadeIn delay={360}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/for-business"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  Посмотреть, как привлекаем клиентов
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

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
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

      <section className="border-y border-blue-100 bg-blue-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeIn className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold text-blue-700">Что получает клиент</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Понятно, откуда придут клиенты и что делать первым
            </h2>
            <p className="mt-4 text-slate-600">
              В центре интерфейса не красивые обещания, а рабочие вещи:
              каналы привлечения, конкуренты, отзывы, задачи, обращения и план продаж.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lossCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <FadeIn key={card.title} delay={index * 70}>
                  <div className="h-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-blue-700 ring-1 ring-blue-100">
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

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <FadeIn>
            <SevenDayResultPanel />
          </FadeIn>
          <FadeIn delay={140}>
            <RevenueCalculatorMockup />
          </FadeIn>
        </div>
      </section>

      <section className="border-y border-emerald-100 bg-emerald-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeIn className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold text-emerald-700">Практический процесс</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Не отчёт ради отчёта, а план привлечения клиентов
            </h2>
            <p className="mt-4 text-slate-600">
              Каждый шаг должен отвечать на простой вопрос собственника:
              что сделать сейчас, чтобы получить больше обращений и продаж.
            </p>
          </FadeIn>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <FadeIn key={step.title} delay={index * 120}>
                  <div className="h-full rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <Icon className="h-5 w-5 text-emerald-700" />
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
              Посмотреть механику работы
              <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      <section className="border-y border-indigo-100 bg-indigo-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeIn className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-sm font-semibold text-indigo-700">Marketing OS</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Внутри платформы теперь не набор промптов, а повторяемые workflow
            </h2>
            <p className="mt-4 text-slate-600">
              Методики для голоса эксперта, AEO, конкурентов, CRO и регулярных отчётов
              фиксируются как исполняемый слой с обязательной проверкой человеком.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {marketingOsTools.map((tool, index) => (
              <FadeIn key={tool.key} delay={index * 70}>
                <div className="h-full rounded-lg border border-indigo-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
                    этап {tool.stage}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">{tool.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{tool.platformEffect}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeIn className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-sm font-semibold text-blue-700">Не SEO ради SEO</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Страница считается полезной только если ведёт к действию клиента
            </h2>
            <p className="mt-4 text-slate-600">
              НейроЭксперт не продаёт пачку текстов или обещание топа. Мы строим контур:
              спрос, страница, CTA, измерение, заявка или задача на улучшение.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {antiSeoCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <FadeIn key={card.title} delay={index * 80}>
                  <div className="h-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeIn className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-sm font-semibold text-blue-700">Для кого особенно полезно</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Для бизнесов, где клиент выбирает быстро и сравнивает рядом
            </h2>
            <p className="mt-4 text-slate-600">
              В каждой нише свои причины обратиться: цена, сроки, отзывы,
              срочность, консультация, рассрочка, выезд или понятный первый шаг.
            </p>
          </FadeIn>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            {niches.map(({ name, icon: Icon, point }, index) => (
              <FadeIn key={name} delay={Math.min(index * 40, 320)}>
                <div className="h-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{point}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-700 py-14 text-white sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <FadeIn>
            <h2 className="text-2xl font-bold sm:text-3xl">Получите план привлечения клиентов на 30 дней</h2>
            <p className="mx-auto mt-4 max-w-2xl text-blue-50">
              Покажем, какие каналы стоит усилить первыми, какие конкуренты
              забирают спрос и какие действия могут быстрее привести новые обращения.
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
