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
  contentId: string;
}

export function ArticleAnalytics({ expertSlug, articleSlug, contentId }: Props) {
  const ctaObserved = useRef(false);
  const ctaClicked = useRef(false);

  useEffect(() => {
    const slug = `${expertSlug}/${articleSlug}`;
    const record = (eventType: "view" | "cta_view" | "cta_click") => {
      fetch("/api/page-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: contentId,
          event_type: eventType,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    window.plausible?.("article_view", { props: { slug } });
    record("view");

    const cta = document.getElementById("booking");
    if (!cta) return;

    const handleClick = () => {
      if (ctaClicked.current) return;
      ctaClicked.current = true;
      window.plausible?.("cta_click", { props: { slug } });
      record("cta_click");
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !ctaObserved.current) {
          ctaObserved.current = true;
          window.plausible?.("cta_view", { props: { slug } });
          record("cta_view");
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(cta);
    cta.addEventListener("click", handleClick);

    return () => {
      observer.disconnect();
      cta.removeEventListener("click", handleClick);
    };
  }, [expertSlug, articleSlug, contentId]);

  return null;
}
