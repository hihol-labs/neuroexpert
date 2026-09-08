/**
 * R-03 (ADR-004): активация локальной пары «вертикаль × город» после оплаты Audit Start.
 *
 * Пары рождаются `is_active=false` (триггер 027) и не попадают в еженедельный сбор спроса
 * (cron `weekly-demand` берёт только активные). Оплаченная пара должна собираться повторно —
 * это основа повторного замера (R-11). Активируем только локальные пары (`vertical IS NOT NULL`):
 * legacy-ниши без вертикали cron уже покрывает по своим правилам. Идемпотентно; вызывается из
 * webhook и из сверки платежей после перехода заказа в `paid`. Ошибка активации не должна ломать
 * оплату — вызывающий логирует и идёт дальше.
 */
export interface PairActivationClient {
  from(table: string): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): {
        not(column: string, operator: string, value: null): PromiseLike<{ error: { message: string } | null }>;
      };
    };
  };
}

export async function activateLocalPair(admin: PairActivationClient, nicheId: string | null | undefined): Promise<boolean> {
  if (!nicheId) return false;
  const { error } = await admin.from("niches").update({ is_active: true }).eq("id", nicheId).not("vertical", "is", null);
  if (error) throw new Error(`pair activation: ${error.message}`);
  return true;
}
