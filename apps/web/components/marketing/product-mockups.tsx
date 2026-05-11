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
import type { ReactNode } from "react";

const lossRows = [
  { channel: "Яндекс Карты", issue: "нет цен и свежих фото", loss: "высокий", owner: "администратор" },
  { channel: "2ГИС", issue: "услуги заполнены частично", loss: "средний", owner: "маркетолог" },
  { channel: "Авито", issue: "оффер слабее конкурентов", loss: "средний", owner: "руководитель" },
  { channel: "Нейросети", issue: "чаще советуют 3 конкурентов", loss: "высокий", owner: "эксперт" },
  { channel: "Звонки", issue: "12 обращений без перезвона", loss: "критичный", owner: "администратор" },
];

const todayTasks = [
  ["Высокий", "добавить цены к 8 услугам", "сегодня"],
  ["Высокий", "перезвонить 12 клиентам", "сегодня"],
  ["Средний", "ответить на 4 свежих отзыва", "завтра"],
  ["Средний", "добавить FAQ по стоимости", "2 дня"],
  ["Низкий", "усилить оффер против конкурента", "неделя"],
];

const ownerPanelCards = [
  { icon: MapPinned, label: "Карты", value: "62/100", hint: "слабые услуги", tone: "warning" },
  { icon: Star, label: "Отзывы", value: "3.9", hint: "мало свежих", tone: "warning" },
  { icon: Bot, label: "AI-ответы", value: "2/10", hint: "видят конкурентов", tone: "info" },
  { icon: PhoneMissed, label: "Потерянные обращения", value: "12", hint: "без перезвона", tone: "danger" },
];

const scenarios = [
  { name: "Стоматология", signal: "растёт спрос на имплантацию под ключ", task: "услуги, FAQ, отзывы, страница" },
  { name: "Салон", signal: "конкуренты усиливают первый визит", task: "пакеты услуг и карточки" },
  { name: "Автосервис", signal: "нейросети советуют агрегаторы", task: "цены, срочность, доверие" },
  { name: "Юрфирма", signal: "клиенты сравнивают цену и сроки", task: "кейсы и первичный разбор" },
];

const soloSignals = [
  { topic: "панические атаки после увольнения", score: "91", signal: "растущий спрос", action: "записать ответ" },
  { topic: "как выбрать юриста по наследству", score: "84", signal: "слабый AI-ответ", action: "страница с записью" },
  { topic: "анализы перед консультацией нутрициолога", score: "78", signal: "близко к заявке", action: "FAQ и запись" },
];

function SeverityBadge({ value }: { value: string }) {
  const className =
    value === "критичный"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : value === "высокий"
        ? "bg-red-50 text-red-700 ring-red-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ${className}`}>
      {value}
    </span>
  );
}

