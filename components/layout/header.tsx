import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { navItems } from "@/lib/constants";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3 font-semibold" href="/dashboard">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-white">
            <BarChart3 size={18} />
          </span>
          <span className="truncate">Prospection Terrain</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-background hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
