import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <div>
      <div className="h-8 w-28 animate-pulse bg-gray-200 rounded-lg mb-6" />

      <div className="flex flex-wrap gap-2 mb-6">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      <SkeletonTable rows={5} />
    </div>
  );
}
