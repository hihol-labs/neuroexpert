"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  ListChecks,
  MapPinned,
  Megaphone,
  Mic2,
  PhoneMissed,
  Radar,
  Search,
  Star,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import {
  LocalSalesCockpitMockup,
  SevenDayResultPanel,
  SoloDemandSignalMockup,
} from "@/components/marketing/product-mockups";

type Audience = "business" | "expert";

type Step = {
  title: string;
  desc: string;
  icon: LucideIcon;
};

type Module = {
  title: string;
  desc: string;
  icon: LucideIcon;
};

const businessSteps: Step[] = [
  {
    title: "Собираем точки входа",
    desc: "Карты, 2ГИС, Авито, сайт, отзывы, мессенджеры, звонки, формы, конкуренты и ответы нейросетей.",
    icon: Search,
  },
  {
    title: "Находим потери",
    desc: "Показываем, где клиента забирает конкурент, где карточка слабая, где нет ответа и где обращение не вернулось в продажу.",
    icon: MapPinned,
  },
  {
    title: "Превращаем выводы в задачи",
    desc: "Владелец получает не длинный отчёт, а список действий на сегодня: фото, услуги, цены, отзывы, оффер, перезвон.",
    icon: ListChecks,
  },
  {
    title: "Измеряем изменения",
    desc: "Каждую неделю видно, что исправлено, где выросла видимость, какие обращения вернули и где ещё теряются деньги.",
    icon: BarChart3,
  },
];

const businessModules: Module[] = [
  {
    title: "Аудит видимости",
    desc: "Проверяем карточки, сайт, отзывы, Авито, поиск и нейросети: где бизнес выглядит слабее конкурентов.",
    icon: Radar,
  },
  {
    title: "Конкуренты и нейросети",
    desc: "Сравниваем, кого видит клиент в выдаче, кого советуют нейросети и почему алгоритмы чаще доверяют конкурентам.",
    icon: Users,
  },
  {
    title: "Ежедневные задачи",
    desc: "Формируем конкретный план: что добавить, переписать, обновить, кому ответить и кому перезвонить.",
    icon: ClipboardCheck,
  },
  {
    title: "Отзывы и доверие",
    desc: "Помогаем собирать свежие отзывы, снижать публичный негатив и усиливать доверие в местах выбора.",
    icon: Star,
  },
  {
    title: "Потерянные обращения",
    desc: "Находим пропущенные звонки, долгие ответы, забытые переписки и клиентов, которых можно вернуть.",
    icon: PhoneMissed,
  },
];

const expertSteps: Step[] = [
  {
    title: "Находим спрос",
    desc: "Система собирает вопросы людей из поиска, Яндекс Кью, подсказок и ответов нейросетей.",
    icon: Search,
  },
  {
    title: "Выбираем темы ближе к заявке",
    desc: "Отделяем информационные вопросы от тех, где человек уже выбирает специалиста, цену, услугу или формат помощи.",
    icon: TrendingUp,
  },
  {
    title: "Записываем голос эксперта",
    desc: "Эксперт наговаривает ответ в Telegram или на сайте. Содержание остаётся авторским: кейсы, опыт, ограничения, нюансы.",
    icon: Mic2,
  },
  {
    title: "Собираем страницу под вопрос",
    desc: "Из ответа получается страница для поиска и нейросетей: структура, FAQ, таблицы, источники и кнопка записи.",
    icon: FileText,
  },
  {
    title: "Распространяем и измеряем",
    desc: "Страница индексируется, получает первые показы, клики и заявки. Сильные темы обновляются и продвигаются дальше.",
    icon: Megaphone,
  },
];

