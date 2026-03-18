import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { voice_recording_id } = await request.json();
  if (!voice_recording_id) {
    return NextResponse.json(
      { error: "voice_recording_id обязателен" },
      { status: 400 },
    );
  }

  const admin = getAdmin();

  // Get transcript
  const { data: recording } = await admin
    .from("voice_recordings")
    .select("transcript, order_id")
    .eq("id", voice_recording_id)
    .single();

  if (!recording?.transcript) {
    return NextResponse.json(
      { error: "Транскрипт ещё не готов" },
      { status: 404 },
    );
  }

  // Get question text from order
  let questionText = "Свободная тема";
  if (recording.order_id) {
    const { data: order } = await admin
      .from("orders")
      .select("questions(question_text)")
      .eq("id", recording.order_id)
      .single();

    const q = order?.questions as unknown as { question_text: string } | null;
    if (q) questionText = q.question_text;
  }

  // Generate follow-up questions via LLM
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ questions: [], is_complete: true });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_BULK || "gpt-4o-mini",
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Ты — AI-ассистент, который помогает эксперту дать более полный ответ. Анализируй транскрипт и предлагай уточняющие вопросы.",
        },
        {
          role: "user",
          content: `Проанализируй расшифровку ответа эксперта и определи, что можно раскрыть глубже.

Вопрос: ${questionText}

Расшифровка эксперта:
${recording.transcript.slice(0, 3000)}

Задача: сгенерируй 2-3 уточняющих вопроса, которые помогут эксперту дополнить ответ. Вопросы должны:
- Касаться аспектов темы, которые эксперт НЕ раскрыл
- Быть конкретными (дозировки, сроки, цифры, примеры из практики)
- Быть короткими (1 предложение)

Если ответ уже полный — верни пустой массив.

JSON: {"questions": ["вопрос 1", "вопрос 2"], "is_complete": true/false, "reason": "почему"}`,
        },
      ],
    });

    const parsed = JSON.parse(
      res.choices[0]?.message?.content || '{"questions":[],"is_complete":true}',
    ) as { questions: string[]; is_complete: boolean; reason?: string };

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[voice-followup] Error:", err);
    return NextResponse.json({ questions: [], is_complete: true });
  }
}
