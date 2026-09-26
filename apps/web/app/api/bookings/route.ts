import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Rate limit: 5 per hour per IP
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 3600_000;
  const max = 5;
  const timestamps = rateLimitMap.get(ip)?.filter((t) => now - t < window) ?? [];
  if (timestamps.length >= max) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// GET: available slots for an expert
export async function GET(request: NextRequest) {
  const expertId = request.nextUrl.searchParams.get("expert_id");
  const date = request.nextUrl.searchParams.get("date"); // YYYY-MM-DD

  if (!expertId) {
    return NextResponse.json({ error: "expert_id обязателен" }, { status: 400 });
  }

  const admin = getAdmin();

  // Get expert schedule
  const { data: schedule } = await admin
    .from("expert_schedule")
    .select("day_of_week, start_time, end_time")
    .eq("expert_id", expertId)
    .eq("is_active", true);

  if (!schedule?.length) {
    return NextResponse.json({ slots: [], schedule: [] });
  }

  // If specific date requested, get booked slots
  let bookedSlots: string[] = [];
  if (date) {
    const { data: bookings } = await admin
      .from("bookings")
      .select("booking_time, duration_minutes")
      .eq("expert_id", expertId)
      .eq("booking_date", date)
      .in("status", ["pending", "confirmed"]);

    bookedSlots = (bookings ?? []).map((b) => b.booking_time);
  }

  // Generate available time slots
  const slots: { time: string; available: boolean }[] = [];
  if (date) {
    const dayOfWeek = new Date(date).getDay();
    const daySchedule = schedule.find((s) => s.day_of_week === dayOfWeek);

    if (daySchedule) {
      const [startH] = daySchedule.start_time.split(":").map(Number);
      const [endH] = daySchedule.end_time.split(":").map(Number);

      for (let h = startH; h < endH; h++) {
        const time = `${String(h).padStart(2, "0")}:00:00`;
        slots.push({
          time: `${String(h).padStart(2, "0")}:00`,
          available: !bookedSlots.includes(time),
        });
      }
    }
  }

  return NextResponse.json({ slots, schedule });
}

// POST: create a booking
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { expert_id, client_name, client_contact, client_message, booking_date, booking_time } = body;

    if (!expert_id || !client_name || !client_contact || !booking_date || !booking_time) {
      return NextResponse.json(
        { error: "Все поля обязательны" },
        { status: 400 },
      );
    }

    const admin = getAdmin();

    // Check expert exists
    const { data: expert } = await admin
      .from("profiles")
      .select("id, telegram_id, full_name")
      .eq("id", expert_id)
      .eq("is_published", true)
      .single();

    if (!expert) {
      return NextResponse.json({ error: "Эксперт не найден" }, { status: 404 });
    }

    // Check slot is available
    const { data: existing } = await admin
      .from("bookings")
      .select("id")
      .eq("expert_id", expert_id)
      .eq("booking_date", booking_date)
      .eq("booking_time", `${booking_time}:00`)
      .in("status", ["pending", "confirmed"])
      .single();

    if (existing) {
      return NextResponse.json({ error: "Это время уже занято" }, { status: 409 });
    }

    const { data: booking, error } = await admin
      .from("bookings")
      .insert({
        expert_id,
        client_name,
        client_contact,
        client_message: client_message || null,
        booking_date,
        booking_time: `${booking_time}:00`,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[bookings] Error:", error);
      return NextResponse.json({ error: "Ошибка создания записи" }, { status: 500 });
    }

    // R-08: уведомление эксперту - job notify_expert (Telegram при наличии + e-mail всегда). Кнопки
    // «Подтвердить / Отменить» убраны: у них не было обработчиков (тикет в BACKLOG).
    const { error: notifyErr } = await admin.from("jobs").insert({
      type: "notify_expert",
      payload: { kind: "booking", ref_id: booking.id, expert_id: expert.id },
      priority: 3,
    });
    if (notifyErr) console.error("[bookings] notify_expert enqueue failed:", notifyErr.message);

    return NextResponse.json({ ok: true, booking_id: booking.id });
  } catch (err) {
    console.error("[bookings] Error:", err);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
