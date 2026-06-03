import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { QuickVisitButton } from "@/components/layout/quick-visit-button";

export async function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto w-full max-w-7xl px-3 pb-28 pt-4 sm:px-6 md:pb-8 md:pt-6 lg:px-8">
        {children}
      </div>
      <QuickVisitButton />
      <MobileBottomNav />
    </div>
  );
}
