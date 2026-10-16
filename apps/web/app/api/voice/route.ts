import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { resolveVoiceOrder } from "@/lib/expert-orders";
import { packageAllowance, packageLimitMessage } from "shared";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, subscription_tier")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // R-09 (E-AUTO-14): запись = будущий пакет контента; при исчерпанном лимите месяца отказ до
    // чтения файла и до загрузки в Storage. 402 - «нужен платный тариф», код для клиента.
    const allowance = await packageAllowance(admin, (profile.subscription_tier as string | null) ?? "free", profile.id);
    if (!allowance.allowed) {
      const billingUrl = `${(process.env["APP_URL"] || process.env["NEXT_PUBLIC_APP_URL"] || "https://neuroexpertise.ru").replace(/\/+$/, "")}/billing`;
      return NextResponse.json({ error: packageLimitMessage(allowance, billingUrl), code: "package_limit" }, { status: 402 });
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    // R-06 (E-AUTO-7): запись привязывается к теме, которую выбрал эксперт, а не к «первому принятому
    // заказу». Проверка - ДО загрузки файла: отклонённая запись не оставляет объект в Storage.
    const orderIdRaw = formData.get("order_id");
    const resolved = await resolveVoiceOrder(admin, profile.id, typeof orderIdRaw === "string" && orderIdRaw ? orderIdRaw : null);
    if (!resolved.ok) {
      const error = resolved.code === "order_required"
        ? "У вас есть выбранные темы — откройте «Возможности спроса» и нажмите «Записать ответ» у нужной темы."
        : "Тема не найдена или уже в работе. Выберите тему заново.";
      return NextResponse.json({ error, code: resolved.code }, { status: resolved.status });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    // Суффикс от коллизий в одну миллисекунду при upsert:false (двойной submit / ретрай).
    const filePath = `voice/${profile.id}/${Date.now()}-${randomUUID().slice(0, 8)}.webm`;

    // R-05: файл обязателен - transcribe читает его из bucket voice по file_path. Ошибка upload ->
    // 500 до создания voice_recordings (раньше best effort: запись без файла и «Запись принята»).
    // Браузер шлёт "audio/webm;codecs=opus" - в Storage и в voice_recordings кладём чистый тип.
    const contentType = (audioFile.type || "audio/webm").split(";")[0].trim() || "audio/webm";
    const { error: uploadError } = await admin.storage
      .from("voice")
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });
    if (uploadError) {
      console.error("[voice/route] Upload error:", uploadError.message);
      return NextResponse.json({ error: "Failed to store audio" }, { status: 500 });
    }

    // Длительность записи (передаётся с фронтенда)
    const durationRaw = formData.get("duration");
    const durationSeconds = durationRaw ? parseInt(String(durationRaw), 10) || 0 : 0;

    // Создаём voice_recording
    const { data: recording, error: insertErr } = await admin
      .from("voice_recordings")
      .insert({
        expert_id: profile.id,
        order_id: resolved.orderId,
        file_path: filePath,
        file_size: buffer.length,
        duration_seconds: durationSeconds,
        source: "web" as const,
        mime_type: contentType,
        transcription_status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !recording) {
      return NextResponse.json({ error: "Failed to save recording" }, { status: 500 });
    }

    // Создаём задачу на транскрипцию (generate_content создаст transcribe handler)
    await admin.from("jobs").insert({
      type: "transcribe",
      payload: {
        voice_recording_id: recording.id,
      },
      priority: 5,
    });

    return NextResponse.json({
      message: "Запись принята! Контент будет готов через несколько минут.",
      voice_recording_id: recording.id,
    });
  } catch (err) {
    console.error("[voice/route] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
