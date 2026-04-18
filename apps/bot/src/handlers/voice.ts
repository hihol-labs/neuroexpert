import type { Bot } from "grammy";
import { supabase } from "../supabase";
import { getSTT } from "shared";
import { tgFetch } from "shared/http/telegram-fetch";

export function registerVoiceHandler(bot: Bot): void {
  bot.on("message:voice", async (ctx) => {
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

    await ctx.reply("Получил голосовое сообщение. Расшифровываю...");

    const voice = ctx.message.voice;
    const file = await ctx.getFile();
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // Скачиваем файл
    const response = await tgFetch(fileUrl);
    if (!response.ok) {
      await ctx.reply("Не удалось скачать голосовое сообщение.");
      return;
    }
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Находим принятый заказ (если есть)
    const { data: acceptedOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("expert_id", profile.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    // Сохраняем запись в БД
    const filePath = `voice/${profile.id}/${Date.now()}.ogg`;
    const { data: recording, error: insertError } = await supabase
      .from("voice_recordings")
      .insert({
        expert_id: profile.id,
        order_id: acceptedOrder?.id ?? null,
        file_path: filePath,
        file_size: voice.file_size ?? audioBuffer.length,
        duration_seconds: voice.duration,
        source: "telegram",
        mime_type: "audio/ogg",
        transcription_status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !recording) {
      console.error("[voice] Insert error:", insertError);
      await ctx.reply("Ошибка при сохранении записи.");
      return;
    }

    // Транскрибируем
    try {
      const { primary, fallback } = getSTT();
      let transcript: string;
      let provider: string;

      try {
        transcript = await primary.transcribe(audioBuffer, { language: "ru" });
        provider = primary.name;
      } catch (primaryErr) {
        console.error("[voice] Primary STT failed:", primaryErr);
        transcript = await fallback.transcribe(audioBuffer, { language: "ru" });
        provider = fallback.name;
      }

      // Обновляем запись с транскриптом
      await supabase
        .from("voice_recordings")
        .update({
          transcript,
          transcription_provider: provider,
          transcription_status: "completed",
        })
        .eq("id", recording.id);

      // Обновляем статус заказа
      if (acceptedOrder) {
        await supabase
          .from("orders")
          .update({ status: "processing" })
          .eq("id", acceptedOrder.id);
      }

      // Создаём задачу на генерацию контента
      await supabase.from("jobs").insert({
        type: "generate_content",
        payload: {
          voice_recording_id: recording.id,
          expert_id: profile.id,
          order_id: acceptedOrder?.id ?? null,
        },
        priority: 5,
      });

      const durationMin = Math.floor(voice.duration / 60);
      const durationSec = voice.duration % 60;

      await ctx.reply(
        `Расшифровка готова, создаю контент...\n\n` +
          `Длительность: ${durationMin}:${String(durationSec).padStart(2, "0")}\n` +
          `Символов: ${transcript.length}\n\n` +
          `Я отправлю готовый контент на проверку, когда он будет готов.`,
      );
    } catch (err) {
      console.error("[voice] STT error:", err);
      await supabase
        .from("voice_recordings")
        .update({ transcription_status: "failed" })
        .eq("id", recording.id);

      await ctx.reply(
        "Не удалось расшифровать голосовое сообщение. " +
          "Попробуйте записать ещё раз, говорите чётко и без фонового шума.",
      );
    }
  });
}
