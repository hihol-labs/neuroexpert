const colors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  recording: "bg-purple-100 text-purple-800",
  processing: "bg-indigo-100 text-indigo-800",
  generating: "bg-indigo-100 text-indigo-800",
  review: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  published: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  failed: "bg-red-100 text-red-800",
  new: "bg-blue-100 text-blue-800",
  notified: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  free: "bg-gray-100 text-gray-800",
  starter: "bg-blue-100 text-blue-800",
  pro: "bg-purple-100 text-purple-800",
  expert: "bg-yellow-100 text-yellow-800",
  business: "bg-orange-100 text-orange-800",
  enterprise: "bg-red-100 text-red-800",
};

export function Badge({ status, className = "" }: { status: string; className?: string }) {
  const color = colors[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color} ${className}`}>
      {status}
    </span>
  );
}