const expertModules: Module[] = [
  {
    title: "Карта спроса",
    desc: "Показывает темы, которые люди уже ищут, и оценивает шанс на консультацию или запись.",
    icon: Radar,
  },
  {
    title: "Голосовой ответ",
    desc: "Превращает живую речь эксперта в основу материала без потери авторского смысла.",
    icon: Mic2,
  },
  {
    title: "Страница под вопрос",
    desc: "Создаёт публичную страницу, которую могут понять поиск, нейросети и будущий клиент.",
    icon: FileText,
  },
  {
    title: "Публикация",
    desc: "Помогает отдавать страницу поисковикам, добавлять разметку и готовить материалы для каналов.",
    icon: Megaphone,
  },
  {
    title: "Результат",
    desc: "Показывает, какие темы принесли показы, клики, записи и упоминания в нейросетях.",
    icon: BarChart3,
  },
];

const resultRows = [
  ["0-7 дней", "аудит, карта спроса, первые задачи", "понятно, где теряются клиенты"],
  ["7-30 дней", "исправления, страницы, отзывы, возврат обращений", "закрыты быстрые потери"],
  ["30-90 дней", "динамика видимости, клики, заявки, сильные темы", "видно, что усиливать дальше"],
];

function AudienceSwitch({ audience, onChange }: { audience: Audience; onChange: (value: Audience) => void }) {
  return (
    <div className="mx-auto mt-8 grid max-w-xl gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 sm:grid-cols-2">
      {[
        ["business", "Для бизнеса", "карты, отзывы, заявки, продажи"],
        ["expert", "Для эксперта", "спрос, ответы, страницы, запись"],
      ].map(([value, label, hint]) => {
        const active = audience === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value as Audience)}
            className={`rounded-xl px-5 py-4 text-left transition ${
              active
                ? "bg-emerald-300 text-[#08110f] shadow-lg shadow-emerald-950/20"
                : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            <span className="block text-sm font-bold">{label}</span>
            <span className={`mt-1 block text-xs ${active ? "text-[#25433b]" : "text-gray-500"}`}>{hint}</span>
          </button>
        );
      })}
    </div>
  );
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-[64px_1fr]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-300/12 text-emerald-200 ring-1 ring-emerald-300/20">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-600">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="font-semibold text-white">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{step.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModuleGrid({ modules }: { modules: Module[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {modules.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="rounded-2xl border border-white/10 bg-[#101715]/75 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200 ring-1 ring-emerald-300/20">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

function ResultsTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#101715]/70">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-[0.7fr_1.2fr_1fr] gap-4 bg-white/[0.04] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
          <span>Период</span>
          <span>Что делаем</span>
          <span>Что становится видно</span>
        </div>
        {resultRows.map(([period, work, result]) => (
          <div key={period} className="grid grid-cols-[0.7fr_1.2fr_1fr] gap-4 border-t border-white/10 px-5 py-4 text-sm">
            <span className="font-semibold text-white">{period}</span>
            <span className="text-gray-400">{work}</span>
            <span className="text-emerald-100">{result}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  const [audience, setAudience] = useState<Audience>("business");
  const isBusiness = audience === "business";

  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="pb-12 pt-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Два сценария в одном проекте
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Как НейроЭксперт приводит клиентов бизнесу и экспертам
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
            Выберите свой сценарий. Для бизнеса мы показываем, где теряются клиенты и деньги.
            Для эксперта — какие вопросы уже ведут к записи и как превратить опыт в страницы,
            которые находят люди и нейросети.
          </p>
          <AudienceSwitch audience={audience} onChange={setAudience} />
        </div>
      </section>

      {isBusiness ? (
        <>
          <section className="py-14">
            <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold text-emerald-300">Для бизнеса</p>
                <h2 className="mt-3 text-3xl font-bold text-white">Система локальных продаж</h2>
                <p className="mt-4 leading-relaxed text-gray-400">
                  Главная задача — не выдать владельцу ещё один сложный отчёт,
                  а показать конкретные места, где бизнес уже теряет клиентов:
                  видимость, отзывы, конкуренты, нейросети, звонки и переписки.
                </p>
                <div className="mt-7">
                  <StepList steps={businessSteps} />
                </div>
              </div>
              <LocalSalesCockpitMockup />
            </div>
          </section>

          <section className="py-14">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-8 max-w-3xl">
                <p className="text-sm font-semibold text-emerald-300">5 рабочих модулей</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  От видимости до возврата потерянных обращений
                </h2>
              </div>
              <ModuleGrid modules={businessModules} />
            </div>
          </section>

          <section className="py-14">
            <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <SevenDayResultPanel />
              <div className="rounded-2xl border border-white/10 bg-[#101715]/75 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <CircleDollarSign className="h-4 w-4" />
                  Почему это понятно собственнику
                </div>
                <h3 className="mt-3 text-2xl font-bold text-white">
                  Каждый вывод связан с выручкой
                </h3>
                <p className="mt-4 leading-relaxed text-gray-400">
                  Мы не говорим “у вас слабый маркетинг”. Мы показываем:
                  карточка не заполнена, нейросети советуют конкурента,
                  12 обращений не получили повторного контакта, а средний чек
                  превращает это в риск недополученной выручки.
                </p>
                <div className="mt-6 space-y-3">
                  {["где клиент не увидел бизнес", "где клиент выбрал конкурента", "какие обращения можно вернуть"].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-gray-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="py-14">
            <div className="mx-auto max-w-5xl px-6">
              <ResultsTable />
            </div>
          </section>

          <section className="py-16">
            <div className="mx-auto max-w-4xl rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.08] px-6 py-10 text-center">
              <h2 className="text-3xl font-bold text-white">Начните с аудита продаж</h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-300">
                За первые 7 дней станет видно, где бизнес теряет клиентов,
                что исправить первым и какие обращения ещё можно вернуть.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/for-business" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-7 py-3 font-semibold text-[#08110f] transition hover:bg-emerald-200">
                  Посмотреть сценарий для бизнеса
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-7 py-3 font-semibold text-white transition hover:bg-white/[0.06]">
                  Смотреть тарифы
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="py-14">
            <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold text-cyan-300">Для эксперта</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  Спрос превращается в страницу, страница — в заявку
                </h2>
                <p className="mt-4 leading-relaxed text-gray-400">
                  Эксперту не нужно угадывать темы для контента. Система показывает,
                  что люди уже спрашивают, где ответы слабые, и помогает быстро
                  собрать страницу на основе живого экспертного голоса.
                </p>
                <div className="mt-7">
                  <StepList steps={expertSteps} />
                </div>
              </div>
              <SoloDemandSignalMockup />
            </div>
          </section>

          <section className="py-14">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-8 max-w-3xl">
                <p className="text-sm font-semibold text-cyan-300">5 рабочих блоков</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  От вопроса пользователя до записи к эксперту
                </h2>
              </div>
              <ModuleGrid modules={expertModules} />
            </div>
          </section>

          <section className="py-14">
            <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-3">
              {[
                ["Что ищут", "вопросы, цены, сравнения, симптомы, ситуации выбора"],
                ["Что публикуем", "страницы с ответом, FAQ, таблицами, источниками и кнопкой записи"],
                ["Что измеряем", "показы, клики, заявки, позиции и упоминания в нейросетях"],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-[#101715]/75 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="py-14">
            <div className="mx-auto max-w-5xl px-6">
              <ResultsTable />
            </div>
          </section>

          <section className="py-16">
            <div className="mx-auto max-w-4xl rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.08] px-6 py-10 text-center">
              <h2 className="text-3xl font-bold text-white">Начните с карты спроса</h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-300">
                Вы увидите вопросы, по которым люди уже ищут помощь,
                и поймёте, какие страницы стоит запускать первыми.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/audit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-7 py-3 font-semibold text-[#071116] transition hover:bg-cyan-200">
                  Получить карту спроса
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/for-experts" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-7 py-3 font-semibold text-white transition hover:bg-white/[0.06]">
                  Подробнее для экспертов
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      <MarketingFooter />
    </div>
  );
}
