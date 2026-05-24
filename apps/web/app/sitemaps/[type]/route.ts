import { unstable_cache } from "next/cache";
import {
  SITEMAP_REVALIDATE_SECONDS,
  getSitemapUrls,
  renderUrlSet,
  sitemapXmlResponse,
  type SitemapKind,
} from "@/lib/sitemap-xml";

export const revalidate = SITEMAP_REVALIDATE_SECONDS;
export const dynamic = "force-dynamic";

const SITEMAP_TYPES = new Set<SitemapKind>(["static", "experts", "questions", "niches", "articles"]);

function parseType(type: string): SitemapKind | null {
  const kind = type.replace(/\.xml$/, "") as SitemapKind;
  return SITEMAP_TYPES.has(kind) ? kind : null;
}

const getCachedSitemapXml = unstable_cache(
  async (kind: SitemapKind) => renderUrlSet(await getSitemapUrls(kind)),
  ["sitemap-segments-v1"],
  {
    revalidate: SITEMAP_REVALIDATE_SECONDS,
    tags: ["sitemap"],
  },
);

export async function GET(_request: Request, { params }: { params: { type: string } }) {
  const kind = parseType(params.type);

  if (!kind) {
    return new Response("Not found", { status: 404 });
  }

  return sitemapXmlResponse(await getCachedSitemapXml(kind));
}
