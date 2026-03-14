import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface SeoArticle {
  title: string;
  slug: string;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
  published_at?: string | null;
  updated_at?: string | null;
}

interface SeoExpert {
  full_name: string;
  slug: string;
  avatar_url?: string | null;
}

export function generateArticleMetadata(article: SeoArticle, expert: SeoExpert): Metadata {
  const title = `${article.meta_title || article.title} — ${expert.full_name} | НейроЭксперт`;
  const description = article.meta_description || article.title;
  const url = `${APP_URL}/experts/${expert.slug}/${article.slug}`;

  return {
    title,
    description,
    keywords: article.keywords?.join(", "),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: article.published_at || undefined,
      modifiedTime: article.updated_at || undefined,
      authors: [expert.full_name],
      ...(expert.avatar_url ? { images: [expert.avatar_url] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function generateExpertMetadata(expert: {
  full_name: string;
  slug: string;
  qualification?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}): Metadata {
  const title = `${expert.full_name}${expert.qualification ? ` — ${expert.qualification}` : ""} | НейроЭксперт`;
  const description = expert.bio || `Эксперт ${expert.full_name} на платформе НейроЭксперт`;
  const url = `${APP_URL}/experts/${expert.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      ...(expert.avatar_url ? { images: [expert.avatar_url] } : {}),
    },
  };
}
