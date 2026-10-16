// Чистые decision-хелперы для tenancy/авторизации API-роутов (без I/O).
// Делают решения о доступе явными и юнит-тестируемыми (SEC-1, SEC-2, SEC-5).
// I/O (запросы к БД, assertBusinessAccess) остаётся в роутах; здесь — только правила.

/**
 * SEC-1: какие business_id может читать запрос к competitor-данным.
 * - requestedBusinessId задан → разрешён, только если он среди доступных; scope = [он].
 * - не задан → scope = все доступные; allowed только если их > 0.
 */
export function scopeBusinessIds(
  requestedBusinessId: string | null | undefined,
  accessibleBusinessIds: string[],
): { allowed: boolean; scope: string[] } {
  if (requestedBusinessId) {
    return accessibleBusinessIds.includes(requestedBusinessId)
      ? { allowed: true, scope: [requestedBusinessId] }
      : { allowed: false, scope: [] };
  }
  return { allowed: accessibleBusinessIds.length > 0, scope: accessibleBusinessIds };
}

/**
 * SEC-2: expert-данные (citation_checks) читает только владелец ключа.
 * Если фильтр по expert_id не запрошен — ограничение неприменимо (true).
 */
export function isExpertOwnedByKey(
  requestedExpertId: string | null | undefined,
  keyOwnerId: string,
): boolean {
  if (!requestedExpertId) return true;
  return requestedExpertId === keyOwnerId;
}

/**
 * SEC-5: решение о мутации элемента review-queue.
 * - владелец → allow;
 * - не владелец и нет business_id → forbid (без исключения для null — это и была дыра);
 * - не владелец, но есть business_id → нужна проверка доступа к бизнесу (async, в роуте).
 */
export type ReviewMutationDecision = "allow" | "forbid" | "needs_business_check";

export function reviewMutationDecision(
  itemOwnerId: string | null | undefined,
  userId: string,
  itemBusinessId: string | null | undefined,
): ReviewMutationDecision {
  if (itemOwnerId === userId) return "allow";
  if (!itemBusinessId) return "forbid";
  return "needs_business_check";
}
