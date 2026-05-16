"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { FadeIn } from "@/components/marketing/fade-in";
import {
  BeforeAfterPanel,
  LocalSalesAuditMockup,
  LocalSalesCockpitMockup,
  RevenueCalculatorMockup,
  SevenDayResultPanel,
  VerticalScenarioGrid,
} from "@/components/marketing/product-mockups";

const LOSS_ZONES = [
  {
    title: "Яндекс Карты",
    desc: "Слабая карточка, мало фото, не заполнены услуги и цены, нет свежих отзывов или конкуренты выше по запросам рядом, цена и срочно.",
  },
  {
    title: "2ГИС",
    desc: "Неверные рубрики, пустые услуги, мало доказательств, отзывы без ответов и слабее карточка, чем у соседних компаний.",
  },
  {
    title: "Авито",
    desc: "Объявления не продают: слабые заголовки, фото без доверия, непонятные цены, нет пакетного оффера и регулярного обновления.",
  },
  {
    title: "Отзывы",
    desc: "Мало свежих отзывов, негатив висит без реакции, довольных клиентов не просят оставить отзыв, доверие не накапливается.",
  },
  {
    title: "Сайт и страницы",
    desc: "Нет страниц под услуги, районы, цены и вопросы перед покупкой. Клиент не получает ответ из поиска или нейросетей и уходит к агрегатору или конкуренту.",
  },
  {
    title: "Мессенджеры и формы",
    desc: "Обращения приходят, но ответ долгий, нет статуса, нет скрипта и повторного касания после первого сообщения.",
  },
  {
    title: "Звонки",
    desc: "Пропущенные звонки, поздний перезвон, нет понятного регламента и непонятно, сколько обращений можно вернуть повторным касанием.",
  },
  {
    title: "Ответы нейросетей",
    desc: "ChatGPT, Алиса, Perplexity и другие системы не знают бизнес, называют агрегаторы или увереннее рекомендуют конкурентов.",
  },
];

const MODULES = [
  {
    title: "1. Аудит видимости",
    checks: "Карты, 2ГИС, Авито, сайт, отзывы, формы, мессенджеры, звонки, поиск и ответы нейросетей.",
    actions: "Фиксируем, что мешает обращению: фото, услуги, цены, кнопки, категории, отзывы, негатив, пустые каналы и долгий ответ.",
    result: "Список приоритетов: что быстрее всего исправить, чтобы получать больше обращений уже сейчас.",
  },
  {
    title: "2. Гео-рейтинг, нейросети и конкуренты",
    checks: "Запросы рядом, цена, срочно, район, лучший, записаться; топ конкурентов в картах, поиске, Авито и нейросетях.",
    actions: "Сравниваем рейтинг, отзывы, фото, услуги, офферы, скорость ответа, упоминания в нейросетях и причины, почему конкуренты выглядят сильнее.",
    result: "Понятный ответ: что у конкурентов сильнее и какие элементы нужно усилить у вас.",
  },
  {
    title: "3. Ежедневные задачи",
    checks: "Какие действия быстрее двигают обращения: карточки, отзывы, Авито, FAQ, офферы, страницы под локальный спрос, повторные касания.",
    actions: "Даём задачи с приоритетом, ответственным, сроком, ожидаемым эффектом, метрикой и доказательством выполнения.",
    result: "Не “разберитесь с маркетингом”, а список действий на сегодня, неделю и 30 дней.",
  },
  {
    title: "4. Сбор и возврат отзывов",
    checks: "Свежесть отзывов, рейтинг, ответы на негатив, площадки, где отзывов не хватает, и сценарий запроса после услуги.",
    actions: "Настраиваем маршрут: довольный клиент идёт на Яндекс/2ГИС, недовольный сначала пишет владельцу или администратору.",
    result: "Больше цифрового доверия, меньше публичного негатива, сильнее карточки, поиск и ответы нейросетей.",
  },
  {
    title: "5. Возврат обращений",
    checks: "Пропущенные звонки, сообщения без ответа, заявки без повторного касания, клиенты после расчёта цены, старые обращения.",
    actions: "Собираем список возврата: кому перезвонить, что написать, какой оффер предложить, какие обращения ещё можно вернуть.",
    result: "Список клиентов для возврата и действия, которые превращают уже пришедший спрос в продажи.",
  },
];

