import { InlineKeyboard } from "grammy";
import { NICHES } from "shared";

const MAX_NICHES = 3;

export function nicheKeyboard(selectedIds: string[] = []): InlineKeyboard {
  const kb = new InlineKeyboard();
  const focusNiches = NICHES.filter((n) => n.isFocus);
  const atLimit = selectedIds.length >= MAX_NICHES;

  for (const niche of focusNiches) {
    const isSelected = selectedIds.includes(niche.id);
    const label = isSelected ? `✅ ${niche.icon} ${niche.name}` : `${niche.icon} ${niche.name}`;
    // Если лимит и не выбрана — показываем, но callback будет noop
    const callback = atLimit && !isSelected ? `niche_limit` : `toggle_niche:${niche.id}`;
    kb.text(label, callback).row();
  }

  kb.text("Другие ниши...", "show_other_niches").row();

  if (selectedIds.length > 0) {
    kb.text(`Готово (${selectedIds.length}/${MAX_NICHES})`, "confirm_niches").row();
  }

  return kb;
}

export function otherNichesKeyboard(selectedIds: string[] = []): InlineKeyboard {
  const kb = new InlineKeyboard();
  const otherNiches = NICHES.filter((n) => !n.isFocus);
  const atLimit = selectedIds.length >= MAX_NICHES;

  for (const niche of otherNiches) {
    const isSelected = selectedIds.includes(niche.id);
    const label = isSelected ? `✅ ${niche.icon} ${niche.name}` : `${niche.icon} ${niche.name}`;
    const callback = atLimit && !isSelected ? `niche_limit` : `toggle_niche:${niche.id}`;
    kb.text(label, callback).row();
  }

  kb.text("← Основные ниши", "show_focus_niches").row();

  if (selectedIds.length > 0) {
    kb.text(`Готово (${selectedIds.length}/${MAX_NICHES})`, "confirm_niches").row();
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
export function recordOrderKeyboard(orders: Array<{ id: string; question: string }>): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const o of orders.slice(0, 8)) {
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
