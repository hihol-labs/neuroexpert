import { SkeletonCard, SkeletonChart, SkeletonTable } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div>
      <div className="h-8 w-32 animate-pulse bg-gray-200 rounded-lg mb-6" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="mb-8">
        <SkeletonChart />
      </div>

      <div className="mb-8">
        <SkeletonTable rows={5} />
      </div>
    </div>
  );
}
