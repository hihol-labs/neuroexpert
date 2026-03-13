import Link from "next/link";

const FOCUS_NICHES = [
  { icon: "🧠", name: "Психология", desc: "Психологи, психотерапевты, семейные консультанты" },
  { icon: "⚖️", name: "Юриспруденция", desc: "Адвокаты, юристы, медиаторы" },
  { icon: "🥗", name: "Нутрициология", desc: "Нутрициологи, диетологи, консультанты по питанию" },
  { icon: "💰", name: "Финансы", desc: "Финансовые советники, инвестиционные консультанты" },
  { icon: "📊", name: "Бизнес-консалтинг", desc: "Бизнес-тренеры, стратеги, менторы" },
];

const STEPS = [
  {
    num: "01",
    title: "Находим вопрос",
    desc: "Анализируем тысячи запросов, где нейросети дают слабые ответы — без экспертов, без конкретики.",
  },
  {
    num: "02",
    title: "Наговариваете ответ",
    desc: "Получаете заказ в Telegram. Наговариваете 3-10 минут голосом. Мы транскрибируем и создаём 5 форматов контента.",
  },
  {
    num: "03",
    title: "Получаете клиентов",
    desc: "Публикуем экспертную статью на платформе. Нейросети начинают цитировать вас, поисковики — ранжировать.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gray-900">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-white">
            НейроЭксперт
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/audit"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Бесплатный аудит
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Войти
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="bg-gray-900 pb-20 pt-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Наговори 10 минут —{" "}
            <span className="text-blue-400">получи клиентов</span> из поиска и нейросетей
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            Без написания текстов, без SMM, без бюджета на рекламу.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-400">
            Мы находим вопросы, которые задают тысячи людей. Превращаем ваш голос
            в экспертный контент. Публикуем так, чтобы нейросети и поисковики его нашли.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/audit"
              className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              Бесплатный аудит AI-видимости
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-gray-600 px-8 py-4 text-lg font-semibold text-white hover:border-gray-400 transition-colors"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </section>

      {/* Два канала */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Два канала привлечения клиентов
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">
                Нейросети цитируют вас
              </h3>
              <p className="mt-2 text-gray-600">
                ChatGPT, Perplexity, YandexGPT и другие ИИ-системы находят ваш
                экспертный контент и рекомендуют вас в ответах на вопросы пользователей.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">
                Поисковики ранжируют вас
              </h3>
              <p className="mt-2 text-gray-600">
                Google и Яндекс показывают ваши статьи в топе поисковой выдачи
                благодаря SEO-оптимизации, Schema.org и E-E-A-T сигналам.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 шага */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Как это работает
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  {step.num}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Для кого */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Для каких экспертов
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            Платформа подходит практикующим специалистам, которые хотят получать
            клиентов без ведения соцсетей и бюджета на рекламу.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {FOCUS_NICHES.map((niche) => (
              <div
                key={niche.name}
                className="rounded-xl border border-gray-200 p-6 text-center hover:border-blue-300 hover:shadow-md transition-all"
              >
                <span className="text-4xl">{niche.icon}</span>
                <h3 className="mt-3 font-semibold text-gray-900">{niche.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{niche.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Узнайте, как AI-системы видят вашу нишу
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Бесплатный аудит покажет вопросы с максимальным спросом и слабыми ответами
            нейросетей — ваши точки роста.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/audit"
              className="rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Пройти бесплатный аудит
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-blue-300 px-8 py-4 text-lg font-semibold text-white hover:border-white transition-colors"
            >
              Создать аккаунт
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} НейроЭксперт. Все права защищены.
            </span>
            <div className="flex gap-6">
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                Тарифы
              </Link>
              <Link href="/audit" className="text-sm text-gray-400 hover:text-white transition-colors">
                Аудит
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
