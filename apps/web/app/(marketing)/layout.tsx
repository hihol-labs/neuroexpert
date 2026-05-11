export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="relative">{children}</div>
    </div>
  );
}
