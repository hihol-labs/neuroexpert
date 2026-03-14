import { Bot, GrammyError, HttpError, type Context, type NextFunction } from "grammy";
import { registerCommands } from "./commands/start";
import { registerOrdersCommand } from "./commands/orders";
import { registerRecordCommand } from "./commands/record";
import { registerStatusCommand } from "./commands/status";
import { registerVoiceHandler } from "./handlers/voice";
import { registerCallbackHandler } from "./handlers/callback";
import { registerLeadsHandler } from "./handlers/leads";

/** Настраивает бот: middleware, команды, хендлеры, error handler */
export function setupBot(bot: Bot): Bot {
  // Устанавливаем меню команд в Telegram
  bot.api.setMyCommands([
    { command: "start", description: "Начать работу" },
    { command: "orders", description: "Мои заказы" },
    { command: "record", description: "Записать голосовое" },
    { command: "status", description: "Моя статистика" },
  ]).catch((err) => console.error("[bot] Failed to set commands menu:", err));

  // Logging middleware
  bot.use(async (ctx: Context, next: NextFunction) => {
    const start = Date.now();
    const userId = ctx.from?.id;
    const updateType = Object.keys(ctx.update).filter((k) => k !== "update_id").join(",") || "unknown";
    console.log(`[bot] ${updateType} from user ${userId ?? "unknown"}`);
    try {
      await next();
    } finally {
      const ms = Date.now() - start;
      console.log(`[bot] ${updateType} processed in ${ms}ms`);
    }
  });

  // Register commands
  registerCommands(bot);
  registerOrdersCommand(bot);
  registerRecordCommand(bot);
  registerStatusCommand(bot);

  // Register handlers
  registerVoiceHandler(bot);
  registerCallbackHandler(bot);
  registerLeadsHandler(bot);

  // Error handler
  bot.catch((err: any) => {
    const ctx = err.ctx;
    console.error(`[bot] Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;

    if (e instanceof GrammyError) {
      console.error("[bot] Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("[bot] Could not contact Telegram:", e);
    } else {
      console.error("[bot] Unknown error:", e);
    }
  });

  return bot;
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

export const bot = setupBot(new Bot(token));
