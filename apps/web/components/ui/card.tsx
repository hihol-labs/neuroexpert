export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium text-gray-500">{children}</h3>;
}

export function CardValue({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-2xl font-bold text-gray-900">{children}</p>;
}
