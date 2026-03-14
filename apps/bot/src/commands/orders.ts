import type { Bot } from "grammy";
import { supabase } from "../supabase.js";
import { orderKeyboard } from "../keyboards.js";

export function registerOrdersCommand(bot: Bot): void {
  bot.command("orders", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (!profile) {
      await ctx.reply("Сначала зарегистрируйтесь: /start");
      return;
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, status, recommendation, questions!inner(question_text)")
      .eq("expert_id", profile.id)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[orders] Error:", error);
      await ctx.reply("Ошибка при загрузке заказов.");
      return;
    }

    if (!orders || orders.length === 0) {
      await ctx.reply(
        "У вас пока нет активных заказов.\n\n" +
          "Заказы появятся автоматически на основе вашей ниши.",
      );
      return;
    }

    for (const order of orders) {
      const question = (order as any).questions?.question_text ?? "—";
      const statusLabel = order.status === "pending" ? "Новый" : "Принят";
      const text =
        `[${statusLabel}] ${question}\n\n` +
        (order.recommendation ? `Рекомендация: ${order.recommendation}` : "");

      if (order.status === "pending") {
        await ctx.reply(text, { reply_markup: orderKeyboard(order.id) });
      } else {
        await ctx.reply(text);
      }
    }
  });
}
