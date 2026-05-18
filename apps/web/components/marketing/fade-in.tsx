import type { ReactNode } from "react";

export function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  void delay;

  return <div className={className}>{children}</div>;
}
