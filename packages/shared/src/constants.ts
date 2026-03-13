// Niches, statuses, limits, AIO parameters

// ============================================================
// Ниши (20 шт)
// ============================================================
export interface Niche {
  id: string;
  name: string;
  slug: string;
  icon: string;
  isFocus: boolean;
}

export const NICHES: Niche[] = [
  // 5 фокусных
  { id: 'a0000000-0000-0000-0000-000000000001', name: 'Психология и психотерапия', slug: 'psychology', icon: '🧠', isFocus: true },
  { id: 'a0000000-0000-0000-0000-000000000002', name: 'Юриспруденция', slug: 'law', icon: '⚖️', isFocus: true },
  { id: 'a0000000-0000-0000-0000-000000000003', name: 'Нутрициология', slug: 'nutrition', icon: '🥗', isFocus: true },
  { id: 'a0000000-0000-0000-0000-000000000004', name: 'Финансы и инвестиции', slug: 'finance', icon: '💰', isFocus: true },
  { id: 'a0000000-0000-0000-0000-000000000005', name: 'Бизнес-консалтинг', slug: 'business-consulting', icon: '📊', isFocus: true },
  // 15 расширение
  { id: 'a0000000-0000-0000-0000-000000000006', name: 'Медицина и здоровье', slug: 'medicine', icon: '🏥', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000007', name: 'Фитнес и спорт', slug: 'fitness', icon: '💪', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000008', name: 'Образование и репетиторство', slug: 'education', icon: '📚', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000009', name: 'Маркетинг и SMM', slug: 'marketing', icon: '📱', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000010', name: 'IT и программирование', slug: 'it', icon: '💻', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000011', name: 'Дизайн и архитектура', slug: 'design', icon: '🎨', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000012', name: 'Недвижимость', slug: 'real-estate', icon: '🏠', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000013', name: 'Карьера и HR', slug: 'career', icon: '👔', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000014', name: 'Косметология и эстетика', slug: 'cosmetology', icon: '✨', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000015', name: 'Логопедия и дефектология', slug: 'speech-therapy', icon: '🗣️', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000016', name: 'Коучинг и саморазвитие', slug: 'coaching', icon: '🎯', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000017', name: 'Бухгалтерия и аудит', slug: 'accounting', icon: '🧮', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000018', name: 'Ветеринария', slug: 'veterinary', icon: '🐾', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000019', name: 'Страхование', slug: 'insurance', icon: '🛡️', isFocus: false },
  { id: 'a0000000-0000-0000-0000-000000000020', name: 'Туризм и путешествия', slug: 'travel', icon: '✈️', isFocus: false },
] as const;

// ============================================================
// Тарифы подписки
// ============================================================
export interface SubscriptionTier {
  id: string;
  name: string;
  price: number; // рублей/мес
  ordersPerWeek: number;
  features: string[];
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    ordersPerWeek: 0,
    features: ['Бесплатный аудит (3 дыры)', 'Просмотр каталога'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 2990,
    ordersPerWeek: 3,
    features: ['3 заказа/неделю', '5 форматов контента', 'Публикация на платформе', 'Базовая аналитика'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 5990,
    ordersPerWeek: 7,
    features: ['7 заказов/неделю', 'AI Citation Tracker', 'Приоритетная генерация', 'Email-дайджест'],
  },
  expert: {
    id: 'expert',
    name: 'Expert',
    price: 9990,
    ordersPerWeek: 15,
    features: ['15 заказов/неделю', 'SERP мониторинг', 'Кросспост Дзен/vc.ru', 'Приоритетная поддержка'],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 19990,
    ordersPerWeek: 30,
    features: ['30 заказов/неделю', 'Мультиэксперт', 'API доступ', 'Персональный менеджер'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49990,
    ordersPerWeek: 100,
    features: ['Безлимитные заказы', 'White-label', 'SLA', 'Выделенная инфраструктура'],
  },
} as const;

// ============================================================
// Статусы заказов
// ============================================================
export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'recording',
  'processing',
  'review',
  'published',
  'rejected',
  'expired',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// ============================================================
// Статусы контента
// ============================================================
export const CONTENT_STATUSES = [
  'generating',
  'review',
  'approved',
  'published',
  'rejected',
  'failed',
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

// ============================================================
// Статусы лидов
// ============================================================
export const LEAD_STATUSES = [
  'new',
  'notified',
  'accepted',
  'rejected',
  'completed',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// ============================================================
// Типы задач (jobs)
// ============================================================
export const JOB_TYPES = [
  'collect_demand',
  'find_gaps',
  'generate_orders',
  'expand_query',
  'transcribe',
  'generate_content',
  'validate_content',
  'track_citations',
  'track_serp',
  'submit_sitemap',
  'crosspost',
  'crosspost_social',
  'calculate_trust_score',
  'send_email_digest',
  'refresh_content',
  'check_cwv',
  'optimize_images',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

// ============================================================
// Статусы задач
// ============================================================
export const JOB_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'retry',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

// ============================================================
// Статусы платежей
// ============================================================
export const PAYMENT_STATUSES = [
  'pending',
  'succeeded',
  'failed',
  'refunded',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ============================================================
// Типы платежей
// ============================================================
export const PAYMENT_TYPES = [
  'audit',
  'subscription',
  'lead_fee',
  'commission',
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];

// ============================================================
// AI-платформы
// ============================================================
export const AI_PLATFORMS = [
  'chatgpt',
  'perplexity',
  'yandexgpt',
  'google_ai',
  'gigachat',
] as const;

export type AIPlatform = (typeof AI_PLATFORMS)[number];

// ============================================================
// Поисковые движки
// ============================================================
export const SEARCH_ENGINES = ['yandex', 'google'] as const;

export type SearchEngine = (typeof SEARCH_ENGINES)[number];

// ============================================================
// Статусы транскрипции
// ============================================================
export const TRANSCRIPTION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

export type TranscriptionStatus = (typeof TRANSCRIPTION_STATUSES)[number];

// ============================================================
// Статусы обновления контента
// ============================================================
export const REFRESH_STATUSES = [
  'fresh',
  'needs_refresh',
  'refreshing',
] as const;

export type RefreshStatus = (typeof REFRESH_STATUSES)[number];
