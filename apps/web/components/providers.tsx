"use client";

import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
        <ScrollToTop />
      </ConfirmProvider>
    </ToastProvider>
  );
}
