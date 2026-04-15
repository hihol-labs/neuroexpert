import { bot } from "./bot";

async function main() {
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  const forcePolling = process.env.TG_USE_POLLING === "1";

  if (webhookUrl && process.env.NODE_ENV === "production" && !forcePolling) {
    // Production: set webhook and let the web app handle updates
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
    await bot.api.setWebhook(webhookUrl, { secret_token: secret });
    console.log(`[bot] Webhook set to ${webhookUrl}`);
    // Keep process alive — Docker will restart if it exits
    setInterval(() => {}, 60_000);
  } else {
    // Development: use long polling
    await bot.api.deleteWebhook();
    console.log("[bot] Starting in polling mode...");
    bot.start({
      onStart: () => console.log("[bot] Bot is running (polling)"),
    });
  }
}

main().catch((err) => {
  console.error("[bot] Failed to start:", err);
  process.exit(1);
});
