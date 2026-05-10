export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0a0d0c] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0f1513_0%,#0a0d0c_46%,#060807_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(115deg,rgba(16,185,129,0.12)_0%,rgba(34,211,238,0.07)_28%,rgba(15,23,42,0)_62%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(110,231,183,0.35),transparent)]" />
        <div className="absolute left-0 top-0 h-full w-[42%] bg-[linear-gradient(90deg,rgba(255,255,255,0.035),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-[320px] bg-[linear-gradient(0deg,rgba(4,8,7,0.98),rgba(4,8,7,0))]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
