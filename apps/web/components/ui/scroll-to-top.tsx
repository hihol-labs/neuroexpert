"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Наверх"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
