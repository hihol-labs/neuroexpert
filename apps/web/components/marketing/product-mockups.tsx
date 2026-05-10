import {
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
  { channel: "Яндекс Карты", issue: "нет цен и свежих фото", loss: "высокий" },
  { channel: "2ГИС", issue: "услуги заполнены частично", loss: "средний" },
  { channel: "Авито", issue: "оффер слабее конкурентов", loss: "средний" },
  { channel: "Нейросети", issue: "чаще советуют 3 конкурентов", loss: "высокий" },
  { channel: "Звонки", issue: "12 обращений без перезвона", loss: "критичный" },
];

const todayTasks = [
  "добавить цены к 8 услугам",
  "ответить на 4 свежих отзыва",
  "перезвонить 12 клиентам",
  "добавить FAQ по стоимости",
  "усилить оффер против конкурента",
];

const ownerPanelCards = [
  { icon: MapPinned, label: "Карты", value: "62/100", hint: "слабые услуги" },
  { icon: Star, label: "Отзывы", value: "3.9", hint: "мало свежих" },
  { icon: Bot, label: "Нейросети", value: "2/10", hint: "видят конкурентов" },
  { icon: PhoneMissed, label: "Потерянные обращения", value: "12", hint: "без перезвона" },
];

const scenarios = [
  { name: "Стоматология", signal: "растёт спрос на имплантацию под ключ", task: "услуги, FAQ, отзывы, страница" },
  { name: "Салон", signal: "конкуренты усиливают первый визит", task: "пакеты услуг и карточки" },
  { name: "Автосервис", signal: "нейросети советуют агрегаторы", task: "цены, срочность, доверие" },
  { name: "Юрфирма", signal: "клиенты сравнивают цену и сроки", task: "кейсы и первичный разбор" },
];

const soloSignals = [
  { topic: "панические атаки после увольнения", score: "91", signal: "растущий спрос", action: "записать ответ" },
  { topic: "как выбрать юриста по наследству", score: "84", signal: "слабый ответ нейросети", action: "страница с записью" },
  { topic: "анализы перед консультацией нутрициолога", score: "78", signal: "близко к заявке", action: "FAQ и кнопка записи" },
];

