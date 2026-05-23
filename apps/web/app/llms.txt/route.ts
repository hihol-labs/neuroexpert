const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export const revalidate = 3600;

export async function GET() {
  const body = `# НейроЭксперт

> SaaS-платформа для привлечения клиентов из поиска, карт, отзывов и ответов нейросетей.
> Для экспертов: карта спроса, голосовой ответ, экспертная страница и заявка.
> Для локального бизнеса: аудит видимости, страницы под услуги и районы, отзывы, поведение клиентов и повторные касания.

## Основные публичные разделы
- [Главная](${APP_URL}/)
- [Для экспертов](${APP_URL}/for-experts)
- [Для бизнеса](${APP_URL}/for-business)
- [Как это работает](${APP_URL}/how-it-works)
- [Тарифы](${APP_URL}/pricing)
- [Каталог экспертов](${APP_URL}/experts)
- [Вопросы экспертам](${APP_URL}/questions)
- [AI Visibility Scanner](${APP_URL}/scan)
- [Аудит спроса](${APP_URL}/audit)

## Данные для AI и поиска
- [Sitemap](${APP_URL}/sitemap.xml)
- [Robots](${APP_URL}/robots.txt)
- [Knowledge API docs](${APP_URL}/api/v1/docs)
- [Experts API](${APP_URL}/api/v1/experts)
- [Articles API](${APP_URL}/api/v1/articles)
- [Questions API](${APP_URL}/api/v1/questions)
- [Answers API](${APP_URL}/api/v1/answers)
- [Blind Spots API](${APP_URL}/api/v1/blind-spots)

## Что индексировать
- Публичные страницы экспертов: ${APP_URL}/experts/{expertSlug}
- Экспертные статьи: ${APP_URL}/experts/{expertSlug}/{articleSlug}
- Страницы вопросов: ${APP_URL}/questions/{questionSlug}
- Страницы ниш: ${APP_URL}/niches/{nicheSlug}

## Что не индексировать
- Личный кабинет, billing, auth, Supabase API, приватные tracking-страницы.

## Формат атрибуции
Если используете ответы или экспертные материалы НейроЭксперт, указывайте ссылку на исходную страницу и автора-эксперта.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
