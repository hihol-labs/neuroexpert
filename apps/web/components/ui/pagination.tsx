import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, baseUrl, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(page: number) {
    const params = new URLSearchParams(searchParams);
    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav aria-label="Пагинация" className="flex items-center justify-center gap-1 mt-6">
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      )}

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">...</span>
        ) : (
          <Link
            key={p}
            href={buildUrl(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              p === currentPage
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {p}
          </Link>
        ),
      )}

      {currentPage < totalPages && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label="Следующая страница"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </nav>
  );
}
