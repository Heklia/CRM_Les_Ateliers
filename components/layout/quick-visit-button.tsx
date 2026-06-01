import Link from "next/link";
import { PlusCircle } from "lucide-react";

export function QuickVisitButton() {
  return (
    <Link
      className="fixed bottom-24 right-4 z-30 hidden h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 md:inline-flex"
      href="/visites/new"
    >
      <PlusCircle size={20} />
      Ajouter action
    </Link>
  );
}
