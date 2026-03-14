import { supabase } from "../supabase.js";
import { getSTT } from "shared";

export async function handleTranscribe(payload: Record<string, unknown>): Promise<{ transcript_length: number }> {
  const voiceId = payload.voice_recording_id as string;
  if (!voiceId) throw new Error("voice_recording_id is required");

  const { data: recording } = await supabase
    .from("voice_recordings")
    .select("id, file_path, transcription_status, expert_id, order_id")
    .eq("id", voiceId)
    .single();

  if (!recording) throw new Error(`Voice recording ${voiceId} not found`);

  // Уже транскрибировано?
  if (recording.transcription_status === "completed") {
    console.log(`[transcribe] Recording ${voiceId} already transcribed`);
    return { transcript_length: 0 };
  }

  await supabase
    .from("voice_recordings")
    .update({ transcription_status: "processing" })
    .eq("id", voiceId);

  // Скачиваем аудио из Supabase Storage
  const { data: fileData, error: downloadErr } = await supabase.storage
    .from("voice")
    .download(recording.file_path);

  if (downloadErr || !fileData) {
    // Fallback: если нет в Storage, пробуем через Telegram (для legacy записей)
    await supabase
      .from("voice_recordings")
      .update({ transcription_status: "failed" })
      .eq("id", voiceId);
    throw new Error(`Failed to download audio: ${downloadErr?.message ?? "no data"}`);
  }

  const audioBuffer = Buffer.from(await fileData.arrayBuffer());

  // Транскрипция через STT слой
  const { primary, fallback } = getSTT();
  let transcript: string;
  let provider: string;

  try {
    transcript = await primary.transcribe(audioBuffer, { language: "ru" });
    provider = primary.name;
  } catch (primaryErr) {
    console.error("[transcribe] Primary STT failed:", primaryErr);
    transcript = await fallback.transcribe(audioBuffer, { language: "ru" });
    provider = fallback.name;
  }

  // Сохраняем транскрипт
  await supabase
    .from("voice_recordings")
    .update({
      transcript,
      transcription_provider: provider,
      transcription_status: "completed",
    })
    .eq("id", voiceId);

  // Обновляем статус заказа
  if (recording.order_id) {
    await supabase
      .from("orders")
      .update({ status: "processing" })
      .eq("id", recording.order_id)
      .eq("status", "accepted");
  }

  // Создаём задачу генерации контента
  await supabase.from("jobs").insert({
    type: "generate_content",
    payload: {
      voice_recording_id: voiceId,
      expert_id: recording.expert_id,
      order_id: recording.order_id,
    },
    priority: 5,
  });

  console.log(`[transcribe] Completed: ${transcript.length} chars via ${provider}`);
  return { transcript_length: transcript.length };
}
