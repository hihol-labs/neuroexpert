import { Bot, GrammyError, HttpError, type Context, type NextFunction } from "grammy";
import { registerCommands } from "./commands/start.js";
import { registerOrdersCommand } from "./commands/orders.js";
import { registerRecordCommand } from "./commands/record.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerVoiceHandler } from "./handlers/voice.js";
import { registerCallbackHandler } from "./handlers/callback.js";

/** Настраивает бот: middleware, команды, хендлеры, error handler */
export function setupBot(bot: Bot): Bot {
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
