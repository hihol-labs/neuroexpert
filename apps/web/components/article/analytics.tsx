"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

interface Props {
  expertSlug: string;
  articleSlug: string;
}

export function ArticleAnalytics({ expertSlug, articleSlug }: Props) {
  const ctaObserved = useRef(false);

  useEffect(() => {
    const slug = `${expertSlug}/${articleSlug}`;
    window.plausible?.("article_view", { props: { slug } });

    const cta = document.getElementById("booking");
    if (!cta) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !ctaObserved.current) {
          ctaObserved.current = true;
          window.plausible?.("cta_view", { props: { slug } });
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(cta);
    return () => observer.disconnect();
  }, [expertSlug, articleSlug]);

  return null;
}
