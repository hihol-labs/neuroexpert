const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

interface ExpertData {
  full_name: string;
  slug: string;
  avatar_url?: string | null;
  qualification?: string | null;
  bio?: string | null;
  city?: string | null;
  alumni_of?: string | null;
  works_for?: string | null;
  knows_about?: string[] | null;
  years_experience?: number | null;
  consultation_price?: number | null;
  avg_rating?: number | null;
  review_count?: number | null;
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

interface ItemListEntry {
  name: string;
  url: string;
  description?: string | null;
}

interface QuestionSchemaData {
  question_text: string;
  slug: string;
  monthly_volume?: number | null;
  gap_score?: number | null;
}

interface AnswerSchemaData {
  title?: string | null;
  slug: string;
  meta_description?: string | null;
  published_at?: string | null;
  profiles: {
    full_name: string;
    slug: string;
  };
}

interface ReviewData {
  reviewer_name: string;
  rating: number;
  review_text?: string | null;
  created_at?: string | null;
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "НейроЭксперт",
    url: APP_URL,
    logo: `${APP_URL}/icon`,
    description:
      "Local Sales OS для локального бизнеса: спрос, точка входа, действие клиента, заявка, запись или продажа.",
    sameAs: [
      "https://neuroexpertise.ru/for-experts",
      "https://neuroexpertise.ru/for-business",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["ru"],
      url: `${APP_URL}/requisites`,
    },
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "НейроЭксперт",
    url: APP_URL,
    inLanguage: "ru-RU",
    potentialAction: {
      "@type": "SearchAction",
      target: `${APP_URL}/experts?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateServiceSchema({
  name,
  description,
  url,
  serviceType,
  offers,
}: {
  name: string;
  description: string;
  url: string;
  serviceType: string;
  offers?: Array<{ name: string; price?: string; url: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType,
    provider: {
      "@type": "Organization",
      name: "НейроЭксперт",
      url: APP_URL,
    },
    areaServed: {
      "@type": "Country",
      name: "Россия",
    },
    url,
    ...(offers?.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `${name}: тарифы и пакеты`,
            itemListElement: offers.map((offer) => ({
              "@type": "Offer",
              name: offer.name,
              url: offer.url,
              priceCurrency: "RUB",
              ...(offer.price ? { price: offer.price } : {}),
              availability: "https://schema.org/InStock",
            })),
          },
        }
      : {}),
  };
}

export function generateItemListSchema(name: string, items: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: item.url,
      item: {
        "@type": "Thing",
        name: item.name,
        url: item.url,
        ...(item.description ? { description: item.description } : {}),
      },
    })),
  };
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
    ...(expert.city
      ? { address: { "@type": "PostalAddress", addressLocality: expert.city } }
      : {}),
    ...(expert.years_experience
      ? { description: `${expert.bio ?? ""} Опыт: ${expert.years_experience} лет.`.trim() }
      : {}),
    ...(expert.avg_rating && expert.review_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: expert.avg_rating,
            reviewCount: expert.review_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(expert.consultation_price
      ? {
          makesOffer: {
            "@type": "Offer",
            name: `Консультация: ${expert.full_name}`,
            price: expert.consultation_price,
            priceCurrency: "RUB",
            availability: "https://schema.org/InStock",
            url: `${APP_URL}/experts/${expert.slug}`,
          },
        }
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

export function generateReviewSchemas(reviews: ReviewData[], expert: ExpertData) {
  return reviews.map((review) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "Person",
      name: expert.full_name,
      url: `${APP_URL}/experts/${expert.slug}`,
    },
    author: {
      "@type": "Person",
      name: review.reviewer_name,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    ...(review.review_text ? { reviewBody: review.review_text } : {}),
    ...(review.created_at ? { datePublished: review.created_at } : {}),
  }));
}

export function generateQAPageSchema(question: QuestionSchemaData, answers: AnswerSchemaData[]) {
  const suggestedAnswer = answers.slice(0, 10).map((answer) => ({
    "@type": "Answer",
    name: answer.title || question.question_text,
    text: answer.meta_description || answer.title || question.question_text,
    url: `${APP_URL}/experts/${answer.profiles.slug}/${answer.slug}`,
    author: {
      "@type": "Person",
      name: answer.profiles.full_name,
      url: `${APP_URL}/experts/${answer.profiles.slug}`,
    },
    ...(answer.published_at ? { dateCreated: answer.published_at } : {}),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: question.question_text,
      url: `${APP_URL}/questions/${question.slug}`,
      answerCount: answers.length,
      ...(question.monthly_volume ? { interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/SearchAction",
        userInteractionCount: question.monthly_volume,
      } } : {}),
      ...(suggestedAnswer.length ? { suggestedAnswer } : {}),
    },
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