function SeverityBadge({ value }: { value: string }) {
  const critical = value === "критичный" || value === "высокий";
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
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
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#101715]/95 shadow-2xl shadow-black/30">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Аудит продаж</p>
            <h3 className="mt-1 text-base font-semibold text-white">Карта потерь за 7 дней</h3>
          </div>
          <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            пример отчёта
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Gauge className="h-4 w-4 text-emerald-300" />
            Индекс локальных продаж
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-bold text-white">62</span>
            <span className="pb-1 text-sm text-gray-500">/100</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/10">
            <div className="h-full w-[62%] rounded-full bg-emerald-300" />
          </div>
        </div>

        <div className="rounded-xl border border-rose-300/15 bg-rose-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm text-rose-100/80">
            <CircleDollarSign className="h-4 w-4" />
            Риск недополученной выручки
          </div>
          <p className="mt-3 text-3xl font-bold text-white">до 480 000 ₽</p>
          <p className="mt-2 text-xs text-rose-100/60">по среднему чеку и непроданным обращениям</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-x-auto rounded-xl border border-white/10">
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
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ListChecks className="h-4 w-4 text-emerald-300" />
            Что сделать сегодня
          </div>
          <div className="mt-3 space-y-2">
            {todayTasks.slice(0, compact ? 3 : todayTasks.length).map((task) => (
              <div key={task} className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                <span>{task}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <TrendingUp className="h-4 w-4" />
            Сигнал спроса
          </div>
          <p className="mt-3 text-2xl font-bold text-white">+27%</p>
          <p className="mt-1 text-xs text-cyan-100/70">растёт интерес к услуге “под ключ”</p>
          <div className="mt-4 rounded-lg border border-white/10 bg-[#0c1210] p-3 text-xs text-gray-300">
            Конкуренты чаще обещают рассрочку и бесплатную первичную консультацию.
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
    ["Авито", "слабый оффер", "переписать заголовки и кнопку заявки"],
    ["Нейросети", "называют конкурентов", "усилить страницы и отзывы"],
    ["Обращения", "12 без возврата", "перезвон и повторное касание"],
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101715]/85 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-300">Пример результата за 7 дней</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Отчёт, который превращается в действия</h3>
        </div>
        <div className="rounded-xl border border-rose-300/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Риск потери: до 480 000 ₽
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
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
              <span className="text-emerald-100">{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RevenueCalculatorMockup() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
        <CircleDollarSign className="h-4 w-4" />
        Оценка потерь
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {[
          ["12", "обращений без ответа"],
          ["40 000 ₽", "средний чек"],
          ["480 000 ₽", "выручка под риском"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[#101715]/75 p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-gray-400">
        Сначала считаем не “маркетинг вообще”, а уже пришедшие обращения:
        пропущенные звонки, поздние ответы и клиентов без повторного касания.
      </p>
    </div>
  );
}

export function SoloDemandSignalMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#101715]/90 shadow-2xl shadow-black/25">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Карта спроса эксперта</p>
            <h3 className="mt-1 text-base font-semibold text-white">Что растёт сейчас в нише</h3>
          </div>
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            сигналы спроса
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <TrendingUp className="h-4 w-4" />
            Приоритет недели
          </div>
          <p className="mt-3 text-3xl font-bold text-white">+31%</p>
          <p className="mt-2 text-sm leading-relaxed text-cyan-100/70">
            растёт спрос на темы, где человеку удобно сразу записаться
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Bot className="h-4 w-4 text-cyan-300" />
            Что обещают конкуренты
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            В объявлениях и страницах чаще встречаются “разбор за 30 минут”,
            “план действий” и “первичная диагностика”. Эти смыслы можно проверить
            в экспертном ответе и кнопке записи.
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[1.5fr_0.5fr_0.85fr_0.85fr] gap-3 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase text-gray-500">
              <span>Тема</span>
              <span>Балл</span>
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
                <span className="text-emerald-100">{row.action}</span>
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
    <div className="rounded-2xl border border-white/10 bg-[#101715]/90 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-300">Панель собственника</p>
          <h3 className="mt-1 text-2xl font-bold text-white">Где теряются клиенты</h3>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-gray-300">
          <ClipboardCheck className="h-4 w-4 text-emerald-300" />
          обновлено сегодня
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ownerPanelCards.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <Icon className="h-5 w-5 text-emerald-300" />
              <ArrowUpRight className="h-4 w-4 text-gray-600" />
            </div>
            <p className="mt-4 text-2xl font-bold text-white">{value}</p>
            <p className="text-sm font-medium text-gray-300">{label}</p>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <BarChart3 className="h-4 w-4 text-emerald-300" />
            Карта потерь
          </div>
          <div className="mt-4 space-y-3">
            {[
              ["карты", "68%"],
              ["отзывы", "42%"],
              ["видимость в нейросетях", "24%"],
              ["скорость ответа", "38%"],
            ].map(([name, width]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>{name}</span>
                  <span>{width}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-300" style={{ width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ListChecks className="h-4 w-4 text-emerald-300" />
            План на неделю
          </div>
          <div className="mt-4 space-y-3">
            {["карточки", "отзывы", "оффер", "перезвон"].map((task, index) => (
              <div key={task} className="flex items-center gap-3 rounded-lg bg-[#0c1210] px-3 py-2 text-sm text-gray-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-300/10 text-xs font-bold text-emerald-200">
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
        <div key={item.name} className="rounded-xl border border-white/10 bg-[#101715]/75 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Radar className="h-4 w-4 text-emerald-300" />
            {item.name}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.signal}</p>
          <p className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-sm text-emerald-100">
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
      <div className="rounded-2xl border border-rose-300/15 bg-rose-500/[0.06] p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-rose-100">
          <AlertTriangle className="h-4 w-4" />
          Было
        </div>
        <ul className="mt-4 space-y-3 text-sm text-rose-100/80">
          <li>пустые карточки и 8 устаревших отзывов</li>
          <li>нет услуг, цен, FAQ и сильного оффера</li>
          <li>нейросети чаще называют конкурентов</li>
          <li>звонки и переписки теряются без возврата</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          Стало
        </div>
        <ul className="mt-4 space-y-3 text-sm text-emerald-100/80">
          <li>услуги, фото, FAQ, кнопки заявки и отзывы приведены к спросу</li>
          <li>видно, кто из конкурентов сильнее и почему</li>
          <li>есть страницы под вопросы, районы, цены и сравнения</li>
          <li>каждый день есть задачи и контроль потерянных обращений</li>
        </ul>
      </div>
    </div>
  );
}
