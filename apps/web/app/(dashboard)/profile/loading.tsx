import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-28 animate-pulse bg-gray-200 rounded-lg" />
        <div className="h-10 w-32 animate-pulse bg-gray-200 rounded-lg" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <Skeleton className="h-5 w-48 mb-2" />
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <Skeleton className="h-5 w-56 mb-2" />
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
