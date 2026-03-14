import { InlineKeyboard } from "grammy";
import { NICHES } from "shared";

export function nicheKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  const focusNiches = NICHES.filter((n) => n.isFocus);

  for (const niche of focusNiches) {
    kb.text(`${niche.icon} ${niche.name}`, `select_niche:${niche.id}`).row();
  }
  kb.text("Другая ниша...", "select_niche:other").row();

  return kb;
}

export function orderKeyboard(orderId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Принять", `accept_order:${orderId}`)
    .text("Пропустить", `skip_order:${orderId}`);
}

export function contentReviewKeyboard(contentId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Опубликовать", `approve:${contentId}`)
    .text("Редактировать", `edit:${contentId}`);
}