const IMPLEMENTATION_TOOLS = [
  {
    title: "Сбор данных",
    desc: "Начинаем с открытых источников и ссылок клиента: карты, 2ГИС, Авито, сайт, отзывы, формы, мессенджеры, телефония и CRM при наличии доступа.",
    tools: "ручной аудит, таблица источников, снимки доказательств, выгрузки, открытые карточки, клиентские данные",
  },
  {
    title: "Проверка спроса и конкурентов",
    desc: "Смотрим реальные запросы рядом/цена/срочно/район, сравниваем карточки, отзывы, услуги, офферы и ответы нейросетей.",
    tools: "Wordstat/XMLRiver, SerpAPI, гео-запросы, проверка ChatGPT/Алисы/Perplexity/YandexGPT/GigaChat, матрица конкурентов",
  },
  {
    title: "Рекламные сигналы конкурентов",
    desc: "Смотрим, какие офферы, заголовки, посадочные страницы и призывы используют конкуренты в платной выдаче, чтобы усилить карточки, страницы и задачи роста.",
    tools: "разведка рекламных офферов, анализ посадочных страниц, сравнение призывов к действию, список гипотез без управления рекламными кабинетами",
  },
  {
    title: "Страницы под локальный спрос",
    desc: "Выбираем услуги, районы, цены и вопросы клиентов, где уже есть спрос, и собираем страницы, которые могут получать трафик из поиска и нейросетей.",
    tools: "карта возможностей страниц, генератор структуры страницы, FAQ, отзывы, локальная кнопка действия, разметка для поисковиков, ручная проверка перед публикацией",
  },
  {
    title: "Сигналы поведения клиентов",
    desc: "Смотрим, что люди делают после просмотра страницы, карточки или объявления: где кликают, где уходят, где заявка не доходит до продажи.",
    tools: "события страниц, клики по звонку/записи/маршруту, формы, звонки, мессенджеры, правила “поведение → задача роста”",
  },
  {
    title: "План привлечения клиентов",
    desc: "Каждая проблема превращается в действие: что усилить в карточке, отзыве, странице, оффере, скорости ответа или повторном касании.",
    tools: "индекс видимости, оценка потенциала возврата, список обращений для повторного касания, приоритеты 7/30 дней",
  },
  {
    title: "Внедрение задач",
    desc: "Исправляем не всё подряд, а то, что быстрее влияет на обращения: услуги, цены, FAQ, отзывы, офферы, кнопки записи, страницы под спрос.",
    tools: "ежедневные задачи, ответственный, срок, доказательство выполнения, шаблоны описаний, сценарии отзывов и повторных касаний",
  },
  {
    title: "Измерение результата",
    desc: "После правок смотрим не красивые отчёты, а изменение видимости, кликов, обращений, скорости ответа и возврата клиентов.",
    tools: "недельный отчёт, метрики карточек, заявки, звонки, клики, позиции, упоминания в нейросетях, список следующих действий",
  },
];

const PAGE_GENERATOR_BLOCKS = [
  {
    title: "Что выбираем",
    desc: "Услуги, районы, запросы рядом/цена/срочно, вопросы перед покупкой, трендовые услуги и офферы конкурентов.",
  },
  {
    title: "Что собираем",
    desc: "Страницу с понятным ответом, ценой или диапазоном, FAQ, отзывами, доказательствами, маршрутом и кнопкой звонка или записи.",
  },
  {
    title: "Как защищаем качество",
    desc: "Не публикуем пачку одинаковых текстов: каждая страница привязана к реальной услуге, источнику спроса и проходит ручную проверку.",
  },
  {
    title: "Что измеряем",
    desc: "Индексацию, просмотры, клики по звонку/записи/маршруту, заявки, упоминания в нейросетях и задачи на обновление страницы.",
  },
];

