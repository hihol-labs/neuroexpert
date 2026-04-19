"use client";

import { useState } from "react";

type Step = {
  num: string;
  title: string;
  short: string;
  icon: string;
  details: string[];
};

export function PipelineStep({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm">
      <button
        className="w-full flex items-center gap-4 p-6 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl text-white flex-shrink-0 font-bold">
          {step.num}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{step.icon}</span>
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
          </div>
          <p className="mt-1 text-sm text-gray-400">{step.short}</p>
        </div>
        <svg
          className={`h-5 w-5 text-gray-500 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-white/5 bg-white/5 px-6 py-4">
          <ul className="space-y-2">
            {step.details.map((d, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">&#10003;</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
