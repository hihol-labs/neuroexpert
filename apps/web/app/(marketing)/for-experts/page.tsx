import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, Bot, Clock, EyeOff, FileText, Lightbulb, Megaphone, Mic2, Radar, Users } from "lucide-react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { SoloDemandSignalMockup } from "@/components/marketing/product-mockups";
import { generateServiceSchema } from "@/lib/schema-org";

const TITLE = "Новые клиенты для экспертов из поиска и нейросетей | НейроЭксперт";
const DESCRIPTION =
  "НейроЭксперт находит реальные вопросы клиентов, превращает голосовые ответы эксперта в страницы с кнопкой записи и помогает получать заявки из поиска и нейросетей.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for-experts" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-experts" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const PAINS = [
  {
    Icon: Lightbulb,
    title: "Не знаю, о чём писать",
    desc: "Садитесь за пост — и зависаете. Выбираете тему наугад. Результата нет.",
    solution: "Система находит вопросы с подтверждённым спросом и показывает, какие из них ближе всего к заявке. Вы точно знаете: эта тема нужна людям.",
  },
  {
    Icon: Clock,
    title: "Нет времени на контент",
    desc: "Работа с клиентами 6-8 часов. Писать посты — ещё 2 часа. Большинство бросает через 2 месяца.",
    solution: "Наговорите 3-10 минут голосом в Telegram. Система создаст 5 форматов: статью, пост, карточки, сценарий короткого видео и FAQ.",
  },
  {
    Icon: EyeOff,
    title: "Пишу, но никто не видит",
    desc: "Канал на 300 подписчиков, охват 50 человек. Нет сайта, не знаете SEO.",
    solution: "Мы публикуем страницу под конкретный вопрос: понятный ответ, структура для поиска и нейросетей, кнопка «Записаться к вам».",
  },
  {
    Icon: BarChart3,
    title: "Не понимаю, что работает",
    desc: "Нет связи между контентом и клиентами. Пишете в пустоту.",
    solution: "Личный кабинет показывает: какие страницы опубликованы, что индексируется, сколько пришло посетителей, кликов и заявок. Вы видите путь от темы к клиенту.",
  },
  {
    Icon: Users,
    title: "Коллеги видимы, а я — нет",
    desc: "Специалисты с меньшим опытом собирают аудиторию благодаря активному ведению соцсетей. Вас — не видно.",
    solution: "Мы целимся в вопросы, где есть спрос и слабые ответы. Ваша экспертиза закрывает пробел — и страница получает шанс работать в поиске и ответах нейросетей.",
  },
  {
    Icon: Bot,
    title: "Нейросети дают неточные советы по моей теме",
    desc: "ChatGPT рекомендует устаревшее, клиенты приходят с ложными ожиданиями.",
    solution: "Ваш экспертный ответ замещает неточный. Это и привлечение клиентов, и миссия — улучшение качества информации для людей.",
  },
];

const PROOF_NUMBERS = [
  { value: "Спрос", label: "сначала ищем реальные вопросы людей, а не придумываем темы" },
  { value: "Голос", label: "эксперт отвечает как человек, нейросеть только структурирует материал" },
  { value: "Заявка", label: "каждая страница ведёт к действию: запись, разбор или консультация" },
];

const CLIENT_PATHS = [
  {
    title: "Человек ищет проблему",
    desc: "В Яндексе, Google или нейросети он спрашивает не “ваш бренд”, а конкретную боль, цену, выбор или риск.",
  },
  {
    title: "Страница даёт экспертный ответ",
    desc: "На странице есть ваш опыт, понятная структура, профиль эксперта, FAQ и ответ на коммерческий вопрос.",
  },
  {
    title: "Кнопка ведёт к записи",
    desc: "После ответа человек видит действие: записаться, задать вопрос, получить разбор или консультацию.",
  },
  {
    title: "Вы видите результат",
    desc: "В кабинете считаются опубликованные страницы, индексация, просмотры, клики по записи, заявки и упоминания в нейросетях.",
  },
];

