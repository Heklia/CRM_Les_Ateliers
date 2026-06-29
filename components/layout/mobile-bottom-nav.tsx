import Link from "next/link";
import { BarChart3, ClipboardList, KanbanSquare, ListTodo, Settings, Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

const mobileItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/actions-a-realiser", label: "A faire", icon: ListTodo },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/prospects", label: "Prospect", icon: Users },
  { href: "/visites", label: "Actions", icon: ClipboardList },
  { href: "/admin", label: "Admin", icon: Settings, adminOnly: true }
];

export async function MobileBottomNav() {
  const profile = await getCurrentProfile(createClient() as any);
  const visibleItems = mobileItems.filter(
    (item) => !item.adminOnly || profile?.role === "admin"
  );

  return (
    <nav className="mobile-bottom-nav overflow-x-auto border-t border-border bg-surface/95 px-1 pt-1 shadow-soft backdrop-blur">
      <div
        className={`mx-auto grid min-w-[340px] max-w-lg gap-0.5 ${
          visibleItems.length === 6 ? "grid-cols-6" : "grid-cols-5"
        }`}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-[10px] font-medium leading-none text-muted"
              href={item.href}
              key={item.href}
            >
              <span className="flex size-6 items-center justify-center">
                <Icon size={17} />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
