import { Bot } from "grammy";
import { setupBot } from "bot";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

// Singleton: один экземпляр бота для всех webhook-запросов
let _bot: Bot | null = null;

export function getBotInstance(): Bot {
  if (!_bot) {
    _bot = setupBot(new Bot(token!));
  }
  return _bot;
}
