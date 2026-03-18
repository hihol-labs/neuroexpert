// Mapping of niches to curated Telegram channels/chats for targeted sharing
// Format: niche slug → array of {name, url} for sharing suggestions

export interface NicheChannel {
  name: string;
  url: string;
}

export const NICHE_TELEGRAM_CHANNELS: Record<string, NicheChannel[]> = {
  psychology: [
    { name: "Психология для всех", url: "https://t.me/psyforall" },
    { name: "Психология отношений", url: "https://t.me/psyrelations" },
    { name: "Родительский чат", url: "https://t.me/parentchat" },
  ],
  law: [
    { name: "Юристы онлайн", url: "https://t.me/lawonline" },
    { name: "Правовой ликбез", url: "https://t.me/lawfaq" },
  ],
  nutrition: [
    { name: "Правильное питание", url: "https://t.me/nutritionchat" },
    { name: "ЗОЖ сообщество", url: "https://t.me/healthyliving" },
  ],
  finance: [
    { name: "Финансовая грамотность", url: "https://t.me/finliteracy" },
    { name: "Инвестиции для начинающих", url: "https://t.me/investbegin" },
  ],
  "business-consulting": [
    { name: "Бизнес-сообщество", url: "https://t.me/bizcommunity" },
    { name: "Стартапы и бизнес", url: "https://t.me/startupbiz" },
  ],
  medicine: [
    { name: "Медицина и здоровье", url: "https://t.me/medhealth" },
    { name: "Доказательная медицина", url: "https://t.me/evidencemed" },
  ],
  fitness: [
    { name: "Фитнес и тренировки", url: "https://t.me/fitnesschat" },
    { name: "Спорт и здоровье", url: "https://t.me/sporthealth" },
  ],
  education: [
    { name: "Образование и развитие", url: "https://t.me/educhat" },
  ],
  marketing: [
    { name: "Маркетинг и SMM", url: "https://t.me/marketingchat" },
    { name: "Digital маркетинг", url: "https://t.me/digitalmarketing" },
  ],
  it: [
    { name: "Программисты", url: "https://t.me/progrChat" },
  ],
  cosmetology: [
    { name: "Косметология и красота", url: "https://t.me/cosmetologychat" },
  ],
  coaching: [
    { name: "Коучинг и саморазвитие", url: "https://t.me/coachingchat" },
  ],
};

// Get channels for a niche (returns empty array if no mapping)
export function getNicheChannels(nicheSlug: string): NicheChannel[] {
  return NICHE_TELEGRAM_CHANNELS[nicheSlug] ?? [];
}
