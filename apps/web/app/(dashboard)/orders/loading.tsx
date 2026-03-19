import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div>
      <div className="h-8 w-28 animate-pulse bg-gray-200 rounded-lg mb-6" />

      <div className="flex flex-wrap gap-2 mb-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b">
              <Skeleton className="h-3 w-32 mb-2" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="px-6 py-3 flex justify-between">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-3">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-36 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
