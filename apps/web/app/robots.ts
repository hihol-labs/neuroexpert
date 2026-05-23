import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "CCBot",
  "Google-Extended",
  "YandexBot",
];

const PUBLIC_API_ALLOW = [
  "/api/v1/docs",
  "/api/v1/experts",
  "/api/v1/articles",
  "/api/v1/questions",
  "/api/v1/answers",
  "/api/v1/blind-spots",
];

const PRIVATE_DISALLOW = [
  "/dashboard/",
  "/billing/",
  "/api/",
  "/auth/",
  "/supabase/",
  "/login",
  "/register",
  "/track/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...PUBLIC_API_ALLOW],
        disallow: PRIVATE_DISALLOW,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: ["/", ...PUBLIC_API_ALLOW],
        disallow: PRIVATE_DISALLOW,
      })),
      {
        userAgent: ["Googlebot", "bingbot"],
        allow: ["/", ...PUBLIC_API_ALLOW],
        disallow: PRIVATE_DISALLOW,
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
