import Link from "next/link";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { PipelineStep } from "./pipeline-step";

const PIPELINE_STEPS = [
  {
    num: "01",
    title: "Карта спроса",
    short: "Система находит реальные вопросы людей и оценивает, какие из них ближе всего к заявке.",
    icon: "🔍",
    details: [
      "Собираем вопросы из Wordstat, Яндекс Кью, поисковых подсказок и AI-ответов",
      "Смотрим спрос в месяц, intent, конкуренцию и слабость текущего ответа в нейросетях",
      "Отделяем темы «почитать» от тем, где человек уже выбирает эксперта, клинику, юриста или услугу",
      "Результат: список возможностей спроса с приоритетом, потенциалом заявки и рекомендуемым CTA",
    ],
  },
  {
    num: "02",
    title: "Возможность спроса",
    short: "Вы получаете карточку темы: вопрос, спрос, intent, слабость AI-ответа и рекомендуемый следующий шаг.",
    icon: "📲",
    details: [
      "Формулировка вопроса и примерная частотность",
      "Почему по теме может прийти заявка: запись, разбор, консультация или расчёт",
      "Что в текущих ответах поиска и нейросетей слабое: нет эксперта, примеров, цифр или источников",
      "Принять или пропустить тему можно из dashboard или Telegram",
    ],
  },
  {
    num: "03",
    title: "Голос эксперта",
    short: "Наговариваете 3-10 минут в Telegram или на сайте. Ваши кейсы, ваш опыт, ваш стиль.",
    icon: "🎙️",
    details: [
      "Голосовое сообщение в Telegram-боте или Web Audio на сайте",
      "Whisper AI транскрибирует с точностью 95%+ на русском",
      "Содержание идёт от вас: практика, кейсы, ограничения, честные нюансы",
      "AI не заменяет эксперта, а превращает вашу речь в структуру страницы",
      "Стоимость транскрибации: ~5 рублей за 10 минут",
    ],
  },
  {
    num: "04",
    title: "Страница под вопрос",
    short: "Голос превращается в экспертную страницу под конкретный спрос, а дополнительные форматы помогают распространению.",
    icon: "✍️",
    details: [
      "SEO-страница с понятным ответом, TL;DR, таблицами, FAQ и источниками",
      "Блок доверия: профиль эксперта, опыт, специализация, голосовая основа материала",
      "CTA под intent: записаться, получить разбор, задать вопрос или рассчитать стоимость",
      "Дополнительно: Telegram-пост, карточки, Reels/Shorts-сценарий и FAQ для ваших каналов",
    ],
  },
  {
    num: "05",
    title: "Публикация и продвижение",
    short: "Страница публикуется, отправляется на индексацию и получает первые точки входа из поиска и нейросетей.",
    icon: "🚀",
    details: [
      "SSR-рендер на стороне сервера (Next.js) — контент отдаётся без задержки на загрузку JavaScript",
      "Schema.org: Article + FAQPage + Person + BreadcrumbList + HowTo",
      "robots.txt открыт для поисковых систем и AI-краулеров",
      "Автоматическая подача в Google, Яндекс и Bing через sitemap",
      "Кросспост на Дзен, Хабр, Яндекс Кью (тариф Pro+)",
      "Кнопка «Записаться к эксперту» на каждой странице",
    ],
  },
  {
    num: "06",
    title: "Трекинг результата",
    short: "Отслеживаем опубликованные страницы, индексацию, трафик, клики по записи, заявки и AI-упоминания.",
    icon: "📊",
    details: [
      "Воронка в dashboard: опубликовано -> проиндексировано -> трафик -> клики -> заявки",
      "Мониторинг позиций в Яндексе и Google",
      "Проверка AI-ответов: появился ли эксперт или страница в ответе нейросети",
      "Топ страниц по кликам и заявкам",
      "Рекомендации: какие темы обновить, усилить или продвинуть следующими",
    ],
  },
];

