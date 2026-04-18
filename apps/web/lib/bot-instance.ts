import { Bot } from "grammy";
import { HttpsProxyAgent } from "https-proxy-agent";
import { setupBot } from "bot";

// Singleton: один экземпляр бота для всех webhook-запросов
let _bot: Bot | null = null;

export function getBotInstance(): Bot {
  if (!_bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not set");
    }
    const proxyUrl = process.env.TG_PROXY_URL || process.env.OPENAI_PROXY_URL;
    if (proxyUrl) {
      console.log("[bot-instance] Using proxy for Telegram:", proxyUrl.replace(/:[^@]+@/, ":***@"));
    } else {
      console.warn("[bot-instance] No proxy — Telegram calls go direct (may fail in blocked DCs)");
    }
    const botOptions = proxyUrl
      ? { client: { baseFetchConfig: { agent: new HttpsProxyAgent(proxyUrl), compress: true } as any } }
      : {};
    _bot = setupBot(new Bot(token, botOptions));
  }
  return _bot;
}
