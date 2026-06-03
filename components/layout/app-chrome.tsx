"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const authPaths = new Set(["/login", "/forgot-password"]);

export function AppChrome({
  children,
  header,
  mobileNav,
  quickAction
}: {
  children: ReactNode;
  header: ReactNode;
  mobileNav: ReactNode;
  quickAction: ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = authPaths.has(pathname);

  if (isAuthPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen">
      {header}
      <div className="mx-auto w-full max-w-7xl px-3 pb-20 pt-4 sm:px-6 md:pb-8 md:pt-6 lg:px-8">
        {children}
      </div>
      {quickAction}
      {mobileNav}
    </div>
  );
}
