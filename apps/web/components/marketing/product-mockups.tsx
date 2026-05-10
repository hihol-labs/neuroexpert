import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  ListChecks,
  MapPinned,
  PhoneMissed,
  Radar,
  Star,
  TrendingUp,
} from "lucide-react";

const lossRows = [
  { channel: "Яндекс Карты", issue: "нет цен и свежих фото", loss: "высокая" },
  { channel: "2ГИС", issue: "услуги не заполнены", loss: "средняя" },
  { channel: "Авито", issue: "слабый оффер", loss: "средняя" },
  { channel: "AI-выдача", issue: "рекомендует 3 конкурентов", loss: "высокая" },
  { channel: "Звонки", issue: "12 пропущенных за неделю", loss: "критично" },
];

const todayTasks = [
  "обновить 8 услуг в картах",
  "ответить на 4 отзыва",
  "вернуть 12 пропущенных лидов",
  "добавить FAQ по цене",
  "проверить оффер конкурента",
];

const cockpitCards = [
  { icon: MapPinned, label: "Карты", value: "62/100", hint: "слабые услуги" },
  { icon: Star, label: "Отзывы", value: "3.9", hint: "нет свежести" },
  { icon: Bot, label: "AI", value: "2/10", hint: "видит конкурентов" },
  { icon: PhoneMissed, label: "Lost leads", value: "12", hint: "без перезвона" },
];

const scenarios = [
  { name: "Стоматология", signal: "растёт спрос на имплантацию под ключ", task: "страница + FAQ + отзывы" },
  { name: "Салон", signal: "конкуренты давят оффером первый визит", task: "пакет услуг + карточки" },
  { name: "Автосервис", signal: "AI советует агрегаторы", task: "услуги, цены, срочный ремонт" },
  { name: "Юрфирма", signal: "запросы про цену и сроки", task: "кейсы + консультация" },
];

const soloSignals = [
  { topic: "панические атаки после увольнения", score: "91", signal: "растёт спрос", action: "записать ответ" },
  { topic: "как выбрать юриста по наследству", score: "84", signal: "слабый AI-ответ", action: "страница + CTA" },
  { topic: "нутрициолог анализы перед консультацией", score: "78", signal: "коммерческий intent", action: "FAQ + запись" },
];

