import { SkeletonCard, SkeletonRow } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="nx-loading">
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-32 animate-pulse bg-gray-200 rounded-lg" />
        <div className="h-10 w-36 animate-pulse bg-gray-200 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-40 animate-pulse bg-gray-200 rounded" />
            <div className="h-4 w-10 animate-pulse bg-gray-200 rounded" />
          </div>
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-40 animate-pulse bg-gray-200 rounded" />
            <div className="h-4 w-10 animate-pulse bg-gray-200 rounded" />
          </div>
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      </div>
    </div>
  );
}
