import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";

export const metadata: Metadata = {
  title: "Условия использования | НейроЭксперт",
  description: "Условия использования платформы НейроЭксперт, гарантия результата, политика возврата.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-bold text-white">Условия использования</h1>
          <p className="mt-4 text-gray-400">
            Последнее обновление: 16 апреля 2026 г.
          </p>

          <div className="mt-12 space-y-10 text-gray-300 text-sm leading-relaxed">
            {/* Общие условия */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">1. Общие положения</h2>
              <p>
                НейроЭксперт (далее — Платформа) предоставляет экспертам инструменты
                для создания контента, публикации экспертных страниц и привлечения клиентов
                через поисковые системы и AI-платформы.
              </p>
              <p className="mt-3">
                Регистрируясь на Платформе, вы соглашаетесь с настоящими условиями.
              </p>
            </div>

            {/* Тарифы */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">2. Тарифы и оплата</h2>
              <p>
                Платформа предлагает тарифы Free, Starter, Pro, Expert и Business.
                Подписка оплачивается ежемесячно через ЮKassa. Вы можете отменить подписку
                в любой момент — она действует до конца оплаченного периода.
              </p>
              <p className="mt-3">
                Комиссия с оплаченных консультаций зависит от тарифа:
                Free — 15%, Starter — 7%, Pro — 3%, Expert — 0%, Business — 0%.
              </p>
            </div>

            {/* Гарантия результата */}
            <div id="guarantee">
              <h2 className="text-xl font-semibold text-white mb-4">3. Гарантия результата</h2>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6 mb-6">
                <h3 className="font-semibold text-white mb-3">Что мы гарантируем</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="text-cyan-400 font-bold mt-0.5">Starter</span>
                    <span>2+ цитирования вашего контента AI-платформами за 60 дней</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-cyan-400 font-bold mt-0.5">Pro</span>
                    <span>5+ цитирований за 90 дней</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-cyan-400 font-bold mt-0.5">Expert</span>
                    <span>10+ цитирований за 90 дней</span>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-white mb-2">Что считается цитированием</h3>
              <p>
                Цитирование — это упоминание вашего имени, бренда или контента в ответе
                AI-платформы (ChatGPT, YandexGPT, Perplexity, GigaChat) на релевантный
                вопрос пользователя. Фиксируется автоматически системой Citation Tracker.
              </p>

              <h3 className="font-semibold text-white mt-6 mb-2">Сроки</h3>
              <p>
                Отсчёт начинается с даты первой опубликованной статьи на Платформе.
                Starter: 60 дней. Pro и Expert: 90 дней.
              </p>

              <h3 className="font-semibold text-white mt-6 mb-2">Условия возврата</h3>
              <p>
                Если за гарантийный период количество зафиксированных цитирований
                не достигло порога вашего тарифа — мы возвращаем 100% стоимости подписки
                за этот период. Возврат осуществляется на карту в течение 10 рабочих дней.
              </p>

              <h3 className="font-semibold text-white mt-6 mb-2">Когда гарантия не действует</h3>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Тариф Free (бесплатный, без гарантии)</li>
                <li>Профиль не заполнен (нет фото, квалификации, опыта работы)</li>
                <li>Менее 3 опубликованных статей за гарантийный период</li>
                <li>Статьи удалены или деопубликованы экспертом</li>
                <li>Тариф Business и Enterprise (индивидуальные условия)</li>
              </ul>
            </div>

            {/* Контент */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">4. Контент</h2>
              <p>
                Контент, созданный на Платформе, принадлежит эксперту. Платформа получает
                неисключительную лицензию на публикацию и распространение контента
                в рамках предоставления услуг.
              </p>
              <p className="mt-3">
                Эксперт несёт ответственность за достоверность информации в своих материалах.
              </p>
            </div>

            {/* Конфиденциальность */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">5. Конфиденциальность</h2>
              <p>
                Мы не передаём персональные данные третьим лицам без вашего согласия.
                Данные хранятся на серверах в РФ. Подробнее — в Политике конфиденциальности.
              </p>
            </div>

            {/* Контакты */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">6. Контакты</h2>
              <p>
                По вопросам и возвратам: <a href="mailto:info@neuroexpertise.ru" className="text-cyan-400 hover:underline">info@neuroexpertise.ru</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
