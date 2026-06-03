import type { ReactNode } from "react";
import { AppChrome } from "@/components/layout/app-chrome";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { QuickVisitButton } from "@/components/layout/quick-visit-button";

export async function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppChrome
      header={<Header />}
      mobileNav={<MobileBottomNav />}
      quickAction={<QuickVisitButton />}
    >
      {children}
    </AppChrome>
  );
}
