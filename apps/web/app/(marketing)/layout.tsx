export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0b1110] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(34,211,238,0.05)_45%,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-[260px] bg-[linear-gradient(0deg,rgba(15,23,20,0.92),transparent)]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
