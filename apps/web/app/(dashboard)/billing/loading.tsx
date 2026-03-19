import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div>
      <div className="h-8 w-28 animate-pulse bg-gray-200 rounded-lg mb-6" />

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="h-6 w-40 animate-pulse bg-gray-200 rounded-lg mb-4" />
      <SkeletonTable rows={3} />
    </div>
  );
}
