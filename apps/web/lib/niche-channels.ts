// Mapping of niches to curated Telegram channels/chats for targeted sharing
// Format: niche slug → array of {name, url} for sharing suggestions
//
// ⚠️  TODO (Фаза 0, пункт 0.16 плана запуска):
// Этот файл раньше содержал плейсхолдерные (выдуманные) ссылки вида
// t.me/psyforall, t.me/lawonline и т.п. Они были удалены, чтобы не
// рассылать битые ссылки в уведомлениях о публикации.
//
// Перед активацией посевов и кросспоста нужно:
//   1. Вручную собрать 2–5 реальных TG-чатов/каналов по каждой из 20 ниш
//      (искать через tgstat.ru, tgstat.com, TGStat каталог)
//   2. Проверить, что это активные чаты с живой аудиторией экспертов
//   3. Заполнить NICHE_TELEGRAM_CHANNELS ниже
//   4. Обновить CLAUDE.md: отметить пункт 0.16 как выполненный
//
// Пока карта пустая — /api/publish/route.ts корректно это обрабатывает
// (channels.length > 0 проверка), уведомление просто не содержит блок
// «Рекомендуемые чаты для вашей ниши».

export interface NicheChannel {
  name: string;
  url: string;
}

export const NICHE_TELEGRAM_CHANNELS: Record<string, NicheChannel[]> = {
  // TODO: заполнить реальными чатами. См. комментарий выше.
  // Пример структуры (не раскомментировать с этими URL — они фейковые):
  // psychology: [
  //   { name: "Название чата", url: "https://t.me/real_channel_slug" },
  // ],
};

// Get channels for a niche (returns empty array if no mapping)
export function getNicheChannels(nicheSlug: string): NicheChannel[] {
  return NICHE_TELEGRAM_CHANNELS[nicheSlug] ?? [];
}
