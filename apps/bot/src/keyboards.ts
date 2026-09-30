import { InlineKeyboard } from "grammy";
import { NICHES } from "shared";

/** R-09: лимит ниш приходит из тарифа (shared getMaxNiches), а не константой: free - 1, expert - 5, business - 10. */
export function nicheKeyboard(selectedIds: string[] = [], maxNiches: number = 1): InlineKeyboard {
  const kb = new InlineKeyboard();
  const focusNiches = NICHES.filter((n) => n.isFocus);
  const atLimit = selectedIds.length >= maxNiches;

  for (const niche of focusNiches) {
    const isSelected = selectedIds.includes(niche.id);
    const label = isSelected ? `✅ ${niche.icon} ${niche.name}` : `${niche.icon} ${niche.name}`;
    // Если лимит и не выбрана — показываем, но callback будет noop
    const callback = atLimit && !isSelected ? `niche_limit` : `toggle_niche:${niche.id}`;
    kb.text(label, callback).row();
  }

  kb.text("Другие ниши...", "show_other_niches").row();

  if (selectedIds.length > 0) {
    kb.text(`Готово (${selectedIds.length}/${maxNiches})`, "confirm_niches").row();
  }

  return kb;
}

export function otherNichesKeyboard(selectedIds: string[] = [], maxNiches: number = 1): InlineKeyboard {
  const kb = new InlineKeyboard();
  const otherNiches = NICHES.filter((n) => !n.isFocus);
  const atLimit = selectedIds.length >= maxNiches;

  for (const niche of otherNiches) {
    const isSelected = selectedIds.includes(niche.id);
    const label = isSelected ? `✅ ${niche.icon} ${niche.name}` : `${niche.icon} ${niche.name}`;
    const callback = atLimit && !isSelected ? `niche_limit` : `toggle_niche:${niche.id}`;
    kb.text(label, callback).row();
  }

  kb.text("← Основные ниши", "show_focus_niches").row();

  if (selectedIds.length > 0) {
    kb.text(`Готово (${selectedIds.length}/${maxNiches})`, "confirm_niches").row();
  }

  return kb;
}

export function changeNichesKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Изменить ниши", "change_niches");
}

export function orderKeyboard(orderId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Принять", `accept_order:${orderId}`)
    .text("Пропустить", `skip_order:${orderId}`);
}

/** R-06: выбор темы для записи, когда принятых тем несколько (подпись кнопки - начало вопроса). */
export const RECORD_TOPICS_LIMIT = 8;
export function recordOrderKeyboard(orders: Array<{ id: string; question: string }>): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const o of orders.slice(0, RECORD_TOPICS_LIMIT)) {
    const label = o.question.length > 48 ? `${o.question.slice(0, 47)}…` : o.question || "Тема без текста";
    kb.text(label, `record_order:${o.id}`).row();
  }
  return kb;
}

export function contentReviewKeyboard(contentId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Опубликовать", `approve:${contentId}`)
    .text("Редактировать", `edit:${contentId}`);
}