const ANTI_SEO_GATES = [
  {
    title: "Не запускаем без спроса",
    desc: "У страницы должен быть источник: запрос, район, услуга, тренд, вопрос клиента или конкурентный оффер.",
  },
  {
    title: "Не публикуем без оффера",
    desc: "На странице нужны услуга, цена или диапазон, доказательства, FAQ, отзывы и понятное действие.",
  },
  {
    title: "Не считаем без метрик",
    desc: "Каждая страница связана с индексацией, показами, кликами, звонками, заявками и статусом обработки.",
  },
  {
    title: "Не копим слабые страницы",
    desc: "Через 2-4 недели страница получает решение: работает, усилить, объединить, обновить или архивировать.",
  },
];

const RESULT_LOOP_ROWS = [
  ["Нет показов", "проверяем спрос, индексацию, sitemap, внутренние ссылки и уникальность"],
  ["Показы есть, кликов нет", "переписываем title, description, первый экран и оффер"],
  ["Клики есть, заявки нет", "усиливаем CTA, цену, FAQ, отзывы, форму и доверие"],
  ["Заявки есть, продаж нет", "проверяем скорость ответа, скрипт, follow-up и причину потери"],
];

const BEHAVIOR_SIGNAL_BLOCKS = [
  {
    signal: "Страницу смотрят, но не оставляют заявку",
    task: "Добавить цену или диапазон, FAQ, отзывы по услуге, доказательства и более понятную кнопку действия.",
  },
  {
    signal: "Кликают по телефону, но продаж мало",
    task: "Проверить пропущенные звонки, скорость ответа, скрипт администратора и повторный перезвон.",
  },
  {
    signal: "Часто задают один и тот же вопрос",
    task: "Добавить блок FAQ или создать отдельную страницу под этот вопрос.",
  },
  {
    signal: "Заявка пришла, но клиент не вернулся",
    task: "Поставить задачу на повторное касание: звонок, сообщение, уточнение цены или новый оффер.",
  },
];

const AI_QUERIES = [
  "какая стоматология рядом лучше",
  "где сделать имплантацию цена",
  "надёжный автосервис срочно",
  "какая клиника лучше в городе",
  "к кому обратиться по банкротству",
  "какой салон красоты выбрать",
];

const DELIVERABLES = [
  "индекс локальной видимости",
  "приоритеты роста по каналам",
  "сравнение с 5-10 конкурентами",
  "кого называют нейросети",
  "задачи на первые 7 дней",
  "план роста на 30 дней",
  "карта страниц под услуги, районы и вопросы клиентов",
  "сигналы поведения клиентов и задачи из них",
  "оценка обращений, которые можно вернуть",
  "рекомендация: делать самим, запускать с нами или брать сопровождение",
];

const METRICS = [
  "позиции в Яндекс Картах и 2ГИС",
  "заполненность карточек и услуг",
  "количество и свежесть отзывов",
  "ответы на негатив",
  "клики по звонку, маршруту и записи",
  "скорость ответа в мессенджерах",
  "пропущенные звонки и обращения без повторного касания",
  "упоминания вас и конкурентов в нейросетях",
  "просмотры, клики и заявки со страниц под локальный спрос",
  "страницы с просмотрами без заявок",
  "клики по телефону, форме, маршруту и записи",
  "заявки, записи и повторные касания",
];

const INDUSTRIES = [
  "Стоматологии",
  "Косметологии",
  "Салоны красоты",
  "Автосервисы",
  "Юридические фирмы",
  "Клиники и медкабинеты",
  "Детские центры",
  "Ремонт квартир",
  "Клининг",
  "Окна и кондиционеры",
];