function PriorityBadge({ value }: { value: string }) {
  const className =
    value === "Высокий"
      ? "bg-red-50 text-red-700"
      : value === "Средний"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${className}`}>{value}</span>;
}

function ProductFrame({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{subtitle}</p>
            <h3 className="mt-1 text-base font-semibold">{title}</h3>
          </div>
          {right}
        </div>
      </div>
      {children}
    </div>
  );
}

export function LocalSalesAuditMockup({ compact = false }: { compact?: boolean }) {
  return (
    <ProductFrame
      title="Карта потерь за 7 дней"
      subtitle="Local Sales OS"
      right={<span className="rounded-md bg-white/10 px-3 py-1 text-xs font-semibold text-white">пример отчёта</span>}
    >
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Gauge className="h-4 w-4 text-blue-600" />
            Индекс локальных продаж
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-bold text-slate-950">62</span>
            <span className="pb-1 text-sm text-slate-500">/100</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div className="h-full w-[62%] rounded-full bg-blue-600" />
          </div>
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
            <CircleDollarSign className="h-4 w-4" />
            Выручка под риском
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950">до 480 000 ₽</p>
          <p className="mt-2 text-xs text-rose-700/80">по среднему чеку и непроданным обращениям</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[1fr_1.35fr_0.8fr_auto] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
              <span>Канал</span>
              <span>Что нашли</span>
              <span>Ответственный</span>
              <span>Риск</span>
            </div>
            {lossRows.slice(0, compact ? 4 : lossRows.length).map((row) => (
              <div
                key={row.channel}
                className="grid grid-cols-[1fr_1.35fr_0.8fr_auto] gap-3 border-t border-slate-200 px-4 py-3 text-sm"
              >
                <span className="font-medium text-slate-950">{row.channel}</span>
                <span className="text-slate-600">{row.issue}</span>
                <span className="text-slate-500">{row.owner}</span>
                <SeverityBadge value={row.loss} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <ListChecks className="h-4 w-4 text-slate-700" />
            Задачи на сегодня
          </div>
          <div className="mt-3 space-y-2">
            {todayTasks.slice(0, compact ? 3 : todayTasks.length).map(([priority, task, term]) => (
              <div key={task} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-sm">
                <PriorityBadge value={priority} />
                <span className="text-slate-700">{task}</span>
                <span className="text-xs text-slate-500">{term}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <TrendingUp className="h-4 w-4" />
            Сигнал спроса
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-950">+27%</p>
          <p className="mt-1 text-xs text-blue-700">растёт интерес к услуге “под ключ”</p>
          <div className="mt-4 rounded-md border border-blue-200 bg-white p-3 text-xs text-slate-700">
            Конкуренты чаще обещают рассрочку и первичную консультацию.
          </div>
        </div>
      </div>
    </ProductFrame>
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
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Пример результата за 7 дней</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">Отчёт, который превращается в действия</h3>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          Риск потери: до 480 000 ₽
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[0.8fr_1fr_1.25fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
            <span>Канал</span>
            <span>Потеря</span>
            <span>Действие</span>
          </div>
          {rows.map(([channel, loss, action]) => (
            <div
              key={channel}
              className="grid grid-cols-[0.8fr_1fr_1.25fr] gap-3 border-t border-slate-200 px-4 py-3 text-sm"
            >
              <span className="font-medium text-slate-950">{channel}</span>
              <span className="text-slate-600">{loss}</span>
              <span className="text-slate-700">{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RevenueCalculatorMockup() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
        <CircleDollarSign className="h-4 w-4" />
        Оценка потерь
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {[
          ["12", "обращений без ответа"],
          ["40 000 ₽", "средний чек"],
          ["480 000 ₽", "выручка под риском"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        Сначала считаем уже пришедшие обращения: пропущенные звонки, поздние
        ответы и клиентов без повторного касания.
      </p>
    </div>
  );
}

export function SoloDemandSignalMockup() {
  return (
    <ProductFrame
      title="Что растёт сейчас в нише"
      subtitle="Карта спроса эксперта"
      right={<span className="rounded-md bg-blue-500 px-3 py-1 text-xs font-semibold text-white">сигналы спроса</span>}
    >
      <div className="grid gap-4 p-4 sm:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <TrendingUp className="h-4 w-4" />
            Приоритет недели
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950">+31%</p>
          <p className="mt-2 text-sm leading-relaxed text-blue-700">
            растёт спрос на темы, где человеку удобно сразу записаться
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Bot className="h-4 w-4 text-blue-600" />
            Что обещают конкуренты
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Чаще встречаются “разбор за 30 минут”, “план действий”
            и “первичная диагностика”. Эти смыслы можно проверить в
            экспертном ответе и кнопке записи.
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[1.5fr_0.5fr_0.85fr_0.85fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
              <span>Тема</span>
              <span>Балл</span>
              <span>Сигнал</span>
              <span>Действие</span>
            </div>
            {soloSignals.map((row) => (
              <div
                key={row.topic}
                className="grid grid-cols-[1.5fr_0.5fr_0.85fr_0.85fr] gap-3 border-t border-slate-200 px-4 py-3 text-sm"
              >
                <span className="font-medium text-slate-950">{row.topic}</span>
                <span className="font-semibold text-blue-700">{row.score}</span>
                <span className="text-slate-600">{row.signal}</span>
                <span className="text-slate-700">{row.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

export function LocalSalesCockpitMockup() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Панель собственника</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-950">Где теряются клиенты</h3>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <ClipboardCheck className="h-4 w-4 text-green-700" />
          обновлено сегодня
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ownerPanelCards.map(({ icon: Icon, label, value, hint, tone }) => {
          const toneClass =
            tone === "danger"
              ? "text-red-700 bg-red-50"
              : tone === "info"
                ? "text-blue-700 bg-blue-50"
                : "text-amber-700 bg-amber-50";
          return (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-md p-2 ${toneClass}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="mt-1 text-xs text-slate-500">{hint}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <BarChart3 className="h-4 w-4 text-blue-700" />
            Карта потерь
          </div>
          <div className="mt-4 space-y-3">
            {[
              ["карты", "68%", "bg-amber-500"],
              ["отзывы", "42%", "bg-amber-500"],
              ["видимость в нейросетях", "24%", "bg-blue-600"],
              ["скорость ответа", "38%", "bg-red-500"],
            ].map(([name, width, color]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs text-slate-600">
                  <span>{name}</span>
                  <span>{width}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${color}`} style={{ width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <ListChecks className="h-4 w-4 text-green-700" />
            План на неделю
          </div>
          <div className="mt-4 space-y-2">
            {["карточки", "отзывы", "оффер", "перезвон"].map((task, index) => (
              <div key={task} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-950 text-xs font-bold text-white">
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
        <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Radar className="h-4 w-4 text-blue-700" />
            {item.name}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.signal}</p>
          <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
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
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
          <AlertTriangle className="h-4 w-4" />
          Было
        </div>
        <ul className="mt-4 space-y-3 text-sm text-rose-800/90">
          <li>пустые карточки и 8 устаревших отзывов</li>
          <li>нет услуг, цен, FAQ и сильного оффера</li>
          <li>нейросети чаще называют конкурентов</li>
          <li>звонки и переписки теряются без возврата</li>
        </ul>
      </div>
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          Стало
        </div>
        <ul className="mt-4 space-y-3 text-sm text-green-800/90">
          <li>услуги, фото, FAQ, кнопки заявки и отзывы приведены к спросу</li>
          <li>видно, кто из конкурентов сильнее и почему</li>
          <li>есть страницы под вопросы, районы, цены и сравнения</li>
          <li>каждый день есть задачи и контроль потерянных обращений</li>
        </ul>
      </div>
    </div>
  );
}