const EXPERT_MECHANISMS = [
  {
    Icon: Radar,
    title: "1. Карта спроса",
    result: "Показывает вопросы, где человек уже близок к записи или консультации.",
    tools: "Wordstat/XMLRiver, Яндекс Кью через SerpAPI, поисковые подсказки, похожие вопросы, проверка ответов нейросетей, оценка слабости ответа.",
    output: "Карточка темы: спрос в месяц, намерение пользователя, слабость текущего ответа, шанс на заявку и рекомендуемое действие.",
  },
  {
    Icon: Mic2,
    title: "2. Голос эксперта",
    result: "Сохраняет вашу экспертизу, кейсы, ограничения и стиль ответа.",
    tools: "Telegram-бот, запись на сайте, Whisper/Yandex SpeechKit, уточняющие вопросы после записи, режим минимальной обработки.",
    output: "Транскрипт, авторские цитаты, структура ответа, FAQ и фактура для страницы.",
  },
  {
    Icon: FileText,
    title: "3. Страница под вопрос",
    result: "Делает из ответа публичную страницу, которую понимают поиск, нейросети и клиент.",
    tools: "SSR-страницы, Schema.org Article/Person/FAQPage, E-E-A-T-блок, FAQ, таблицы, короткое резюме, кнопка записи.",
    output: "Индексируемая страница под конкретный вопрос с профилем эксперта и понятным действием.",
  },
  {
    Icon: Megaphone,
    title: "4. Публикация и распространение",
    result: "Даёт странице первые точки входа и помогает ей попасть в индекс.",
    tools: "Sitemap, robots.txt, отправка в Google/Яндекс/Bing, кросспостинг, внутренние ссылки, страницы ниш и каталога.",
    output: "Опубликованная страница, материалы для каналов и первые сигналы индексации.",
  },
  {
    Icon: BarChart3,
    title: "5. Аналитика результата",
    result: "Показывает путь от темы к просмотрам, кликам по записи и заявкам.",
    tools: "События страниц, заявки, позиции, упоминания в нейросетях, Trust Score, рекомендации на обновление.",
    output: "В личном кабинете видно, какие темы работают, что усилить и какие страницы обновить.",
  },
];

