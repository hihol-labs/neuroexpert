"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "neuroexpert_compare";

export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setIds(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const toggle = (id: string) => {
    setIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 5
          ? [...prev, id]
          : prev;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clear = () => {
    setIds([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { ids, toggle, clear };
}

export function CompareBar() {
  const { ids, clear } = useCompare();

  if (ids.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-700">
          Выбрано для сравнения: <strong>{ids.length}</strong> (макс. 5)
        </span>
        <div className="flex gap-2">
          <button
            onClick={clear}
            className="px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Очистить
          </button>
          <Link
            href={`/compare?ids=${ids.join(",")}`}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Сравнить
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CompareCheckbox({ expertId }: { expertId: string }) {
  const { ids, toggle } = useCompare();
  const isSelected = ids.includes(expertId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(expertId);
      }}
      className={`absolute top-2 right-2 w-6 h-6 rounded border-2 flex items-center justify-center text-xs transition-colors ${
        isSelected
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white border-gray-300 text-transparent hover:border-blue-400"
      }`}
      title={isSelected ? "Убрать из сравнения" : "Добавить к сравнению"}
    >
      ✓
    </button>
  );
}
