import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const filePath = `voice/${profile.id}/${Date.now()}.webm`;

    // Сохраняем в Supabase Storage (best effort)
    await admin.storage
      .from("voice")
      .upload(filePath, buffer, {
        contentType: audioFile.type || "audio/webm",
        upsert: false,
      });

    // Находим принятый заказ
    const { data: acceptedOrder } = await admin
      .from("orders")
      .select("id")
      .eq("expert_id", profile.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    // Длительность записи (передаётся с фронтенда)
    const durationRaw = formData.get("duration");
    const durationSeconds = durationRaw ? parseInt(String(durationRaw), 10) || 0 : 0;

    // Создаём voice_recording
    const { data: recording, error: insertErr } = await admin
      .from("voice_recordings")
      .insert({
        expert_id: profile.id,
        order_id: acceptedOrder?.id ?? null,
        file_path: filePath,
        file_size: buffer.length,
        duration_seconds: durationSeconds,
        source: "web" as const,
        mime_type: audioFile.type || "audio/webm",
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
