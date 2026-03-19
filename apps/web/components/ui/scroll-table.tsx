"use client";

import { useRef, useState, useEffect } from "react";

export function ScrollTable({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function check() {
      if (!el) return;
      setShowFade(el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    check();
    el.addEventListener("scroll", check, { passive: true });
    const observer = new ResizeObserver(check);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", check);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="overflow-x-auto">
        {children}
      </div>
      {showFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
      )}
    </div>
  );
}
