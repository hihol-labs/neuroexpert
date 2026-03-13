import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-900">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-white">
            НейроЭксперт
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Войти
          </Link>
        </nav>
      </header>

      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Тарифы</h1>
          <p className="mt-4 text-gray-600">
            Страница тарифов будет доступна на следующем этапе разработки.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            &larr; На главную
          </Link>
        </div>
      </section>
    </div>
  );
}
