import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, Bot, Clock, EyeOff, Lightbulb, Users } from "lucide-react";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";
import { SoloDemandSignalMockup } from "@/components/marketing/product-mockups";

const TITLE = "Новые клиенты для экспертов из поиска и нейросетей | НейроЭксперт";
const DESCRIPTION =
  "НейроЭксперт находит реальные вопросы клиентов, превращает голосовые ответы эксперта в страницы с кнопкой записи и помогает получать заявки из поиска и нейросетей.";

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

export default function ForExpertsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      {/* Hero */}
      <section className="pb-16 pt-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
              НейроЭксперт для экспертов
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
              Ваши знания могут приводить{" "}
              <span className="text-blue-400">новых клиентов</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
              НейроЭксперт находит вопросы, по которым люди уже ищут решение
              и выбирают специалиста. Вы отвечаете голосом, а мы превращаем
              ответ в страницу с понятным действием: записаться, задать вопрос или
              получить разбор.
            </p>
            <p className="mt-4 max-w-xl text-base text-gray-400">
              Логика простая: спрос → экспертный ответ → страница → трафик → клик по записи → заявка.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/audit"
                className="rounded-lg bg-blue-500 px-8 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-blue-400"
              >
                Найти спрос в моей нише
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-white/15 px-8 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-white/10"
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

      {/* Путь к клиенту */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Как экспертный ответ превращается в заявку
          </h2>
          <p className="mt-4 text-center text-gray-400 max-w-2xl mx-auto">
            Мы не просим вас вести контент-машину каждый день. Система берёт
            ваш голос и превращает его в точки входа, где будущий клиент уже
            ищет решение.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {CLIENT_PATHS.map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-sm font-bold text-blue-300">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Честное позиционирование */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Что мы делаем — и чего не обещаем
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6">
              <h3 className="text-lg font-semibold text-green-300">Что мы делаем</h3>
              <ul className="mt-4 space-y-3 text-sm text-green-200/90">
                <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">&#10003;</span>Находим вопросы с подтверждённым спросом и понятным клиентским намерением</li>
                <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">&#10003;</span>Превращаем ваш голос в экспертную страницу под конкретный вопрос</li>
                <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">&#10003;</span>Публикуем страницу со структурой для поиска, нейросетей и вашим профилем</li>
                <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">&#10003;</span>На каждой странице — кнопка записи, консультации или разбора</li>
                <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">&#10003;</span>Отслеживаем индексацию, трафик, клики и заявки</li>
                <li className="flex gap-2"><span className="text-green-400 flex-shrink-0">&#10003;</span>Корректируем следующие темы по фактическому результату</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
              <h3 className="text-lg font-semibold text-amber-300">Чего мы не обещаем</h3>
              <ul className="mt-4 space-y-3 text-sm text-amber-200/90">
                <li className="flex gap-2"><span className="text-amber-400 flex-shrink-0">&mdash;</span>«N клиентов в месяц» — результат зависит от ниши, конкуренции, качества ответов</li>
                <li className="flex gap-2"><span className="text-amber-400 flex-shrink-0">&mdash;</span>100% попадание каждой страницы в ответы нейросетей — это дополнительный канал, а не единственная цель</li>
                <li className="flex gap-2"><span className="text-amber-400 flex-shrink-0">&mdash;</span>Мгновенный поток клиентов — поиску, индексации и доверию нужно время</li>
              </ul>
              <p className="mt-4 text-sm text-amber-200/80">
                Мы создаём систему, где каждая публикация начинается с реального спроса
                и заканчивается измеримым действием: просмотром, кликом или заявкой.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Болей */}
      <section className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Знакомо?
          </h2>
          <p className="mt-4 text-center text-gray-400 max-w-2xl mx-auto">
            Шесть болей, которые мы решаем. Для каждой — конкретное решение внутри платформы.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PAINS.map((pain) => (
              <div key={pain.title} className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/20">
                  <pain.Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{pain.title}</h3>
                <p className="mt-1 text-sm text-gray-400">{pain.desc}</p>
                <div className="mt-4 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                  <p className="text-sm text-blue-300">
                    <span className="font-semibold">Решение: </span>
                    {pain.solution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Не контент-фабрика */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Почему мы — не контент-фабрика
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
              <h3 className="text-lg font-semibold text-red-300">Контент-фабрики</h3>
              <p className="mt-2 text-sm text-red-200/80">
                Нейросетевые копирайтеры генерируют текст <strong>из обучающих данных больших языковых моделей</strong>.
                Это рерайт интернета. Нового знания — ноль. О чём писать, где публиковать,
                как оптимизировать, кто прочитает — ваша проблема.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6">
              <h3 className="text-lg font-semibold text-blue-300">НейроЭксперт</h3>
              <p className="mt-2 text-sm text-blue-200/80">
                Содержание приходит <strong>от вас через голос</strong>. Нейросеть только форматирует и структурирует.
                Это как журналист берёт интервью и пишет статью — источник знания не журналист, а вы.
                Ваши кейсы, ваш опыт, ваш стиль.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white">4 меры сохранения аутентичности</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="text-sm font-medium text-white">Авторский стиль</p>
                  <p className="text-sm text-gray-400">Нейросеть структурирует, но сохраняет ваши формулировки и примеры из практики</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="text-sm font-medium text-white">Прямые цитаты</p>
                  <p className="text-sm text-gray-400">Ключевые фразы из вашей речи выделяются как авторские цитаты</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="text-sm font-medium text-white">Аудиозапись на странице</p>
                  <p className="text-sm text-gray-400">Ваш голос прикреплён к статье — доказательство, что за контентом стоит человек</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-sm flex-shrink-0">4</div>
                <div>
                  <p className="text-sm font-medium text-white">Минимальная обработка</p>
                  <p className="text-sm text-gray-400">Опция: нейросеть только чистит «эээ» и повторы. Текст остаётся на 90% вашим</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Цифры рынка */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Почему это работает лучше обычного контента
          </h2>
          <p className="mt-4 text-center text-gray-400 max-w-2xl mx-auto">
            Эксперты часто пишут то, что удобно написать. Мы начинаем с другого:
            смотрим, что люди уже спрашивают, и строим страницу под этот спрос.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {PROOF_NUMBERS.map((item) => (
              <div key={item.value} className="text-center">
                <div className="text-4xl font-bold text-blue-400">{item.value}</div>
                <p className="mt-2 text-sm text-gray-300">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-gray-500">
            Это продуктовая логика НейроЭксперта: сначала карта спроса, затем голос эксперта, затем страница для заявки.
          </p>
        </div>
      </section>

      {/* Пример Анны */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-white text-center">
            Как это выглядит на практике
          </h2>
          <div className="mt-10 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white flex-shrink-0 font-bold">
                А
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Анна, 34 года, психолог</h3>
                <p className="mt-1 text-sm text-gray-400">Практикует 8 лет, приём 5 000 &#8381;. Пробовала вести Telegram — бросила. Пробовала ChatGPT — «красиво, но не моё». Нанимала SMM за 25К/мес — ноль клиентов.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-2xl font-bold text-white">24</div>
                <div className="text-sm text-gray-400">страницы за 6 месяцев</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-2xl font-bold text-white">250-1 400</div>
                <div className="text-sm text-gray-400">посетителей в месяц</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-2xl font-bold text-white">2-14</div>
                <div className="text-sm text-gray-400">заявок и кликов по записи в месяц</div>
              </div>
            </div>

            <p className="mt-6 text-center text-sm font-medium text-blue-300">
              Цель — довести страницы до первых измеримых сигналов. Эксперт тратит около 10 минут в неделю на запись голоса.
            </p>
            <p className="mt-3 text-center text-xs text-gray-500">
              Модельный сценарий для иллюстрации воронки. Реальные результаты зависят от ниши, конкуренции и качества ответов.
            </p>
          </div>
        </div>
      </section>

      {/* Ниши как рост */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Растите — добавляйте ниши</h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
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
              <div key={item.tier} className={`rounded-xl border p-4 ${item.highlight ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 bg-white/5"}`}>
                <div className="text-sm font-semibold text-gray-400">{item.tier}</div>
                <div className="mt-1 text-xl font-bold text-white">{item.niches}</div>
                <p className="mt-1 text-xs text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="mt-6 inline-block text-sm text-cyan-400 hover:text-cyan-300">
            Сравнить все тарифы &rarr;
          </Link>
        </div>
      </section>

      {/* Призыв к действию */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Узнайте, где в вашей нише уже есть спрос
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Бесплатная карта покажет вопросы с клиентским потенциалом и подскажет,
            какие страницы стоит сделать первыми.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/audit"
              className="rounded-lg bg-white px-10 py-4 text-lg font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Получить карту спроса
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-lg border-2 border-white/50 px-10 py-4 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
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
