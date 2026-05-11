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
  Scale,
  Scissors,
  Star,
  Stethoscope,
  TrendingUp,
  Wrench,
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
  { icon: PhoneMissed, label: "Вернуть в работу", value: "12", hint: "без перезвона", tone: "danger" },
];

const scenarios = [
  {
    name: "Стоматология",
    icon: Stethoscope,
    signal: "люди сравнивают цену, врача, рассрочку и отзывы",
    task: "усилить карточки, FAQ по цене, страницу услуги и сбор отзывов",
    metric: "записи на консультацию",
    tone: "blue",
  },
  {
    name: "Салон красоты",
    icon: Scissors,
    signal: "первый визит решается по фото, цене и ближайшему времени",
    task: "обновить фото, пакеты услуг, кнопки записи и оффер первого визита",
    metric: "записи через карты и мессенджеры",
    tone: "green",
  },
  {
    name: "Автосервис",
    icon: Wrench,
    signal: "клиенту важны срочность, цена, гарантия и доверие",
    task: "вывести цены, сроки, отзывы, срочные услуги и быстрый звонок",
    metric: "звонки на диагностику",
    tone: "amber",
  },
  {
    name: "Юрфирма",
    icon: Scale,
    signal: "человек сравнивает опыт, срок, цену и первый разбор",
    task: "показать кейсы, условия консультации, страницы под частые вопросы",
    metric: "записи на первичный разбор",
    tone: "rose",
  },
];

const soloSignals = [
  { topic: "панические атаки после увольнения", score: "91", signal: "растущий спрос", action: "записать ответ" },
  { topic: "как выбрать юриста по наследству", score: "84", signal: "слабый AI-ответ", action: "страница с записью" },
  { topic: "анализы перед консультацией нутрициолога", score: "78", signal: "близко к записи", action: "FAQ и запись" },
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
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-blue-800 bg-blue-700 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">{subtitle}</p>
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
      title="План привлечения клиентов за 7 дней"
      subtitle="Local Sales OS"
      right={<span className="rounded-md bg-white/15 px-3 py-1 text-xs font-semibold text-white">пример плана</span>}
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
            Потенциал возврата
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950">до 480 000 ₽</p>
          <p className="mt-2 text-xs text-rose-700/80">по среднему чеку и обращениям без повторного касания</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[1fr_1.35fr_0.8fr_auto] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
              <span>Канал</span>
              <span>Что улучшить</span>
              <span>Ответственный</span>
              <span>Приоритет</span>
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

      <div className="grid gap-4 border-t border-blue-100 bg-blue-50 p-4 sm:grid-cols-[1fr_0.9fr]">
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
          <h3 className="mt-2 text-2xl font-bold text-slate-950">План, который приводит к обращениям</h3>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          Потенциал возврата: до 480 000 ₽
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[0.8fr_1fr_1.25fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
            <span>Канал</span>
            <span>Что мешает обращению</span>
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
        Оценка возврата обращений
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {[
          ["12", "обращений без ответа"],
          ["40 000 ₽", "средний чек"],
          ["480 000 ₽", "потенциал возврата"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        Сначала считаем обращения, за которые бизнес уже заплатил вниманием,
        временем или рекламой: звонки, переписки и повторные касания.
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
    <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm shadow-blue-900/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Панель собственника</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-950">Как появляются новые обращения</h3>
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
            Каналы роста
          </div>
          <div className="mt-4 space-y-3">
            {[
              ["карты", "68%", "bg-amber-500"],
              ["отзывы", "42%", "bg-amber-500"],
              ["AI-видимость", "24%", "bg-blue-600"],
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
            План роста на неделю
          </div>
          <div className="mt-4 space-y-2">
            {["обновить карточки", "собрать отзывы", "усилить оффер", "вернуть обращения"].map((task, index) => (
              <div key={task} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-700 text-xs font-bold text-white">
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
      {scenarios.map((item) => {
        const Icon = item.icon;
        const toneClass =
          item.tone === "green"
            ? "border-green-200 bg-green-50 text-green-800"
            : item.tone === "amber"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : item.tone === "rose"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-blue-200 bg-blue-50 text-blue-800";

        return (
          <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <span className={`flex h-8 w-8 items-center justify-center rounded-md border ${toneClass}`}>
                <Icon className="h-4 w-4" />
              </span>
              {item.name}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Сигнал</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.signal}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Что делаем</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {item.task}
            </p>
            <p className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold ${toneClass}`}>
              Цель: {item.metric}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function BeforeAfterPanel() {
  const rows = [
    {
      issue: "В карточках нет цен и понятных услуг",
      action: "добавляем услуги, цены, фото, FAQ и кнопку записи",
      metric: "клики по звонку и записи из карт",
    },
    {
      issue: "Отзывы старые, негатив без ответа",
      action: "запускаем сценарий сбора отзывов и ответы администратора",
      metric: "рейтинг, свежие отзывы, доля отзывов с ответом",
    },
    {
      issue: "Конкуренты чаще появляются в AI-ответах",
      action: "усиливаем страницы, FAQ, доказательства и локальные формулировки",
      metric: "упоминания бизнеса и конкурентов в AI-проверках",
    },
    {
      issue: "Звонки и переписки остаются без возврата",
      action: "формируем список повторных касаний и скрипт возврата",
      metric: "возвращённые обращения и записи после касания",
    },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid min-w-[760px] grid-cols-[1fr_1.1fr_1fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        <span>Что мешает обращению</span>
        <span>Что делаем</span>
        <span>Что измеряем</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.issue}
          className="grid min-w-[760px] grid-cols-[1fr_1.1fr_1fr] gap-3 border-t border-slate-200 px-4 py-4 text-sm"
        >
          <div className="flex gap-2 text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{row.issue}</span>
          </div>
          <div className="flex gap-2 text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-700" />
            <span>{row.action}</span>
          </div>
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900">
            {row.metric}
          </div>
        </div>
      ))}
    </div>
  );
}