const PLANS = [
  {
    name: "Аудит продаж",
    price: "9 900-29 900",
    period: "₽",
    desc: "За 3-7 дней показать, откуда можно быстрее получить больше обращений",
    features: [
      "карты, 2ГИС, Авито, сайт, отзывы и ответы нейросетей",
      "до 5-10 конкурентов по локальным запросам",
      "индекс видимости и приоритеты роста",
      "карта страниц: какие услуги, районы и вопросы запускать первыми",
      "первые сигналы поведения: где есть интерес, но нет заявки",
      "задачи на 7 дней и план на 30 дней",
      "если запускаем внедрение, аудит засчитывается в работу",
    ],
    cta: "Получить аудит",
    href: "#form",
    highlight: false,
  },
  {
    name: "Запуск за 30 дней",
    price: "49 000-150 000",
    period: "₽",
    desc: "Запустить первые точки входа под ключ",
    features: [
      "упаковка карточек, услуг, кнопок записи и офферов",
      "5-15 страниц под услуги, районы, цены и вопросы клиентов",
      "настройка событий: просмотры, клики, заявки, звонки и формы",
      "сценарии отзывов и ответы на негатив",
      "базовый учёт обращений для возврата",
      "недельный отчёт по внедрению и сигналам",
    ],
    cta: "Запустить канал",
    href: "/launch?package=local_sales_os",
    highlight: true,
  },
  {
    name: "Сопровождение продаж",
    price: "39 000-99 000",
    period: "₽/мес",
    desc: "Ежемесячное управление ростом обращений",
    features: [
      "ежедневные задачи и ритм внедрения",
      "мониторинг конкурентов, отзывов, Авито и нейросетей",
      "возврат обращений и повторные касания",
      "новые страницы под спрос и обновление уже опубликованных страниц",
      "задачи из поведения клиентов: что смотрят, где кликают, где теряются",
      "недельный отчёт: что сделано, что изменилось, где новые обращения",
    ],
    cta: "Обсудить сопровождение",
    href: "#form",
    highlight: false,
  },
];

function B2BLeadForm() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    contact: "",
    city: "",
    niche: "",
    website: "",
    platforms: "",
    competitors: "",
    avg_check: "",
    current_leads: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim() || !form.contact.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/b2b-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка отправки");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <div className="mb-4 text-4xl font-bold text-green-700">✓</div>
        <h3 className="text-2xl font-bold text-slate-950">Заявка отправлена</h3>
        <p className="mt-3 text-slate-600">
          Мы свяжемся с вами, уточним площадки и предложим формат аудита.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Имя *" value={form.name} onChange={(v) => updateField("name", v)} placeholder="Иван Иванов" required />
        <Field label="Компания *" value={form.company} onChange={(v) => updateField("company", v)} placeholder="Название компании" required />
        <Field label="Контакт *" value={form.contact} onChange={(v) => updateField("contact", v)} placeholder="@telegram или +7..." required />
        <Field label="Город / район" value={form.city} onChange={(v) => updateField("city", v)} placeholder="Москва, Казань, Сочи..." />
        <Field label="Ниша" value={form.niche} onChange={(v) => updateField("niche", v)} placeholder="стоматология, автосервис..." />
        <Field label="Сайт" value={form.website} onChange={(v) => updateField("website", v)} placeholder="site.ru" />
        <Field label="Средний чек" value={form.avg_check} onChange={(v) => updateField("avg_check", v)} placeholder="например, 7 000 ₽ или 35 000 ₽" />
      </div>

      <TextArea
        label="Ссылки на площадки"
        value={form.platforms}
        onChange={(v) => updateField("platforms", v)}
        placeholder="Яндекс Карты, 2ГИС, Авито, VK, Telegram, Google Maps..."
        rows={3}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea label="3-5 конкурентов" value={form.competitors} onChange={(v) => updateField("competitors", v)} placeholder="Кого считаете сильными в городе" rows={3} />
        <TextArea label="Заявки сейчас" value={form.current_leads} onChange={(v) => updateField("current_leads", v)} placeholder="Сколько обращений в месяц, откуда приходят, есть ли пропущенные звонки, CRM/телефония, обращения без повторного касания" rows={3} />
      </div>

      <TextArea
        label="Что хотите улучшить"
        value={form.message}
        onChange={(v) => updateField("message", v)}
        placeholder="Мало обращений, конкуренты выше в картах, слабые отзывы, долгие ответы, нужно больше записей или звонков..."
        rows={4}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-700 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
      >
        {submitting ? "Отправка..." : "Получить аудит видимости"}
      </button>

      <p className="text-center text-xs text-slate-500">
        Для первого разбора достаточно ссылок и контекста. Доступы к CRM, телефонии и кабинетам нужны только после согласования.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        placeholder={placeholder}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full resize-none rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        placeholder={placeholder}
      />
    </label>
  );
}

