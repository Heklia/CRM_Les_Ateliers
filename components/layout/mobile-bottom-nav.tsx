import Link from "next/link";
import { BarChart3, ClipboardList, Download, PlusCircle, Users } from "lucide-react";

const mobileItems = [
  { href: "/dashboard", label: "Accueil", icon: BarChart3 },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/visites/new", label: "Visite", icon: PlusCircle, primary: true },
  { href: "/visites", label: "CR", icon: ClipboardList },
  { href: "/exports", label: "Exports", icon: Download }
];

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-2 pb-2 pt-1 shadow-soft backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-medium text-muted"
              href={item.href}
              key={item.href}
            >
              <span
                className={
                  item.primary
                    ? "flex size-10 items-center justify-center rounded-full bg-primary text-white"
                    : "flex size-7 items-center justify-center"
                }
              >
                <Icon size={item.primary ? 22 : 18} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
