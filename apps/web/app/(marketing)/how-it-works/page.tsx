import Link from "next/link";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { PipelineStep } from "./pipeline-step";

const PIPELINE_STEPS = [
  {
    num: "01",
    title: "Поиск спроса",
    short: "Система анализирует тысячи запросов и находит вопросы, где нейросети дают слабый ответ.",
    icon: "🔍",
    details: [
      "Анализ Wordstat: 200-500 вопросов с частотностью 1 000+ в месяц по каждой нише",
      "Прогон через ChatGPT, Perplexity, YandexGPT, GigaChat — поиск «слепых зон»",
      "Оценка по объективным маркерам: есть ли имя эксперта, конкретные примеры, цифры, ссылки на источник",
      "Результат: 10 лучших вопросов, где ваша экспертиза заполнит пробел (в рамках ваших ниш — от 1 до 10 по тарифу)",
    ],
  },
  {
    num: "02",
    title: "Заказ эксперту",
    short: "Вы получаете в Telegram готовый заказ — вопрос + текущий слабый ответ нейросети.",
    icon: "📲",
    details: [
      "Формулировка вопроса + сколько людей его ищут в месяц",
      "Текущий ответ нейросети — чтобы вы увидели: «я знаю лучше»",
      "Рекомендация: на чём сделать акцент в ответе",
      "Принять или пропустить — одним нажатием",
    ],
  },
  {
    num: "03",
    title: "Запись голоса",
    short: "Наговариваете 3-10 минут в Telegram или на сайте. Ваши кейсы, ваш опыт, ваш стиль.",
    icon: "🎙️",
    details: [
      "Голосовое сообщение в Telegram-боте или Web Audio на сайте",
      "Whisper AI транскрибирует с точностью 95%+ на русском",
      "Содержание — от вас. AI только оформляет",
      "Стоимость транскрибации: ~5 рублей за 10 минут",
    ],
  },
  {
    num: "04",
    title: "5 форматов контента",
    short: "Система превращает голос в 5 готовых форматов за одну обработку.",
    icon: "✍️",
    details: [
      "SEO-статья 2 900-3 500 слов с TL;DR, таблицами, FAQ и ссылками на источники",
      "Пост для Telegram: 1 000-2 000 символов с заголовком и CTA",
      "5 карточек для соцсетей: тезисы по 200 символов",
      "Скрипт для Reels/Shorts: 60-секундный сценарий",
      "FAQ-блок: 3-5 вопросов-ответов со Schema.org разметкой",
    ],
  },
  {
    num: "05",
    title: "Публикация",
    short: "Экспертная страница на платформе + кросспост на популярные площадки.",
    icon: "🚀",
    details: [
      "SSR-рендер на стороне сервера (Next.js) — контент отдаётся без задержки на загрузку JavaScript",
      "Schema.org: Article + FAQPage + Person + BreadcrumbList + HowTo",
      "robots.txt открыт для GPTBot, ClaudeBot, PerplexityBot, YandexBot",
      "Автоматическая подача в Google, Яндекс и Bing через sitemap",
      "Кросспост на Дзен, Хабр, Яндекс Кью (тариф Pro+)",
      "Кнопка «Записаться к эксперту» на каждой странице",
    ],
  },
  {
    num: "06",
    title: "Трекинг и клиенты",
    short: "Отслеживаем цитирование нейросетями, позиции в поиске и заявки от клиентов.",
    icon: "📊",
    details: [
      "Еженедельный прогон через 3+ нейросети: ищем ваше имя и ссылку",
      "Мониторинг позиций в Яндексе и Google",
      "Трекинг заявок через «Записаться»",
      "Expert Trust Score — публичный рейтинг экспертности",
      "Дашборд с рекомендациями: что делать дальше",
    ],
  },
];

const MODULES = [
  {
    name: "AI Gap Finder",
    tagline: "Поиск возможностей",
    desc: "Анализирует тысячи запросов и находит вопросы, где нейросети дают слабый ответ по вашей теме. Вы получаете готовые «заказы» — не нужно думать, о чём писать.",
    color: "bg-red-500/10 border-red-500/20",
    textColor: "text-red-300",
  },
  {
    name: "Voice Engine",
    tagline: "Голос в контент",
    desc: "10 минут голоса в Telegram превращаются в 5 форматов AIO-контента. AI оформляет, но содержание — ваше: кейсы, примеры, авторский стиль, прямые цитаты.",
    color: "bg-orange-500/10 border-orange-500/20",
    textColor: "text-orange-300",
  },
  {
    name: "Publishing Network",
    tagline: "Публикация и лидогенерация",
    desc: "SSR-страницы с AIO-разметкой, открытые для AI-краулеров. На каждой — кнопка «Записаться», email-захват, «похожие вопросы». Каждая страница = работающий лендинг.",
    color: "bg-blue-500/10 border-blue-500/20",
    textColor: "text-blue-300",
  },
  {
    name: "Citation Tracker",
    tagline: "Трекинг и аналитика",
    desc: "Еженедельная проверка: цитируют ли вас ChatGPT, Perplexity, YandexGPT, GigaChat. Позиции в поиске. Заявки. Expert Trust Score — ваш публичный рейтинг.",
    color: "bg-purple-500/10 border-purple-500/20",
    textColor: "text-purple-300",
  },
  {
    name: "Marketplace",
    tagline: "Маркетплейс экспертов",
    desc: "Каталог с фильтрами по нише, городу, рейтингу, цене. Клиенты записываются и оплачивают через платформу. Вы — сверху выдачи благодаря Expert Trust Score.",
    color: "bg-green-500/10 border-green-500/20",
    textColor: "text-green-300",
  },
];

