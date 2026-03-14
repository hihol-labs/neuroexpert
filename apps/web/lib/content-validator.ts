export interface ContentValidation {
  word_count: number;
  has_tldr: boolean;
  has_table: boolean;
  passage_count: number;
}

export function validateContentStructure(article: string): ContentValidation {
  const wordCount = article.split(/\s+/).filter(Boolean).length;
  const hasTldr = /\*\*TL;DR[:\*]*\s*/i.test(article) || article.toLowerCase().startsWith("tl;dr");
  const hasTable = article.includes("| ") && article.includes(" |") && article.includes("---");
  const headings = article.match(/^#{2,3}\s+.+/gm) ?? [];

  return {
    word_count: wordCount,
    has_tldr: hasTldr,
    has_table: hasTable,
    passage_count: headings.length,
  };
}