const MODULES = [
  {
    name: "Demand Finder",
    tagline: "Карта реального спроса",
    desc: "Находит вопросы, которые люди уже задают в поиске и нейросетях, и ранжирует их по спросу, intent и потенциалу заявки.",
    color: "bg-red-500/10 border-red-500/20",
    textColor: "text-red-300",
  },
  {
    name: "Voice Engine",
    tagline: "Голос в экспертный материал",
    desc: "10 минут голоса в Telegram превращаются в структурированный ответ. AI оформляет, но содержание ваше: кейсы, примеры, авторский стиль, прямые цитаты.",
    color: "bg-orange-500/10 border-orange-500/20",
    textColor: "text-orange-300",
  },
  {
    name: "Page Builder",
    tagline: "Страница под вопрос",
    desc: "Создаёт SEO-страницу с E-E-A-T, FAQ, Schema.org, аудиоосновой и CTA. Каждая страница работает как вход в консультацию или услугу.",
    color: "bg-blue-500/10 border-blue-500/20",
    textColor: "text-blue-300",
  },
  {
    name: "Distribution Layer",
    tagline: "Индексация и распространение",
    desc: "Отправляет страницы в sitemap, помогает с кросспостом и делает контент доступным для Яндекса, Google и AI-краулеров.",
    color: "bg-purple-500/10 border-purple-500/20",
    textColor: "text-purple-300",
  },
  {
    name: "Result Analytics",
    tagline: "Метрики результата",
    desc: "Показывает путь от темы к клиенту: страницы, индексацию, просмотры, клики по записи, заявки, поисковые позиции и AI-упоминания.",
    color: "bg-green-500/10 border-green-500/20",
    textColor: "text-green-300",
  },
];

const DEMAND_SIGNALS = [
  { marker: "Спрос", question: "Сколько людей ищут этот вопрос и похожие формулировки?" },
  { marker: "Intent", question: "Человек просто изучает тему или уже выбирает специалиста, услугу, цену и формат помощи?" },
  { marker: "Слабость ответа", question: "Даёт ли поиск или AI общий ответ без эксперта, примеров, цифр и источников?" },
  { marker: "CTA", question: "Какое действие естественно после ответа: запись, разбор, диагностика, расчёт или консультация?" },
];

