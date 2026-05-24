import {
  APP_URL,
  SITEMAP_KINDS,
  SITEMAP_REVALIDATE_SECONDS,
  renderSitemapIndex,
  sitemapXmlResponse,
} from "@/lib/sitemap-xml";

export const revalidate = SITEMAP_REVALIDATE_SECONDS;
export const dynamic = "force-static";

export async function GET() {
  const now = new Date().toISOString();
  const body = renderSitemapIndex(
    SITEMAP_KINDS.map(({ kind }) => ({
      loc: `${APP_URL}/sitemaps/${kind}.xml`,
      lastmod: now,
    })),
  );

  return sitemapXmlResponse(body);
}
