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

type Mechanism = {
  title: string;
  promise: string;
  icon: LucideIcon;
  sources: string[];
  checks: string[];
  tools: string[];
  output: string[];
  metrics: string[];
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

const businessModules: Mechanism[] = [
  {
    title: "Аудит видимости",
    promise: "Показывает, где бизнес уже проигрывает выбор клиента: в картах, отзывах, Авито, поиске, нейросетях и обработке обращений.",
    icon: Radar,
    sources: ["Яндекс Карты", "2ГИС", "Авито", "сайт", "отзывы", "формы и мессенджеры", "поиск", "ответы нейросетей"],
    checks: ["заполненность услуг, цен и рубрик", "свежесть фото и отзывов", "ответы на негатив", "наличие FAQ и оффера", "ошибки контактов и кнопок заявки"],
    tools: ["чек-лист карточек", "сравнение с конкурентами", "ручная проверка площадок", "снимки доказательств", "таблица потерь по каналам"],
    output: ["индекс локальной видимости", "карта слабых мест", "приоритеты на 7 дней", "план исправлений на 30 дней"],
    metrics: ["заполненность карточек", "количество свежих отзывов", "рейтинг", "видимость по запросам", "клики по звонку/маршруту/записи"],
  },
  {
    title: "Конкуренты и нейросети",
    promise: "Объясняет, почему клиент видит и слышит о конкурентах раньше, чем о вас.",
    icon: Users,
    sources: ["локальная выдача", "карты", "карточки конкурентов", "ответы ChatGPT, Алисы, Perplexity, YandexGPT и GigaChat", "публичные страницы конкурентов", "рекламные офферы"],
    checks: ["кто выше по запросам “рядом”, “цена”, “срочно”", "кого чаще называют нейросети", "какие аргументы и офферы сильнее", "где у конкурентов больше доверия", "какие услуги закрыты лучше"],
    tools: ["матрица конкурентов", "проверка нейросетевых ответов", "гео-запросы по районам", "разбор офферов", "лёгкая рекламная разведка"],
    output: ["топ конкурентов", "причины отставания", "что нужно усилить в карточках, страницах и отзывах", "гипотезы офферов"],
    metrics: ["место в выдаче", "доля упоминаний в нейросетях", "рейтинг и отзывы конкурентов", "сила оффера", "покрытие услуг"],
  },
  {
    title: "Ежедневные задачи",
    promise: "Превращает аудит в работу: владелец видит не “маркетинг вообще”, а конкретные действия на сегодня.",
    icon: ClipboardCheck,
    sources: ["карта потерь", "сравнение конкурентов", "динамика отзывов", "новые вопросы клиентов", "данные по обращениям"],
    checks: ["что быстрее влияет на заявки", "какая задача имеет доказательство выполнения", "кто отвечает", "какой срок", "какую метрику смотрим после выполнения"],
    tools: ["приоритизация задач", "недельный план", "статусы выполнения", "ответственные", "шаблоны описаний, FAQ, ответов и офферов"],
    output: ["5-10 задач на неделю", "задачи на сегодня", "ожидаемый эффект", "доказательство выполнения", "недельный отчёт"],
    metrics: ["выполненные задачи", "изменение карточек", "новые отзывы", "обновлённые услуги", "клики и обращения после правок"],
  },
  {
    title: "Отзывы и доверие",
    promise: "Строит доверие там, где клиент сравнивает бизнес перед звонком или записью.",
    icon: Star,
    sources: ["Яндекс Карты", "2ГИС", "отзовики", "сообщения клиентов", "CRM или таблица клиентов после услуги"],
    checks: ["где отзывов мало", "какой негатив не закрыт", "где нет ответа владельца", "какие услуги не подтверждены отзывами", "кого просить об отзыве первым"],
    tools: ["сценарий запроса отзыва", "маршрут довольный/недовольный", "шаблоны ответов", "список клиентов для запроса", "контроль свежести отзывов"],
    output: ["план сбора отзывов", "ответы на негатив", "список площадок", "шаблоны сообщений клиентам"],
    metrics: ["свежие отзывы", "средний рейтинг", "скорость ответа на отзыв", "доля негатива без реакции", "упоминания услуг в отзывах"],
  },
  {
    title: "Потерянные обращения",
    promise: "Находит деньги, которые уже были рядом: пропущенные звонки, поздние ответы, забытые переписки и клиентов без возврата.",
    icon: PhoneMissed,
    sources: ["телефония", "CRM", "формы сайта", "мессенджеры", "таблицы заявок", "старые обращения", "администраторские заметки"],
    checks: ["кому не ответили", "кто ждал слишком долго", "кому не перезвонили", "кто получил цену и пропал", "какое обращение ещё можно вернуть"],
    tools: ["реестр потерянных обращений", "оценка выручки под риском", "сценарии повторного касания", "задачи на перезвон", "недельный контроль возврата"],
    output: ["список возврата", "оценка потерь в рублях", "скрипты сообщений", "задачи администраторам"],
    metrics: ["количество потерянных обращений", "средний чек", "скорость ответа", "возвращённые клиенты", "выручка под риском"],
  },
];

const expertModules: Mechanism[] = [
  {
    title: "Карта спроса",
    promise: "Находит не темы “для контента”, а реальные вопросы людей, где есть шанс на консультацию, запись или заявку.",
    icon: Radar,
    sources: ["Wordstat/XMLRiver", "Яндекс Кью через SerpAPI", "поисковые подсказки", "похожие вопросы", "ответы нейросетей", "база вопросов по 20 нишам"],
    checks: ["сколько людей ищут вопрос", "есть ли коммерческое намерение", "насколько слаб текущий ответ", "есть ли экспертные страницы в выдаче", "видны ли конкуренты"],
    tools: ["расширение запроса", "фильтрация LLM", "проверка 4 нейросетевых платформ", "маркеры слабого ответа", "оценка возможности спроса"],
    output: ["карточка темы", "спрос в месяц", "намерение пользователя", "балл слабости ответа", "рекомендованное действие"],
    metrics: ["estimated_monthly_volume", "search_intent", "gap_score", "opportunity_score", "приоритет темы"],
  },
  {
    title: "Голос эксперта",
    promise: "Сохраняет авторскую экспертизу: материал строится не из пересказа интернета, а из живого ответа специалиста.",
    icon: Mic2,
    sources: ["голосовое сообщение в Telegram", "запись на сайте", "дозапись после уточняющих вопросов", "профиль эксперта", "кейсы и ограничения из практики"],
    checks: ["есть ли конкретные примеры", "понятен ли ответ человеку", "есть ли ограничения и честные нюансы", "достаточно ли фактуры для страницы", "нужно ли задать уточняющий вопрос"],
    tools: ["Telegram-бот", "Web Audio", "Whisper", "Yandex SpeechKit", "модуль уточняющих вопросов", "режим минимальной обработки"],
    output: ["транскрипт", "структура ответа", "авторские цитаты", "фактура для FAQ", "основа будущей страницы"],
    metrics: ["длина ответа", "качество транскрипта", "наличие примеров", "доля авторского текста", "готовность к публикации"],
  },
  {
    title: "Страница под вопрос",
    promise: "Превращает экспертный ответ в страницу, которую понимают человек, поиск и нейросети.",
    icon: FileText,
    sources: ["транскрипт эксперта", "карточка спроса", "профиль специалиста", "источники и уточнения", "FAQ из подзапросов"],
    checks: ["отвечает ли страница на один конкретный вопрос", "есть ли E-E-A-T", "понятна ли кнопка записи", "есть ли FAQ, таблицы и короткое резюме", "нет ли пустых обещаний"],
    tools: ["Next.js SSR", "Schema.org Article/Person/FAQPage/BreadcrumbList", "генератор FAQ", "редактор страницы", "проверка структуры"],
    output: ["публичная страница", "SEO-заголовок", "мета-описание", "FAQ", "кнопка записи/разбора", "аудиооснова"],
    metrics: ["индексация", "показы", "CTR", "клики по записи", "заявки со страницы"],
  },
  {
    title: "Публикация и распространение",
    promise: "Даёт странице первые точки входа: индексацию, внутренние ссылки, кросспост и доступность для поисковых и нейросетевых систем.",
    icon: Megaphone,
    sources: ["sitemap", "robots.txt", "профиль эксперта", "каталог экспертов", "страницы ниш", "Telegram/VK/Дзен/Хабр/Яндекс Кью"],
    checks: ["страница доступна без авторизации", "есть внутренняя перелинковка", "есть разметка", "отправлена ли страница в поисковые системы", "нужен ли кросспост"],
    tools: ["динамический sitemap", "submit-sitemap jobs", "Google/Yandex/Bing webmaster", "кросспостинг", "нишевые каналы"],
    output: ["опубликованная страница", "запись в sitemap", "материалы для каналов", "уведомление эксперту", "связанные страницы"],
    metrics: ["статус публикации", "индексация", "первые показы", "переходы из каналов", "внутренние переходы"],
  },
  {
    title: "Аналитика результата",
    promise: "Показывает не “мы что-то опубликовали”, а путь от спроса к просмотрам, кликам по записи и заявкам.",
    icon: BarChart3,
    sources: ["page_events", "leads", "citation_checks", "serp_positions", "cwv_metrics", "content_packages"],
    checks: ["какие страницы получают показы", "где есть клики по записи", "появился ли эксперт в ответах нейросетей", "какие темы нужно обновить", "какие страницы стоит усилить"],
    tools: ["воронка результата", "отслеживание цитирований", "мониторинг поисковых позиций", "Trust Score", "задачи на обновление"],
    output: ["личный кабинет", "топ страниц", "рекомендации", "сигналы обновления", "сравнение с конкурентами"],
    metrics: ["просмотры", "клики по записи", "заявки", "Share of Voice", "позиции", "Trust Score"],
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

function MechanismGrid({ modules, accent = "emerald" }: { modules: Mechanism[]; accent?: "emerald" | "cyan" }) {
  const accentClass =
    accent === "cyan"
      ? "bg-cyan-300/10 text-cyan-200 ring-cyan-300/20"
      : "bg-emerald-300/10 text-emerald-200 ring-emerald-300/20";
  const summaryClass = accent === "cyan" ? "text-cyan-200" : "text-emerald-200";
  const badgeClass =
    accent === "cyan"
      ? "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100"
      : "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100";

  return (
    <div className="space-y-4">
      {modules.map((item, index) => {
        const Icon = item.icon;
        return (
          <details
            key={item.title}
            open={index === 0}
            className="group rounded-2xl border border-white/10 bg-[#101715]/80 p-5 backdrop-blur-sm"
          >
            <summary className="flex cursor-pointer list-none items-start gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${accentClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <span className={`w-fit rounded-md border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                    раскрыть механику
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.promise}</p>
              </div>
            </summary>

            <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-5">
              {[
                ["Источники", item.sources],
                ["Что проверяем", item.checks],
                ["Инструменты", item.tools],
                ["Что получает пользователь", item.output],
                ["Метрики", item.metrics],
              ].map(([title, values]) => (
                <div key={title as string} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <h4 className={`text-sm font-semibold ${summaryClass}`}>{title as string}</h4>
                  <ul className="mt-3 space-y-2">
                    {(values as string[]).map((value) => (
                      <li key={value} className="text-sm leading-relaxed text-gray-400">
                        {value}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
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
                  За счёт чего система находит потери и двигает продажи
                </h2>
                <p className="mt-3 text-gray-400">
                  Ниже не обещания, а механика: какие источники проверяются,
                  какие инструменты используются, что получает собственник и по каким метрикам видно движение.
                </p>
              </div>
              <MechanismGrid modules={businessModules} />
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
                  За счёт чего эксперт получает видимость и заявки
                </h2>
                <p className="mt-3 text-gray-400">
                  Здесь раскрыта внутренняя логика платформы: от сбора массовых запросов
                  до страницы, индексации, упоминаний в нейросетях и кликов по записи.
                </p>
              </div>
              <MechanismGrid modules={expertModules} accent="cyan" />
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
