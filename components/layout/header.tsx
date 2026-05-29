import Link from "next/link";
import { BarChart3, LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
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
        <div className="flex items-center gap-2">
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
          <form action={signOut}>
            <button
              aria-label="Se deconnecter"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold text-muted hover:bg-background hover:text-foreground"
              type="submit"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Deconnexion</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
