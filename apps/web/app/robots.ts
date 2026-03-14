import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "YandexBot", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "bingbot", allow: "/" },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