export default function ForExpertsPage() {
  const schemas = [
    generateServiceSchema({
      name: "НейроЭксперт для экспертов",
      description: DESCRIPTION,
      url: `${APP_URL}/for-experts`,
      serviceType: "Expert visibility and demand generation SaaS",
      offers: [
        { name: "Free", price: "0", url: `${APP_URL}/pricing` },
        { name: "Starter", price: "1490", url: `${APP_URL}/pricing` },
        { name: "Pro", price: "2990", url: `${APP_URL}/pricing` },
        { name: "Expert", price: "4990", url: `${APP_URL}/pricing` },
      ],
    }),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <MarketingHeader />

      <section className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              НейроЭксперт для экспертов
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl">
              Ваши знания превращаются в страницы, которые приводят клиентов
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
              НейроЭксперт находит вопросы, по которым люди уже ищут решение
              и выбирают специалиста. Вы отвечаете голосом, а мы превращаем
              ответ в страницу с понятным действием: записаться, задать вопрос или
              получить разбор.
            </p>
            <p className="mt-4 max-w-xl text-base text-slate-600">
              Логика простая: спрос → экспертный ответ → страница → трафик → клик по записи → обращение.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/audit"
                className="rounded-md bg-blue-700 px-8 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-blue-800"
              >
                Найти спрос в моей нише
              </Link>
              <Link
                href="/pricing"
                className="rounded-md border border-slate-300 bg-white px-8 py-3 text-center text-base font-semibold text-slate-950 transition-colors hover:bg-slate-100"
              >
                Посмотреть тарифы
              </Link>
            </div>
          </div>
          <div>
            <SoloDemandSignalMockup />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold text-blue-700">Механика платформы</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              За счёт чего эксперт получает видимость
            </h2>
            <p className="mt-4 text-slate-600">
              Это не “нейросеть пишет посты”. Платформа собирает спрос, проверяет слабые ответы,
              берёт ваш голос как источник экспертизы и превращает его в страницы, которые можно измерять.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {EXPERT_MECHANISMS.map((item) => (
              <div key={item.title} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.9fr_1.1fr_1.1fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                      <item.Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.result}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Инструменты</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.tools}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Что получает эксперт</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-800">{item.output}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-950">
            Как экспертный ответ превращается в запись
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Мы не просим вас вести контент-машину каждый день. Система берёт
            ваш голос и превращает его в точки входа, где будущий клиент уже
            ищет решение.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {CLIENT_PATHS.map((item, index) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-700 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-950">
            Что мы делаем — и чего не обещаем
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
              <h3 className="text-lg font-semibold text-green-900">Что мы делаем</h3>
              <ul className="mt-4 space-y-3 text-sm text-green-900">
                <li className="flex gap-2"><span className="flex-shrink-0 text-green-700">&#10003;</span>Находим вопросы с подтверждённым спросом и понятным клиентским намерением</li>
                <li className="flex gap-2"><span className="flex-shrink-0 text-green-700">&#10003;</span>Превращаем ваш голос в экспертную страницу под конкретный вопрос</li>
                <li className="flex gap-2"><span className="flex-shrink-0 text-green-700">&#10003;</span>Публикуем страницу со структурой для поиска, нейросетей и вашим профилем</li>
                <li className="flex gap-2"><span className="flex-shrink-0 text-green-700">&#10003;</span>На каждой странице — кнопка записи, консультации или разбора</li>
                <li className="flex gap-2"><span className="flex-shrink-0 text-green-700">&#10003;</span>Отслеживаем индексацию, трафик, клики и обращения</li>
                <li className="flex gap-2"><span className="flex-shrink-0 text-green-700">&#10003;</span>Через 2-4 недели решаем: усилить страницу, объединить, обновить или оставить как рабочую</li>
                <li className="flex gap-2"><span className="flex-shrink-0 text-green-700">&#10003;</span>Корректируем следующие темы по фактическому результату</li>
              </ul>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-lg font-semibold text-amber-900">Чего мы не обещаем</h3>
              <ul className="mt-4 space-y-3 text-sm text-amber-900">
                <li className="flex gap-2"><span className="flex-shrink-0 text-amber-700">&mdash;</span>«N клиентов в месяц» — результат зависит от ниши, конкуренции, качества ответов</li>
                <li className="flex gap-2"><span className="flex-shrink-0 text-amber-700">&mdash;</span>100% попадание каждой страницы в ответы нейросетей — это дополнительный канал, а не единственная цель</li>
                <li className="flex gap-2"><span className="flex-shrink-0 text-amber-700">&mdash;</span>Мгновенный поток клиентов — поиску, индексации и доверию нужно время</li>
              </ul>
              <p className="mt-4 text-sm text-amber-900/80">
                Мы создаём систему, где каждая публикация начинается с реального спроса
                и заканчивается измеримым действием: просмотром, кликом или обращением.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-950">
            Знакомо?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Шесть болей, которые мы решаем. Для каждой — конкретное решение внутри платформы.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PAINS.map((pain) => (
              <div key={pain.title} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                  <pain.Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-950">{pain.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{pain.desc}</p>
                <div className="mt-4 rounded-md border border-blue-200 bg-white p-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Решение: </span>
                    {pain.solution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-950">
            Почему мы — не контент-фабрика
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <h3 className="text-lg font-semibold text-red-900">Контент-фабрики</h3>
              <p className="mt-2 text-sm text-red-900/80">
                Нейросетевые копирайтеры генерируют текст <strong>из обучающих данных больших языковых моделей</strong>.
                Это рерайт интернета. Нового знания — ноль. О чём писать, где публиковать,
                как оптимизировать, кто прочитает — ваша проблема.
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="text-lg font-semibold text-blue-900">НейроЭксперт</h3>
              <p className="mt-2 text-sm text-blue-900/80">
                Содержание приходит <strong>от вас через голос</strong>. Нейросеть только форматирует и структурирует.
                Это как журналист берёт интервью и пишет статью — источник знания не журналист, а вы.
                Ваши кейсы, ваш опыт, ваш стиль.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">4 меры сохранения аутентичности</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-700 text-sm font-bold text-white">1</div>
                <div>
                  <p className="text-sm font-medium text-slate-950">Авторский стиль</p>
                  <p className="text-sm text-slate-600">Нейросеть структурирует, но сохраняет ваши формулировки и примеры из практики</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-700 text-sm font-bold text-white">2</div>
                <div>
                  <p className="text-sm font-medium text-slate-950">Прямые цитаты</p>
                  <p className="text-sm text-slate-600">Ключевые фразы из вашей речи выделяются как авторские цитаты</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-700 text-sm font-bold text-white">3</div>
                <div>
                  <p className="text-sm font-medium text-slate-950">Аудиозапись на странице</p>
                  <p className="text-sm text-slate-600">Ваш голос прикреплён к статье — доказательство, что за контентом стоит человек</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-700 text-sm font-bold text-white">4</div>
                <div>
                  <p className="text-sm font-medium text-slate-950">Минимальная обработка</p>
                  <p className="text-sm text-slate-600">Опция: нейросеть только чистит «эээ» и повторы. Текст остаётся на 90% вашим</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-950">
            Почему это работает лучше обычного контента
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Эксперты часто пишут то, что удобно написать. Мы начинаем с другого:
            смотрим, что люди уже спрашивают, и строим страницу под этот спрос.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {PROOF_NUMBERS.map((item) => (
              <div key={item.value} className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                <div className="text-4xl font-bold text-blue-400">{item.value}</div>
                <p className="mt-2 text-sm text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-slate-500">
            Это продуктовая логика НейроЭксперта: сначала карта спроса, затем голос эксперта, затем страница для записи.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-950">
            Как это выглядит на практике
          </h2>
          <div className="mt-10 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-blue-700 text-2xl font-bold text-white">
                А
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-950">Анна, 34 года, психолог</h3>
                <p className="mt-1 text-sm text-slate-600">Практикует 8 лет, приём 5 000 &#8381;. Пробовала вести Telegram — бросила. Пробовала ChatGPT — «красиво, но не моё». Нанимала SMM за 25К/мес — ноль клиентов.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-2xl font-bold text-slate-950">24</div>
                <div className="text-sm text-slate-600">страницы за 6 месяцев</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-2xl font-bold text-slate-950">250-1 400</div>
                <div className="text-sm text-slate-600">посетителей в месяц</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-2xl font-bold text-slate-950">2-14</div>
                <div className="text-sm text-slate-600">обращений и кликов по записи в месяц</div>
              </div>
            </div>

            <p className="mt-6 text-center text-sm font-medium text-blue-300">
              Цель — довести страницы до первых измеримых сигналов. Эксперт тратит около 10 минут в неделю на запись голоса.
            </p>
            <p className="mt-3 text-center text-xs text-slate-500">
              Модельный сценарий для иллюстрации воронки. Реальные результаты зависят от ниши, конкуренции и качества ответов.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-slate-950">Растите — добавляйте ниши</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Начните с одной ниши бесплатно. Увидите результат — добавьте смежные направления.
            Ниши масштабируются вместе с вашей экспертизой.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              { tier: "Free", niches: "1 ниша", desc: "Попробуйте и увидьте результат", highlight: false },
              { tier: "Starter", niches: "2 ниши", desc: "Добавьте смежное направление", highlight: false },
              { tier: "Pro", niches: "3 ниши", desc: "Полный охват экспертизы", highlight: true },
              { tier: "Expert", niches: "5 ниш", desc: "Широкий профиль, личный бренд", highlight: false },
            ].map((item) => (
              <div key={item.tier} className={`rounded-lg border p-4 ${item.highlight ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-slate-50"}`}>
                <div className={item.highlight ? "text-sm font-semibold text-blue-100" : "text-sm font-semibold text-slate-500"}>{item.tier}</div>
                <div className={item.highlight ? "mt-1 text-xl font-bold text-white" : "mt-1 text-xl font-bold text-slate-950"}>{item.niches}</div>
                <p className={item.highlight ? "mt-1 text-xs text-blue-100" : "mt-1 text-xs text-slate-600"}>{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900">
            Сравнить все тарифы &rarr;
          </Link>
        </div>
      </section>

      <section className="bg-blue-700 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">
            Узнайте, где в вашей нише уже есть спрос
          </h2>
          <p className="mt-4 text-lg text-blue-50">
            Бесплатная карта покажет вопросы с клиентским потенциалом и подскажет,
            какие страницы стоит сделать первыми.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="rounded-md bg-white px-10 py-4 text-lg font-semibold text-slate-950 transition-colors hover:bg-slate-100"
            >
              Получить карту спроса
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-md border border-white/30 px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
            >
              Как это работает
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
