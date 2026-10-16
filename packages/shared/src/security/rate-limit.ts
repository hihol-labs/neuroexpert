/**
 * Ограничители для публичных точек (SEC-1, security-audit AF-1 находки 2/3).
 *
 * In-memory, один процесс web: на проде один контейнер, поэтому этого достаточно;
 * при масштабировании на несколько инстансов — переезд на Redis (BACKLOG).
 * Ключевое отличие от прежнего `Map<string, number[]>` в /api/audit — ограничение
 * числа ключей: подделка `X-Forwarded-For` больше не растит память без предела.
 */

export interface SlidingWindowOptions {
  /** Максимум учтённых запросов на ключ за окно. */
  limit: number;
  /** Окно в миллисекундах. */
  windowMs: number;
  /** Верхняя граница числа ключей; при превышении вытесняются самые старые. */
  maxKeys?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  /** Через сколько миллисекунд освободится слот (0, если разрешено). */
  retryAfterMs: number;
}

export const DEFAULT_MAX_KEYS = 10_000;

export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;

  constructor(options: SlidingWindowOptions) {
    if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error("rate-limit: limit must be a positive integer");
    if (!Number.isFinite(options.windowMs) || options.windowMs <= 0) throw new Error("rate-limit: windowMs must be positive");
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.maxKeys = options.maxKeys && options.maxKeys > 0 ? Math.floor(options.maxKeys) : DEFAULT_MAX_KEYS;
  }

  /** Учитывает запрос и говорит, разрешён ли он. Отказ ничего не записывает. */
  consume(key: string, now: number = Date.now()): RateLimitDecision {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.limit) {
      // Ключ переставляется в конец: активный нарушитель не должен вытесняться раньше тихих.
      this.hits.delete(key);
      this.hits.set(key, recent);
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(1, recent[0] + this.windowMs - now) };
    }
    recent.push(now);
    this.hits.delete(key);
    this.hits.set(key, recent);
    this.evict(since);
    return { allowed: true, remaining: this.limit - recent.length, retryAfterMs: 0 };
  }

  /** Число ключей в памяти (для тестов и health). */
  size(): number {
    return this.hits.size;
  }

  private evict(since: number): void {
    if (this.hits.size <= this.maxKeys) return;
    // Сначала — ключи без свежих попаданий, затем самые старые по порядку вставки.
    for (const [key, stamps] of this.hits) {
      if (this.hits.size <= this.maxKeys) return;
      if (stamps.length === 0 || stamps[stamps.length - 1] <= since) this.hits.delete(key);
    }
    for (const key of this.hits.keys()) {
      if (this.hits.size <= this.maxKeys) return;
      this.hits.delete(key);
    }
  }
}

export interface BudgetDecision {
  allowed: boolean;
  used: number;
  limit: number;
  /** День бюджета в формате YYYY-MM-DD (UTC). */
  day: string;
}

/** Глобальный суточный бюджет (UTC): защита LLM-расхода от распределённого перебора IP. */
export class DailyBudget {
  private day = "";
  private used = 0;
  private readonly limit: number;

  constructor(limit: number) {
    if (!Number.isInteger(limit) || limit < 0) throw new Error("daily-budget: limit must be a non-negative integer");
    this.limit = limit;
  }

  consume(now: number = Date.now()): BudgetDecision {
    const day = new Date(now).toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.used = 0;
    }
    if (this.used >= this.limit) return { allowed: false, used: this.used, limit: this.limit, day };
    this.used += 1;
    return { allowed: true, used: this.used, limit: this.limit, day };
  }

  snapshot(now: number = Date.now()): BudgetDecision {
    const day = new Date(now).toISOString().slice(0, 10);
    const used = day === this.day ? this.used : 0;
    return { allowed: used < this.limit, used, limit: this.limit, day };
  }
}

/** Положительное целое из env; иначе fallback (пустое/мусорное значение не роняет маршрут). */
export function parseLimitEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

/** Первый адрес из X-Forwarded-For либо X-Real-IP; иначе "unknown". */
export function clientIpFromHeaders(get: (name: string) => string | null | undefined): string {
  const forwarded = get("x-forwarded-for");
  const first = forwarded ? forwarded.split(",")[0]?.trim() : "";
  if (first) return first.slice(0, 64);
  const real = get("x-real-ip")?.trim();
  return real ? real.slice(0, 64) : "unknown";
}
