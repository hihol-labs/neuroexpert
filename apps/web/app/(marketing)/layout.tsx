import { NeuralBackground } from "@/components/marketing/neural-bg";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#040714]">
      <div className="fixed inset-0 z-0">
        <NeuralBackground className="opacity-40" nodeCount={150} hubCount={10} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
