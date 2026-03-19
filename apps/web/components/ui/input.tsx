import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        id={id}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        } ${className}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      />
      {error && <p id={id ? `${id}-error` : undefined} className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = "", id, ...props }: { label?: string; error?: string; id?: string; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea
        id={id}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        } ${className}`}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
