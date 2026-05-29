import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImportProspectsForm } from "@/components/prospects/import-prospects-form";
import { PageHeader } from "@/components/ui/page-header";

export default function ImportProspectsPage() {
  return (
    <main>
      <PageHeader
        title="Importer des prospects"
        description="Ajoutez rapidement une liste de prospects depuis un fichier CSV."
        action={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-background"
            href="/prospects"
          >
            <ArrowLeft size={16} />
            Retour aux prospects
          </Link>
        }
      />

      <ImportProspectsForm />
    </main>
  );
}