function SeverityBadge({ value }: { value: string }) {
  const critical = value === "критично" || value === "высокая";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        critical
          ? "bg-rose-500/12 text-rose-200 ring-1 ring-rose-400/20"
          : "bg-amber-500/12 text-amber-100 ring-1 ring-amber-400/20"
      }`}
    >
      {value}
    </span>
  );
}

export function LocalSalesAuditMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-slate-950/85 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-200">Local Sales Audit</p>
            <h3 className="mt-1 text-base font-semibold text-white">Карта потерь за 7 дней</h3>
          </div>
          <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            live report
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Gauge className="h-4 w-4 text-cyan-300" />
            Local Sales Index
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-bold text-white">62</span>
            <span className="pb-1 text-sm text-gray-500">/100</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/10">
            <div className="h-full w-[62%] rounded-full bg-cyan-300" />
          </div>
        </div>

        <div className="rounded-2xl border border-rose-300/15 bg-rose-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm text-rose-100/80">
            <CircleDollarSign className="h-4 w-4" />
            Потерянная выручка
          </div>
          <p className="mt-3 text-3xl font-bold text-white">до 480 000 ₽</p>
          <p className="mt-2 text-xs text-rose-100/60">оценка по среднему чеку и непроданным обращениям</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[1fr_1.35fr_auto] gap-3 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase text-gray-500">
              <span>Канал</span>
              <span>Что нашли</span>
              <span>Риск</span>
            </div>
            {lossRows.slice(0, compact ? 4 : lossRows.length).map((row) => (
              <div
                key={row.channel}
                className="grid grid-cols-[1fr_1.35fr_auto] gap-3 border-t border-white/10 px-4 py-3 text-sm"
              >
                <span className="font-medium text-white">{row.channel}</span>
                <span className="text-gray-400">{row.issue}</span>
                <SeverityBadge value={row.loss} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ListChecks className="h-4 w-4 text-cyan-300" />
            Задачи на сегодня
          </div>
          <div className="mt-3 space-y-2">
            {todayTasks.slice(0, compact ? 3 : todayTasks.length).map((task) => (
              <div key={task} className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" />
                <span>{task}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <TrendingUp className="h-4 w-4" />
            Сигналы роста
          </div>
          <p className="mt-3 text-2xl font-bold text-white">+27%</p>
          <p className="mt-1 text-xs text-cyan-100/70">растёт спрос на услугу “под ключ”</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs text-gray-300">
            Конкуренты продвигают рассрочку и бесплатную консультацию.
          </div>
        </div>
      </div>
    </div>
  );
}

export function SevenDayResultPanel() {
  const rows = [
    ["Яндекс Карты", "слабая карточка", "добавить услуги, цены, фото"],
    ["2ГИС", "нет ключевых услуг", "заполнить рубрики и FAQ"],
    ["Авито", "слабый оффер", "переписать заголовки и CTA"],
    ["AI", "называет конкурентов", "усилить страницы и отзывы"],
    ["Лиды", "12 обращений без возврата", "перезвон и follow-up"],
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-300">Пример результата за 7 дней</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Не отчёт ради отчёта, а карта действий</h3>
        </div>
        <div className="rounded-2xl border border-rose-300/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Потенциальная потеря: до 480 000 ₽
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[0.8fr_1fr_1.25fr] gap-3 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase text-gray-500">
            <span>Канал</span>
            <span>Потеря</span>
            <span>Действие</span>
          </div>
          {rows.map(([channel, loss, action]) => (
            <div
              key={channel}
              className="grid grid-cols-[0.8fr_1fr_1.25fr] gap-3 border-t border-white/10 px-4 py-3 text-sm"
            >
              <span className="font-medium text-white">{channel}</span>
              <span className="text-gray-400">{loss}</span>
              <span className="text-cyan-100">{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RevenueCalculatorMockup() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
        <CircleDollarSign className="h-4 w-4" />
        Мини-калькулятор потерь
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["12", "пропущенных обращений"],
          ["40 000 ₽", "средний чек"],
          ["480 000 ₽", "потенциал возврата"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-gray-400">
        Сначала считаем не абстрактный маркетинг, а уже пришедшие обращения:
        пропущенные звонки, поздние ответы, забытые переписки и клиентов без повторного касания.
      </p>
    </div>
  );
}

export function SoloDemandSignalMockup() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-300/15 bg-slate-950/80 shadow-2xl shadow-blue-950/25 backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" />
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-200">Demand Finder / Solo</p>
            <h3 className="mt-1 text-base font-semibold text-white">Что растёт сейчас в нише</h3>
          </div>
          <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            trend signals
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <TrendingUp className="h-4 w-4" />
            Приоритет недели
          </div>
          <p className="mt-3 text-3xl font-bold text-white">+31%</p>
          <p className="mt-2 text-sm leading-relaxed text-cyan-100/70">
            растёт спрос на темы с быстрым выбором специалиста и понятным CTA
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Bot className="h-4 w-4 text-blue-300" />
            Что видно у конкурентов
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            В офферах чаще повторяются “разбор за 30 минут”, “план действий” и
            “первичная диагностика”. Эти смыслы можно проверить в экспертном ответе,
            странице и CTA без запуска PPC-системы.
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[1.5fr_0.5fr_0.85fr_0.85fr] gap-3 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase text-gray-500">
              <span>Тема</span>
              <span>Score</span>
              <span>Сигнал</span>
              <span>Действие</span>
            </div>
            {soloSignals.map((row) => (
              <div
                key={row.topic}
                className="grid grid-cols-[1.5fr_0.5fr_0.85fr_0.85fr] gap-3 border-t border-white/10 px-4 py-3 text-sm"
              >
                <span className="font-medium text-white">{row.topic}</span>
                <span className="text-cyan-200">{row.score}</span>
                <span className="text-gray-400">{row.signal}</span>
                <span className="text-blue-100">{row.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LocalSalesCockpitMockup() {
  return (
    <div className="rounded-3xl border border-cyan-300/15 bg-slate-950/80 p-5 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-300">Local Sales OS cockpit</p>
          <h3 className="mt-1 text-2xl font-bold text-white">Где теряются клиенты</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-gray-300">
          <Activity className="h-4 w-4 text-cyan-300" />
          обновлено сегодня
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cockpitCards.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <Icon className="h-5 w-5 text-cyan-300" />
              <ArrowUpRight className="h-4 w-4 text-gray-600" />
            </div>
            <p className="mt-4 text-2xl font-bold text-white">{value}</p>
            <p className="text-sm font-medium text-gray-300">{label}</p>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <BarChart3 className="h-4 w-4 text-cyan-300" />
            Карта потерь
          </div>
          <div className="mt-4 space-y-3">
            {[
              ["карты", "68%"],
              ["отзывы", "42%"],
              ["AI-видимость", "24%"],
              ["скорость ответа", "38%"],
            ].map(([name, width]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>{name}</span>
                  <span>{width}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ClipboardCheck className="h-4 w-4 text-cyan-300" />
            План на неделю
          </div>
          <div className="mt-4 space-y-3">
            {["карточки", "отзывы", "оффер", "перезвон"].map((task, index) => (
              <div key={task} className="flex items-center gap-3 rounded-xl bg-slate-950/45 px-3 py-2 text-sm text-gray-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300/10 text-xs font-bold text-cyan-200">
                  {index + 1}
                </span>
                <span>{task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VerticalScenarioGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {scenarios.map((item) => (
        <div key={item.name} className="rounded-2xl border border-white/10 bg-slate-950/65 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Radar className="h-4 w-4 text-cyan-300" />
            {item.name}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.signal}</p>
          <p className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-sm text-cyan-100">
            {item.task}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BeforeAfterPanel() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-rose-300/15 bg-rose-500/[0.06] p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-rose-100">
          <AlertTriangle className="h-4 w-4" />
          Было
        </div>
        <ul className="mt-4 space-y-3 text-sm text-rose-100/80">
          <li>пустые карточки и 8 устаревших отзывов</li>
          <li>нет услуг, цен, FAQ и оффера под срочный спрос</li>
          <li>AI чаще называет конкурентов и агрегаторы</li>
          <li>звонки и переписки теряются без follow-up</li>
        </ul>
      </div>
      <div className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
          <CheckCircle2 className="h-4 w-4" />
          Стало
        </div>
        <ul className="mt-4 space-y-3 text-sm text-cyan-100/80">
          <li>услуги, фото, FAQ, CTA и отзывы приведены к спросу</li>
          <li>видно, кто из конкурентов сильнее и почему</li>
          <li>есть страницы под вопросы, районы, цены и сравнения</li>
          <li>каждый день есть задачи и контроль потерянных лидов</li>
        </ul>
      </div>
    </div>
  );
}