const ACQUISITION_MECHANICS = [
  {
    title: "Одна страница под один вопрос",
    desc: "Страница не расплывается по теме. Она отвечает на конкретный вопрос пользователя и ведёт к конкретному действию.",
  },
  {
    title: "SEO + Schema.org",
    desc: "Article, FAQPage, Person, BreadcrumbList и HowTo помогают поиску и нейросетям понять автора, вопрос, ответ и структуру.",
  },
  {
    title: "Открыто для поиска и AI",
    desc: "Страницы доступны Google, Яндексу, Bing и AI-краулерам. AI-ответы становятся дополнительным каналом привлечения.",
  },
  {
    title: "Доверие к эксперту",
    desc: "Профиль, опыт, специализация, аудиооснова и авторские цитаты показывают, что за ответом стоит практик.",
  },
  {
    title: "CTA под намерение",
    desc: "На странице нет абстрактного «свяжитесь с нами». CTA выбирается под вопрос: запись, разбор, расчёт, диагностика или консультация.",
  },
  {
    title: "Улучшение по данным",
    desc: "Мы видим, какие страницы получили показы, клики и заявки, и усиливаем именно те темы, где спрос подтверждается поведением людей.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      {/* Hero */}
      <section className="pb-16 pt-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Как работает{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">НейроЭксперт</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            Полный цикл: от вопроса с массовым спросом до клиента, который записался к вам.
            Шесть шагов, пять модулей, понятная воронка от страницы к заявке.
          </p>
        </div>
      </section>

      {/* Пайплайн: 6 шагов */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            6 шагов от вопроса до клиента
          </h2>
          <div className="mt-12 space-y-6">
            {PIPELINE_STEPS.map((step) => (
              <PipelineStep key={step.num} step={step} />
            ))}
          </div>
        </div>
      </section>

      {/* 5 модулей */}
      <section className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            5 модулей платформы
          </h2>
          <p className="mt-4 text-center text-gray-400 max-w-2xl mx-auto">
            Каждый модуль решает конкретную задачу: найти спрос, получить ответ эксперта,
            опубликовать страницу и измерить путь до заявки.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((mod, i) => (
              <div
                key={mod.name}
                className={`rounded-2xl border p-6 ${mod.color} backdrop-blur-sm ${i === 4 ? "md:col-span-2 lg:col-span-1" : ""}`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wider ${mod.textColor}`}>
                  Модуль {i + 1}
                </div>
                <h3 className="mt-2 text-lg font-bold text-white">{mod.name}</h3>
                <p className="text-sm font-medium text-gray-400">{mod.tagline}</p>
                <p className="mt-3 text-sm text-gray-300">{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Как страница приводит заявки */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Как страница превращается в канал заявок
          </h2>
          <p className="mt-4 text-center text-gray-400 max-w-3xl mx-auto">
            Сначала мы выбираем вопрос, где уже есть спрос. Затем публикуем ответ эксперта
            так, чтобы его могли найти люди в Яндексе, Google и нейросетях, а после чтения
            перейти к понятному действию.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ACQUISITION_MECHANICS.map((mech, i) => (
              <div key={mech.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
                  {i + 1}
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{mech.title}</h3>
                <p className="mt-2 text-sm text-gray-400">{mech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Выбор вопросов */}
      <section className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Как мы выбираем вопросы с шансом на заявку
          </h2>
          <p className="mt-4 text-center text-gray-400 max-w-2xl mx-auto">
            Нейросети важны, но это не единственный критерий. Мы смотрим на реальный спрос,
            намерение человека и то, может ли экспертный ответ естественно привести к записи.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {DEMAND_SIGNALS.map((item) => (
              <div key={item.marker} className="rounded-xl bg-white/5 border border-white/10 p-5">
                <div className="text-sm font-semibold text-blue-400">{item.marker}</div>
                <p className="mt-1 text-sm text-gray-300">{item.question}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-400">
            Поэтому карточка темы показывает не только gap_score, но и спрос/мес,
            intent, слабость AI-ответа, потенциал заявки и рекомендуемый CTA.
          </p>
        </div>
      </section>

      {/* Реалистичные результаты */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Первые измеримые результаты
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Никто не может честно гарантировать фиксированное число клиентов без данных.
            Поэтому первый запуск оцениваем по этапам воронки, а не по красивым обещаниям.
          </p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Период</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Что измеряем</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Что считаем успехом</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="px-4 py-3 font-medium text-white">0-30 дней</td>
                  <td className="px-4 py-3 text-center text-gray-400">страницы, индексация, первые показы</td>
                  <td className="px-4 py-3 text-gray-400">канал запущен, страницы доступны поиску и AI</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="px-4 py-3 font-medium text-white">30-60 дней</td>
                  <td className="px-4 py-3 text-center text-gray-400">трафик, клики по записи, заявки</td>
                  <td className="px-4 py-3 text-gray-400">видно, какие темы начинают приводить людей</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">60-90 дней</td>
                  <td className="px-4 py-3 text-center text-blue-400 font-semibold">рост сильных страниц</td>
                  <td className="px-4 py-3 text-gray-400">обновляем и продвигаем темы, где спрос подтвердился</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            AI-упоминания остаются важной метрикой, но в отчёте они стоят рядом
            с более коммерческими сигналами: трафиком, кликами по записи и заявками.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Начните с карты спроса
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Увидите вопросы, по которым люди уже ищут решение, и поймёте,
            какие страницы стоит запускать первыми.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/audit"
              className="rounded-lg bg-white px-10 py-4 text-lg font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Получить карту спроса
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border-2 border-white/50 px-10 py-4 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Тарифы
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
