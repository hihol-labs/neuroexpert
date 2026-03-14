const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface ExpertData {
  full_name: string;
  slug: string;
  avatar_url?: string | null;
  qualification?: string | null;
  bio?: string | null;
  alumni_of?: string | null;
  works_for?: string | null;
  knows_about?: string[] | null;
  years_experience?: number | null;
}

interface ArticleData {
  title: string;
  slug: string;
  meta_description?: string | null;
  format_seo_article?: string | null;
  word_count?: number | null;
  published_at?: string | null;
  updated_at?: string | null;
  keywords?: string[] | null;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateArticleSchema(article: ArticleData, expert: ExpertData) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta_description || "",
    author: {
      "@type": "Person",
      name: expert.full_name,
      url: `${APP_URL}/experts/${expert.slug}`,
      ...(expert.avatar_url ? { image: expert.avatar_url } : {}),
    },
    datePublished: article.published_at || new Date().toISOString(),
    dateModified: article.updated_at || article.published_at || new Date().toISOString(),
    wordCount: article.word_count || 0,
    keywords: article.keywords?.join(", ") || "",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${APP_URL}/experts/${expert.slug}/${article.slug}`,
    },
    publisher: {
      "@type": "Organization",
      name: "НейроЭксперт",
      url: APP_URL,
    },
  };
}

export function generatePersonSchema(expert: ExpertData) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: expert.full_name,
    url: `${APP_URL}/experts/${expert.slug}`,
    ...(expert.avatar_url ? { image: expert.avatar_url } : {}),
    ...(expert.bio ? { description: expert.bio } : {}),
    ...(expert.qualification ? { jobTitle: expert.qualification } : {}),
    ...(expert.alumni_of
      ? { alumniOf: { "@type": "Organization", name: expert.alumni_of } }
      : {}),
    ...(expert.works_for
      ? { worksFor: { "@type": "Organization", name: expert.works_for } }
      : {}),
    ...(expert.knows_about?.length
      ? { knowsAbout: expert.knows_about }
      : {}),
  };
}

export function generateFAQSchema(items: FaqItem[]) {
  if (!items?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateHowToSchema(article: string, title: string) {
  // Автодетекция пошаговой инструкции
  const steps: Array<{ name: string; text: string }> = [];
  const stepPattern = /(?:^|\n)(?:Шаг\s+\d+[:.]\s*|Step\s+\d+[:.]\s*|\d+\.\s+)(.+?)(?=\n(?:Шаг\s+\d+|Step\s+\d+|\d+\.\s)|$)/g;

  for (const match of article.matchAll(stepPattern)) {
    if (steps.length >= 10) break;
    const text = match[1].trim();
    if (text.length > 20) {
      steps.push({ name: text.slice(0, 80), text });
    }
  }

  if (steps.length < 3) return null;

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
