import type { Metadata } from "next";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/nav";

const TITLE = "Политика конфиденциальности | НейроЭксперт";
const DESCRIPTION =
  "Как НейроЭксперт обрабатывает персональные данные: что собираем, где храним, кому передаём, как отозвать согласие.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/privacy" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 text-gray-300">
          <h1 className="text-4xl font-bold text-white">Политика конфиденциальности</h1>
          <p className="mt-2 text-sm text-gray-500">Последнее обновление: 19 апреля 2026</p>

          <div className="mt-10 space-y-10 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-white">1. Общие положения</h2>
              <p className="mt-3">
                Платформа «НейроЭксперт» (далее — Платформа, оператор) обрабатывает персональные данные
                пользователей в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
                Цель обработки — предоставление доступа к сервисам (публикация экспертного контента,
                marketplace консультаций, Demand API) и выполнение обязательств перед пользователями.
              </p>
              <p className="mt-3">
                Использование Платформы означает согласие с настоящей Политикой. Если вы не согласны
                с какими-либо её положениями — не пользуйтесь сервисом.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white">2. Какие данные мы собираем</h2>
              <ul className="mt-3 list-disc pl-6 space-y-2">
                <li><span className="text-white">При регистрации:</span> email, имя, выбранная ниша.</li>
                <li><span className="text-white">При заполнении профиля:</span> квалификация, опыт, город, фото, цена консультации.</li>
                <li><span className="text-white">При использовании бота:</span> Telegram ID, голосовые записи (для транскрипции и генерации контента).</li>
                <li><span className="text-white">При оплате:</span> данные платежа через ЮKassa (номера карт мы не храним — только идентификаторы транзакций).</li>
                <li><span className="text-white">Автоматически:</span> IP-адрес, User-Agent, логи запросов для защиты от злоупотреблений и rate-limiting.</li>
                <li><span className="text-white">Аналитика:</span> обезличенные метрики посещаемости через Plausible и Яндекс.Метрику.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white">3. Как храним и защищаем</h2>
              <p className="mt-3">
                Все персональные данные хранятся на серверах, расположенных на территории Российской
                Федерации (в соответствии со ст. 18 ч. 5 152-ФЗ). Связь между пользователем и сервисом
                защищена TLS 1.2+. Пароли не хранятся в открытом виде — используется магическая ссылка
                на email (passwordless). Доступ к базе данных ограничен service-role ключами с rotation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white">4. Cookies и трекинг</h2>
              <p className="mt-3">
                Мы используем технические cookies для сессии (авторизация, CSRF-токены) и cookie
                реферальной ссылки (<code className="rounded bg-white/10 px-1">?ref=</code>, хранится
                30 дней). Маркетинговых рекламных cookies мы не ставим.
              </p>
              <p className="mt-3">
                Аналитические инструменты Plausible (обезличенная посещаемость) и Яндекс.Метрика
                (включая вебвизор) собирают обезличенные данные. Яндекс.Метрика работает в соответствии
                с <a href="https://yandex.ru/legal/confidential/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">политикой Яндекса</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white">5. Передача третьим лицам</h2>
              <p className="mt-3">
                Мы не передаём и не продаём персональные данные третьим лицам в маркетинговых целях.
                Передача происходит только в технически необходимых случаях:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-2">
                <li><span className="text-white">ЮKassa</span> — обработка платежей (ФЗ-161).</li>
                <li><span className="text-white">Telegram</span> — доставка уведомлений и бот-интерфейс.</li>
                <li><span className="text-white">Поставщики AI-сервисов</span> (для транскрипции голоса и генерации контента) — передаются только тексты контента, без email/ФИО. Актуальный перечень поставщиков доступен по запросу на hello@neuroexpertise.ru.</li>
                <li><span className="text-white">Resend</span> — отправка транзакционных писем (magic links, уведомления).</li>
                <li><span className="text-white">Правоохранительные органы</span> — по законному требованию.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white">6. Ваши права и контакт</h2>
              <p className="mt-3">
                Вы можете в любой момент:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-2">
                <li>запросить копию данных о себе;</li>
                <li>попросить удалить аккаунт и все связанные данные;</li>
                <li>отписаться от email-рассылок по ссылке в каждом письме или через <code className="rounded bg-white/10 px-1">GET /api/email-subscribe?email=&lt;your-email&gt;</code>;</li>
                <li>отозвать согласие на обработку.</li>
              </ul>
              <p className="mt-4">
                Для обращений по вопросам персональных данных пишите на{" "}
                <a href="mailto:hello@neuroexpertise.ru" className="text-blue-400 hover:text-blue-300 underline">
                  hello@neuroexpertise.ru
                </a>
                . Ответим в течение 30 календарных дней (ст. 20 152-ФЗ).
              </p>
            </section>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