export default function ForBusinessPage() {
  return (
    <>
      <MarketingHeader />

      <section className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm">
                Клиенты из локального поиска
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-[1.06] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Запустим привлечение клиентов из карт, поиска, отзывов и AI
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
                За 7 дней покажем, какие каналы уже могут приводить больше клиентов:
                карты, 2ГИС, Авито, отзывы, сайт, мессенджеры, звонки, локальная
                выдача и ответы нейросетей. На выходе — приоритеты, задачи и план привлечения на 30 дней.
              </p>
            </FadeIn>

            <FadeIn delay={450}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#form"
                  className="rounded-md bg-blue-700 px-7 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  Получить план привлечения
                </a>
                <Link
                  href="/pricing"
                  className="rounded-md border border-slate-300 bg-white px-7 py-3.5 text-center text-base font-semibold text-slate-950 transition-colors hover:bg-slate-100"
                >
                  Смотреть пакеты
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Без обещаний “100 лидов”. Покажем, что именно можно улучшить
                и какие показатели будем отслеживать.
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={260}>
            <LocalSalesAuditMockup />
          </FadeIn>
        </div>
      </section>

      <section className="bg-emerald-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <FadeIn>
            <SevenDayResultPanel />
          </FadeIn>
          <FadeIn delay={150}>
            <RevenueCalculatorMockup />
          </FadeIn>
        </div>
      </section>

      <section className="border-y border-blue-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-10 text-center">
            <p className="text-sm font-semibold text-blue-700">Рабочая панель</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Панель собственника: каналы привлечения, конкуренты, отзывы, задачи и повторные касания
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Клиент должен видеть не PDF-аудит, а живую систему: какие каналы
              усиливаем, кто отвечает, какие задачи на сегодня и что изменилось за неделю.
            </p>
          </FadeIn>
          <FadeIn>
            <LocalSalesCockpitMockup />
          </FadeIn>
        </div>
      </section>

      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">
              Откуда бизнес может получать больше клиентов
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Клиент уже ищет услугу, сравнивает отзывы, смотрит карточки,
              спрашивает нейросети и звонит. Наша задача — сделать так, чтобы
              он выбрал вас и сделал первый шаг: звонок, запись или сообщение.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {LOSS_ZONES.map((zone, i) => (
              <FadeIn key={zone.title} delay={i * 60}>
                <div className="h-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-950">{zone.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{zone.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">
              5 модулей системы локальных продаж
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Каждый модуль показывает не только проблему, но и практический
              следующий шаг: что проверяем, что делаем и какой результат измеряем.
            </p>
          </FadeIn>

          <div className="space-y-4">
            {MODULES.map((module, i) => (
              <FadeIn key={module.title} delay={i * 80}>
                <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_1fr_1fr_1fr]">
                  <h3 className="text-xl font-semibold text-slate-950">{module.title}</h3>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Проверяем</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{module.checks}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Делаем</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{module.actions}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Измеряем</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{module.result}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-blue-100 bg-blue-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold text-blue-700">Как реализуем на практике</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Не лозунги, а система действий, задач и измерения
            </h2>
            <p className="mt-4 text-slate-600">
              B2B-клиент должен понимать, из чего складывается результат. Поэтому каждый этап
              привязан к источникам данных, инструментам и измеримому выходу.
            </p>
          </FadeIn>

          <div className="space-y-4">
            {IMPLEMENTATION_TOOLS.map((item, index) => (
              <FadeIn key={item.title} delay={index * 80}>
                <div className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.7fr_1fr_1.1fr]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Этап {index + 1}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{item.desc}</p>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">Инструменты</p>
                    <p className="mt-2 text-sm leading-relaxed text-blue-900">{item.tools}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <FadeIn>
              <p className="text-sm font-semibold text-blue-700">Генератор страниц привлечения</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
                Создаём страницы под услуги, районы и вопросы клиентов
              </h2>
              <p className="mt-5 leading-relaxed text-slate-600">
                После аудита бизнес получает не только список проблем. Мы выбираем
                подтверждённый локальный спрос и собираем страницы, которые помогают
                клиенту найти услугу в поиске, получить понятный ответ в нейросетях
                и перейти к звонку, записи, маршруту или заявке.
              </p>
            </FadeIn>

            <div className="grid gap-4 sm:grid-cols-2">
              {PAGE_GENERATOR_BLOCKS.map((block, index) => (
                <FadeIn key={block.title} delay={index * 80}>
                  <div className="h-full rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="text-sm font-bold text-blue-700">{index + 1}</div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{block.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{block.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-amber-100 bg-amber-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold text-amber-800">Anti-SEO-Failure</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Страницы не создаются ради отчёта или “массы контента”
            </h2>
            <p className="mt-4 text-slate-700">
              Local Sales OS защищает бизнес от типовой ошибки SEO: много опубликованных материалов,
              но нет заявок и непонятно, что делать дальше. Каждая страница проходит gate и review.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ANTI_SEO_GATES.map((gate, index) => (
              <FadeIn key={gate.title} delay={index * 80}>
                <div className="h-full rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-amber-700">{index + 1}</div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">{gate.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{gate.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-amber-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-950">Диагностическая матрица результата</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {RESULT_LOOP_ROWS.map(([signal, action]) => (
                <div key={signal} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{signal}</p>
                  <p className="mt-1 text-sm text-slate-600">{action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold text-blue-700">Сигналы поведения клиентов</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Система видит действия клиента и превращает их в задачи
            </h2>
            <p className="mt-4 text-slate-600">
              Поведение показывает, где интерес уже есть, но обращение не случилось:
              страницу читают, кнопку видят, по телефону кликают, вопрос повторяется,
              заявка пришла, но продажа не состоялась.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2">
            {BEHAVIOR_SIGNAL_BLOCKS.map((item, index) => (
              <FadeIn key={item.signal} delay={index * 80}>
                <div className="h-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Сигнал {index + 1}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.signal}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.task}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-10 text-center">
            <p className="text-sm font-semibold text-blue-700">Сценарии по отраслям</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              Для каждой ниши — свой первый шаг к клиенту
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Мы не продаём одну и ту же абстрактную “автоматизацию”. Для стоматологии
              важна запись на консультацию, для автосервиса — срочный звонок, для юрфирмы —
              первичный разбор, для салона — первый визит.
            </p>
          </FadeIn>
          <FadeIn>
            <VerticalScenarioGrid />
          </FadeIn>
        </div>
      </section>

      <section className="border-y border-emerald-100 bg-emerald-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">
              Пример: как аудит превращается в план привлечения
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Клиент видит не общие слова про маркетинг, а связку:
              что мешало обращению, что исправляем, кто отвечает и какой показатель смотрим.
            </p>
          </FadeIn>
          <FadeIn>
            <BeforeAfterPanel />
          </FadeIn>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <FadeIn>
              <p className="text-sm font-semibold text-blue-700">Ответы нейросетей уже влияют на выбор</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
                Клиенты спрашивают нейросети, кого выбрать
              </h2>
              <p className="mt-5 leading-relaxed text-slate-600">
                Мы проверяем, попадает ли бизнес в ответы ChatGPT, Алисы,
                Perplexity, YandexGPT и других систем, кого нейросети рекомендуют
                вместо него и какие источники нужно усилить: карточки, отзывы,
                страницы, FAQ, экспертные ответы и локальные доказательства.
              </p>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                <p className="text-sm font-semibold text-blue-900">Примеры запросов клиентов</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {AI_QUERIES.map((query) => (
                    <div key={query} className="rounded-md border border-blue-200 bg-white p-4 text-sm text-slate-700">
                      “{query}”
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">
              Что вы получите через 7 дней
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Первый результат — не “доступ к платформе”, а понятный список
              каналов роста, приоритетов и действий, которые нужно сделать дальше.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-4">
            {DELIVERABLES.map((item, i) => (
              <FadeIn key={item} delay={i * 60}>
                <div className="h-full rounded-lg border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 shadow-sm">
                  {item}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <FadeIn>
              <p className="text-sm font-semibold text-blue-700">Как внедряем</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
                Сначала аудит, затем запуск, потом операционная система
              </h2>
              <p className="mt-5 leading-relaxed text-slate-600">
                Мы не начинаем с тяжёлых интеграций. Сначала используем открытые
                данные, ваши ссылки, ручную проверку и выгрузки. После первых
                платных пилотов подключаем полуавтоматические источники и личный кабинет.
              </p>
            </FadeIn>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["7 дней", "Аудит", "Каналы роста, конкуренты, ответы нейросетей, задачи на неделю и план на 30 дней."],
                ["30 дней", "Запуск", "Упаковка карточек, отзывов, Авито, страниц, кнопок записи и первых повторных касаний."],
                ["каждый месяц", "Сопровождение", "Ежедневные задачи, недельный отчёт, повторные касания и развитие точек входа."],
              ].map(([term, title, desc], i) => (
                <FadeIn key={title} delay={i * 100}>
                  <div className="h-full rounded-lg border border-slate-200 bg-slate-50 p-6">
                    <div className="text-sm font-bold text-blue-700">{term}</div>
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">
              Эффективность измеряем по коммерческим сигналам
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Мы не обещаем фиксированное число клиентов без данных. Но показываем
              метрики, которые влияют на поток обращений, записи и продажи.
            </p>
          </FadeIn>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {METRICS.map((metric) => (
              <FadeIn key={metric}>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                  {metric}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">
              Пакеты внедрения
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Клиент покупает не набор функций, а степень нашего участия:
              диагностика, запуск под ключ или ежемесячное управление ростом.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 150}>
                <div
                  className={`relative h-full overflow-hidden rounded-lg border p-8 shadow-sm ${
                    plan.highlight
                      ? "border-blue-700 bg-blue-700 text-white shadow-blue-900/20"
                      : "border-slate-200 bg-white text-slate-950"
                  }`}
                >
                  <h3 className={plan.highlight ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-950"}>{plan.name}</h3>
                  <p className={plan.highlight ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-600"}>{plan.desc}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className={plan.highlight ? "text-4xl font-bold text-white" : "text-4xl font-bold text-slate-950"}>{plan.price}</span>
                    <span className={plan.highlight ? "text-slate-400" : "text-slate-500"}>{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className={plan.highlight ? "flex items-start gap-2 text-sm text-slate-200" : "flex items-start gap-2 text-sm text-slate-700"}>
                        <span className={plan.highlight ? "flex-shrink-0 text-green-300" : "flex-shrink-0 text-green-700"}>✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={plan.href}
                    className={`mt-8 block w-full rounded-2xl py-3 text-center font-semibold transition-all ${
                      plan.highlight
                        ? "bg-white text-blue-800 hover:bg-blue-50"
                        : "border border-slate-300 bg-white text-slate-950 hover:bg-slate-50"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">
              Для каких компаний
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Лучше всего работает там, где высокий чек, локальная конкуренция,
              важны отзывы и клиент сравнивает несколько вариантов перед звонком или записью.
            </p>
          </FadeIn>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {INDUSTRIES.map((industry, i) => (
              <FadeIn key={industry} delay={Math.min(i * 50, 400)}>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <p className="text-sm font-medium text-slate-700">{industry}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FadeIn>
              <div className="h-full rounded-lg border border-green-200 bg-green-50 p-8">
                <h2 className="text-2xl font-bold text-slate-950">Что делаем</h2>
                <ul className="mt-5 space-y-3 text-sm text-green-900">
                  <li>✓ показываем, какие каналы и конкуренты сильнее влияют на выбор клиента</li>
                  <li>✓ запускаем страницы, карточки, отзывы, кнопки записи и повторные касания</li>
                  <li>✓ даём ежедневные задачи и недельный отчёт</li>
                  <li>✓ измеряем клики, обращения, записи, упоминания в нейросетях и повторные касания</li>
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="h-full rounded-lg border border-amber-200 bg-amber-50 p-8">
                <h2 className="text-2xl font-bold text-slate-950">Чего не обещаем</h2>
                <ul className="mt-5 space-y-3 text-sm text-amber-900">
                  <li>— фиксированное число клиентов без данных</li>
                  <li>— первое место в картах или поиске за любой срок</li>
                  <li>— гарантированное цитирование в нейросетях</li>
                  <li>— рискованный парсинг как основу продукта</li>
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section id="form" className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <h2 className="mb-2 text-center text-2xl font-bold text-slate-950">
                Получить аудит локального спроса
              </h2>
              <p className="mb-8 text-center text-slate-600">
                Оставьте контакты и ссылки на основные площадки. Мы скажем,
                где стоит начинать: карты, 2ГИС, Авито, отзывы, сайт, ответы нейросетей
                или повторные касания клиентов.
              </p>
              <B2BLeadForm />
            </div>
          </FadeIn>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
