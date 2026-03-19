export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 mr-4">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border">
      <div className="border-b px-6 py-3">
        <div className="flex gap-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-100 px-6">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-8 py-4">
            {[...Array(4)].map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl border p-6">
      <Skeleton className="h-5 w-48 mb-4" />
      <Skeleton className="h-[250px] w-full" />
    </div>
  );
}
