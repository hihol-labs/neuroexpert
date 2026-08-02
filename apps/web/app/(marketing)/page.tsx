import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  MoveUpRight,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/nav";
import { generateServiceSchema } from "@/lib/schema-org";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

const signalRows = [
  { source: "Карты и поиск", value: "1 840", delta: "+18%" },
  { source: "Отзывы и AI-ответы", value: "620", delta: "+31%" },
  { source: "Формы и звонки", value: "146", delta: "+24%" },
];

const operatingLoop = [
  ["01", "Увидеть спрос", "Собираем реальные сигналы: что ищут, сравнивают и спрашивают клиенты рядом с вами."],
  ["02", "Убрать разрыв", "Находим место, где намерение теряется: карточка, отзыв, страница, звонок или повторное касание."],
  ["03", "Дать действие", "Превращаем вывод в одну понятную задачу, которую команда может выполнить сегодня."],
] as const;

function DemandConsole() {
  return (
    <div className="relative border border-white/20 bg-[#20251d] text-white shadow-[0_40px_90px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--nx-accent)] shadow-[0_0_0_5px_rgba(217,255,67,0.12)]" />
          <span className="nx-kicker text-white/60">Live demand map</span>
        </div>
        <span className="font-mono text-[11px] text-white/45">02.08 / 14:32</span>
      </div>

      <div className="grid sm:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-white/15 p-5 sm:border-b-0 sm:border-r sm:p-7">
          <p className="text-sm text-white/55">Потенциал заявок за 30 дней</p>
          <div className="mt-4 flex items-end gap-3">
            <strong className="nx-display text-6xl leading-none text-[var(--nx-accent)] sm:text-7xl">146</strong>
            <span className="mb-2 text-sm font-semibold text-[var(--nx-accent)]">↗ 24%</span>
          </div>
          <div className="mt-8 flex h-24 items-end gap-2" aria-label="График роста спроса">
            {[31, 45, 38, 56, 52, 67, 61, 83, 72, 94, 88, 100].map((height, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 bg-white/20 last:bg-[var(--nx-accent)]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <p className="nx-kicker text-white/45">Сигналы месяца</p>
          <div className="mt-5 divide-y divide-white/10">
            {signalRows.map((row) => (
              <div key={row.source} className="grid grid-cols-[1fr_auto] gap-4 py-4 first:pt-0">
                <div>
                  <p className="text-sm text-white/70">{row.source}</p>
                  <p className="mt-1 text-xl font-semibold">{row.value}</p>
                </div>
                <span className="self-center font-mono text-xs text-[var(--nx-accent)]">{row.delta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/15 bg-black/20 px-5 py-4 sm:px-7">
        <div>
          <p className="nx-kicker text-white/40">Следующий ход</p>
          <p className="mt-1 text-sm font-medium">Вернуть 9 потерянных обращений</p>
        </div>
        <ArrowDownRight className="h-6 w-6 text-[var(--nx-accent)]" />
      </div>
    </div>
  );
}

const schema = generateServiceSchema({
  name: "НейроЭксперт",
  description: "Local Sales OS для превращения локального спроса в измеримые заявки и продажи.",
  url: APP_URL,
  serviceType: "Local sales and demand generation SaaS",
  offers: [
    { name: "Local Sales OS для бизнеса", url: `${APP_URL}/for-business` },
    { name: "Запуск под ключ", url: `${APP_URL}/launch` },
    { name: "Тарифы", url: `${APP_URL}/pricing` },
  ],
});

const homepage = (
    <div className="bg-[var(--nx-paper)] text-[var(--nx-ink)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <MarketingHeader />

      <main>
        <section className="nx-grid-paper overflow-hidden border-b border-[var(--nx-line)]">
          <div className="mx-auto max-w-[90rem] px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-14 lg:px-12 lg:pb-28">
            <div className="flex items-center justify-between border-b border-[var(--nx-ink)] pb-3">
              <p className="nx-kicker">Local Sales Operating System</p>
              <p className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--nx-ink-soft)] sm:block">
                Спрос → действие → выручка
              </p>
            </div>

            <div className="grid gap-12 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-16 lg:pt-16">
              <div>
                <p className="max-w-md text-sm font-semibold leading-6 text-[var(--nx-cobalt)]">
                  Для локального бизнеса, который хочет видеть не охваты, а следующий источник продаж.
                </p>
                <h1 className="nx-display mt-6 max-w-[12ch] text-[clamp(3.5rem,7.2vw,7.6rem)] leading-[0.87]">
                  Спрос уже есть.
                  <span className="mt-2 block italic text-[var(--nx-cobalt)]">Превратим его</span>
                  <span className="block">в заявки.</span>
                </h1>

                <div className="mt-10 grid gap-6 border-t border-[var(--nx-line)] pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
                  <p className="max-w-xl text-base leading-7 text-[var(--nx-ink-soft)] sm:text-lg">
                    НейроЭксперт соединяет карты, поиск, отзывы, AI-ответы, звонки и формы в одну рабочую систему. Каждый день вы видите, где теряются клиенты и что исправить первым.
                  </p>
                  <Link
                    href="/for-business"
                    className="nx-focus-ring group inline-flex min-h-14 items-center justify-between gap-6 bg-[var(--nx-ink)] px-6 text-sm font-bold text-white transition hover:bg-[var(--nx-cobalt)] sm:min-w-56"
                  >
                    Получить аудит
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              <div className="relative pb-14 lg:pb-16">
                <div className="absolute -right-6 -top-7 h-28 w-28 bg-[var(--nx-accent)] sm:-right-8 sm:-top-10 sm:h-40 sm:w-40" aria-hidden="true" />
                <DemandConsole />
                <div className="absolute bottom-0 left-0 border border-[var(--nx-ink)] bg-[var(--nx-paper-bright)] px-4 py-3 sm:-left-4">
                  <p className="nx-kicker">Не отчёт</p>
                  <p className="mt-1 text-sm font-medium">Рабочий план на сегодня</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--nx-line)] bg-[var(--nx-paper-bright)]">
          <div className="mx-auto grid max-w-[90rem] divide-y divide-[var(--nx-line)] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
            {[
              ["01", "Один контур", "От первого сигнала до оплаченной заявки"],
              ["02", "Каждый день", "Приоритеты вместо ещё одного дашборда"],
              ["03", "В цифрах", "Видно, что принесло обращение и продажу"],
            ].map(([number, title, copy]) => (
              <div key={number} className="py-7 sm:px-7 sm:first:pl-0 sm:last:pr-0 lg:py-9">
                <span className="font-mono text-xs text-[var(--nx-signal)]">/{number}</span>
                <p className="mt-3 text-lg font-bold">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--nx-ink-soft)]">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[var(--nx-ink)] py-20 text-white sm:py-28">
          <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
              <div>
                <p className="nx-kicker text-[var(--nx-accent)]">Операционный цикл</p>
                <h2 className="nx-display mt-5 max-w-[9ch] text-5xl leading-[0.95] sm:text-6xl">
                  Не больше данных. Больше ясности.
                </h2>
              </div>
              <div className="border-t border-white/25">
                {operatingLoop.map(([number, title, copy]) => (
                  <div key={number} className="grid gap-4 border-b border-white/25 py-7 sm:grid-cols-[4rem_0.7fr_1.3fr] sm:items-start sm:py-9">
                    <span className="font-mono text-xs text-[var(--nx-accent)]">{number}</span>
                    <h3 className="text-xl font-semibold sm:text-2xl">{title}</h3>
                    <p className="max-w-xl text-sm leading-7 text-white/60 sm:text-base">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b border-[var(--nx-line)] bg-[var(--nx-cobalt)] text-white">
          <div className="mx-auto grid max-w-[90rem] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
              <p className="nx-kicker text-white/60">От сигнала к решению</p>
              <h2 className="nx-display mt-5 max-w-[10ch] text-5xl leading-[0.94] sm:text-7xl">
                Сегодня — одна задача, которая двигает продажи.
              </h2>
              <p className="mt-8 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                Система ранжирует потери по влиянию на выручку: где ответить на отзыв, какую страницу усилить, кому перезвонить и какой канал перестал окупаться.
              </p>
            </div>
            <div className="relative min-h-[27rem] border-t border-white/25 bg-[var(--nx-accent)] p-5 text-[var(--nx-ink)] sm:p-8 lg:border-l lg:border-t-0 lg:p-12">
              <div className="flex h-full flex-col justify-between border border-[var(--nx-ink)] bg-[var(--nx-paper-bright)] p-6 shadow-[14px_14px_0_var(--nx-ink)] sm:p-9">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="nx-kicker text-[var(--nx-signal)]">Приоритет / 01</p>
                    <p className="mt-4 text-2xl font-bold leading-tight">Вернуть клиентов, которым не ответили</p>
                  </div>
                  <MoveUpRight className="h-7 w-7 shrink-0" />
                </div>
                <div className="mt-12">
                  <div className="flex items-end justify-between border-b border-[var(--nx-line)] pb-4">
                    <span className="text-sm text-[var(--nx-ink-soft)]">Потенциал</span>
                    <strong className="nx-display text-5xl">9 заявок</strong>
                  </div>
                  <div className="mt-5 space-y-3 text-sm font-semibold">
                    {[
                      "Список контактов уже собран",
                      "Сценарий повторного касания готов",
                      "Результат попадёт в общую воронку",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-[var(--nx-cobalt)]" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--nx-paper)] py-20 sm:py-28">
          <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
              <div>
                <p className="nx-kicker text-[var(--nx-cobalt)]">Выберите маршрут</p>
                <h2 className="nx-display mt-5 text-5xl leading-[0.95] sm:text-6xl">Начните с точки, где вы сейчас.</h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-[var(--nx-ink-soft)] lg:justify-self-end">
                Быстрый аудит покажет главную потерю спроса. Запуск под ключ соберёт всю систему — от аналитики до ежедневного операционного ритма.
              </p>
            </div>

            <div className="mt-12 grid border border-[var(--nx-ink)] lg:grid-cols-2">
              <Link href="/for-business" className="nx-focus-ring group flex min-h-64 flex-col justify-between border-b border-[var(--nx-ink)] bg-[var(--nx-accent)] p-7 transition hover:bg-[var(--nx-accent-strong)] sm:p-10 lg:border-b-0 lg:border-r">
                <div className="flex items-start justify-between">
                  <span className="nx-kicker">Диагностика</span>
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                </div>
                <div>
                  <h3 className="nx-display text-4xl sm:text-5xl">Найти точку роста</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[var(--nx-ink-soft)]">Получите карту спроса, потерь и первые действия для команды.</p>
                </div>
              </Link>
              <Link href="/launch" className="nx-focus-ring group flex min-h-64 flex-col justify-between bg-[var(--nx-paper-bright)] p-7 transition hover:bg-white sm:p-10">
                <div className="flex items-start justify-between">
                  <span className="nx-kicker">Внедрение</span>
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                </div>
                <div>
                  <h3 className="nx-display text-4xl sm:text-5xl">Запустить систему</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[var(--nx-ink-soft)]">Настроим каналы, аналитику, процессы и ритм роста под ключ.</p>
                </div>
              </Link>
            </div>

            <Link href="/how-it-works" className="nx-focus-ring mt-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--nx-cobalt)] hover:underline">
              Посмотреть, как устроена система
              <ArrowDownRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
);

export default function LandingPage() {
  return homepage;
}
