import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content_id } = await request.json();
    if (!content_id) {
      return NextResponse.json({ error: "content_id is required" }, { status: 400 });
    }

    const admin = getAdmin();

    // Verify ownership
    const { data: pkg } = await admin
      .from("content_packages")
      .select("id, expert_id, title, slug, status, profiles!inner(slug, telegram_id, niche_id, niches(slug))")
      .eq("id", content_id)
      .single();

    if (!pkg || pkg.expert_id !== user.id) {
      return NextResponse.json({ error: "Not found or not owner" }, { status: 404 });
    }

    if (pkg.status === "published") {
      return NextResponse.json({ error: "Already published" }, { status: 400 });
    }

    const expertSlug = (pkg.profiles as unknown as { slug: string }).slug;
    const publishedUrl = `${APP_URL}/experts/${expertSlug}/${pkg.slug}`;

    // Publish
    await admin
      .from("content_packages")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        published_url: publishedUrl,
      })
      .eq("id", content_id);

    // Update order status if exists
    await admin
      .from("orders")
      .update({ status: "published" })
      .eq("id", content_id);

    // Create crosspost job
    await admin.from("jobs").insert({
      type: "crosspost_social",
      payload: { content_id, expert_id: user.id },
      priority: 7,
    });

    // ISR revalidation
    revalidatePath(`/experts/${expertSlug}/${pkg.slug}`);
    revalidatePath(`/experts/${expertSlug}`);
    revalidatePath("/experts");
    revalidatePath("/sitemap.xml");

    // Telegram sharing notification with niche-specific channels
    const profile = pkg.profiles as unknown as { telegram_id: number | null; niches: { slug: string } | null };
    const telegramId = profile.telegram_id;
    const nicheSlug = profile.niches?.slug;
    if (telegramId) {
      await sendSharingNotification(telegramId, pkg.title ?? "", publishedUrl, nicheSlug ?? undefined);
    }

    return NextResponse.json({ ok: true, url: publishedUrl });
  } catch (err) {
    console.error("[publish] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function sendSharingNotification(telegramId: number, title: string, url: string, nicheSlug?: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  // Get niche-specific channels
  let channelLines: string[] = [];
  if (nicheSlug) {
    const { getNicheChannels } = await import("@/lib/niche-channels");
    const channels = getNicheChannels(nicheSlug);
    if (channels.length > 0) {
      channelLines = [
        "",
        "📢 Рекомендуемые чаты для вашей ниши:",
        ...channels.map((c) => `  • ${c.name}`),
      ];
    }
  }

  const text = [
    "🎉 Статья опубликована!",
    "",
    `📝 ${title}`,
    `🔗 ${url}`,
    "",
    "Поделитесь в первые 3 дня — это важно для индексации!",
    ...channelLines,
  ].join("\n");

  // Build keyboard with niche-specific share buttons
  const shareButtons: Array<{ text: string; url: string }> = [
    { text: "📤 Шеринг в чаты", url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
  ];

  if (nicheSlug) {
    const { getNicheChannels } = await import("@/lib/niche-channels");
    const channels = getNicheChannels(nicheSlug);
    for (const ch of channels.slice(0, 2)) {
      shareButtons.push({
        text: `📢 ${ch.name}`,
        url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}&to=${encodeURIComponent(ch.url.replace("https://t.me/", ""))}`,
      });
    }
  }

  const keyboard = {
    inline_keyboard: [
      shareButtons.slice(0, 1).map((b) => ({ text: b.text, url: b.url })),
      ...shareButtons.slice(1).map((b) => [{ text: b.text, url: b.url }]),
      [{ text: "📋 Копировать пост", callback_data: `copy_post:${url}` }],
    ],
  };

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramId, text, reply_markup: keyboard }),
    });
  } catch (err) {
    console.error("[publish] Sharing notification failed:", err);
  }
}