const BLIND_SPOT_MARKERS = [
  { marker: "Имя эксперта", question: "Ссылается ли ответ на конкретного специалиста?" },
  { marker: "Конкретные примеры", question: "«Из 200 пациентов...» или «в целом рекомендуется...»?" },
  { marker: "Цифры и сроки", question: "Есть конкретные данные или размытые формулировки?" },
  { marker: "Ссылка на источник", question: "Указан ли URL или автор?" },
];

const CITATION_MECHANICS = [
  {
    title: "Целимся в пустоту",
    desc: "Выбираем вопросы, где AI-ответ слабый и конкуренция за цитирование минимальна. Как SEO по низкоконкурентным запросам — работает предсказуемо.",
  },
  {
    title: "Schema.org разметка",
    desc: "До 5 типов на страницу: Article, FAQPage, Person, BreadcrumbList, HowTo. Контент с правильной разметкой получает на 25-40% больше AI-цитирований.",
  },
  {
    title: "Открытый robots.txt",
    desc: "GPTBot, ClaudeBot, PerplexityBot — мы разрешаем. Большинство сайтов блокируют AI-краулеры. Мы — приглашаем.",
  },
  {
    title: "Авторитет домена",
    desc: "Больше экспертных страниц — выше авторитет. 60-80% источников в AI-ответах берутся из топ-10 поиска. Сетевой эффект работает на каждого эксперта.",
  },
  {
    title: "Формат «вопрос-ответ»",
    desc: "Совпадает с паттерном RAG-поиска нейросетей. Нейросеть ищет ответ на вопрос — и находит наш контент в идеальном формате.",
  },
  {
    title: "Реальный автор + E-E-A-T",
    desc: "Верифицированный эксперт, образование, стаж, аудиозапись голоса на странице. Нейросети учитывают авторитетность источника.",
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
            Шесть шагов, пять модулей, шесть механик попадания в ответы нейросетей.
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
            Каждый модуль решает конкретную задачу. Вместе они образуют единственный на российском рынке
            полный AIO-цикл для экспертов.
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

      {/* Как контент попадает в нейросети */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Как контент попадает в ответы нейросетей
          </h2>
          <p className="mt-4 text-center text-gray-400 max-w-3xl mx-auto">
            Perplexity, YandexGPT, Google AI Overviews работают по RAG: сначала ищут страницы обычным поиском,
            потом скармливают текст нейросети. Если страница в топ-20 — нейросети её видят.
            Мы контролируем 6 из 7 факторов, влияющих на цитирование.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CITATION_MECHANICS.map((mech, i) => (
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

      {/* Слепые зоны AI */}
      <section className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Как мы находим «слепые зоны» AI
          </h2>
          <p className="mt-4 text-center text-gray-400 max-w-2xl mx-auto">
            Мы не просим нейросеть оценить свой ответ — это абсурд. Вместо этого проверяем объективные маркеры,
            которые AI определяет быстрее человека.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {BLIND_SPOT_MARKERS.map((item) => (
              <div key={item.marker} className="rounded-xl bg-white/5 border border-white/10 p-5">
                <div className="text-sm font-semibold text-blue-400">{item.marker}</div>
                <p className="mt-1 text-sm text-gray-300">{item.question}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-400">
            Это не «AI оценивает качество AI» — это чек-лист объективных признаков.
            Как spell-checker не «понимает» текст, а проверяет правила.
            Дополнительно: эксперт сам видит слабый ответ нейросети в карточке заказа и подтверждает: «я знаю лучше».
          </p>
        </div>
      </section>

      {/* Реалистичные цифры */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Реалистичные цифры
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Полного контроля нет ни у кого. Но мы играем правильно — и выигрываем в долгосрочной перспективе.
          </p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Период</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">% цитирования</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Что происходит</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="px-4 py-3 font-medium text-white">Месяц 1</td>
                  <td className="px-4 py-3 text-center text-gray-400">~5%</td>
                  <td className="px-4 py-3 text-gray-400">Индексация, первые упоминания</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="px-4 py-3 font-medium text-white">Месяц 2-3</td>
                  <td className="px-4 py-3 text-center text-gray-400">10-15%</td>
                  <td className="px-4 py-3 text-gray-400">Домен набирает авторитет, растёт трафик</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white">Месяц 4-6</td>
                  <td className="px-4 py-3 text-center text-blue-400 font-semibold">20-30%</td>
                  <td className="px-4 py-3 text-gray-400">Стабильный поток цитирований и клиентов</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            При 24 страницах за 6 месяцев и 25% цитировании — это 6 страниц, каждая приносящая 50-200 визитов.
            Достаточно для ROI при подписке 2 990 &#8381;.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Убедились? Начните с бесплатного аудита
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Увидите реальные «слепые зоны» нейросетей в вашей нише за 30 секунд.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/audit"
              className="rounded-lg bg-white px-10 py-4 text-lg font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Бесплатный аудит
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

