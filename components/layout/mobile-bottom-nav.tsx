import Link from "next/link";
import { BarChart3, ClipboardList, ListTodo, PlusCircle, Users } from "lucide-react";

const mobileItems = [
  { href: "/dashboard", label: "Accueil", icon: BarChart3 },
  { href: "/actions-a-realiser", label: "A faire", icon: ListTodo },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/visites/new", label: "Action", icon: PlusCircle, primary: true },
  { href: "/visites", label: "Actions", icon: ClipboardList }
];

export function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-surface/95 px-1 pt-1 shadow-soft backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-0.5">
        {mobileItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-medium leading-none text-muted"
              href={item.href}
              key={item.href}
            >
              <span
                className={
                  item.primary
                    ? "flex size-9 items-center justify-center rounded-full bg-primary text-white"
                    : "flex size-6 items-center justify-center"
                }
              >
                <Icon size={item.primary ? 20 : 17} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
