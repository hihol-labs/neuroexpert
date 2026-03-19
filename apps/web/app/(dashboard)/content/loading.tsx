import { Skeleton } from "@/components/ui/skeleton";

export default function ContentLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-28 animate-pulse bg-gray-200 rounded-lg" />
        <div className="h-10 w-36 animate-pulse bg-gray-200 rounded-lg" />
      </div>

      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
