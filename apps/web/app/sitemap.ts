import type { MetadataRoute } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getAdmin();

  // Published articles
  const { data: articles } = await supabase
    .from("content_packages")
    .select("slug, updated_at, profiles!inner(slug)")
    .eq("status", "published")
    .not("slug", "is", null);

  // Published experts
  const { data: experts } = await supabase
    .from("profiles")
    .select("slug, updated_at")
    .eq("is_published", true);

  const entries: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/experts`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/audit`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Expert profiles
  for (const expert of experts ?? []) {
    entries.push({
      url: `${APP_URL}/experts/${expert.slug}`,
      lastModified: new Date(expert.updated_at),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Articles
  for (const article of articles ?? []) {
    const expertSlug = (article.profiles as unknown as { slug: string })?.slug;
    if (expertSlug && article.slug) {
      entries.push({
        url: `${APP_URL}/experts/${expertSlug}/${article.slug}`,
        lastModified: new Date(article.updated_at),
        changeFrequency: "monthly",
        priority: 0.9,
      });
    }
  }

  return entries;
}
