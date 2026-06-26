import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { ImportQuotesForm } from "@/components/pipeline/import-quotes-form";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPipelinePage() {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main>
      <PageHeader
        title="Importer des devis"
        description="Creation ou mise a jour des opportunites du pipeline depuis un fichier CSV."
      />

      <div className="mb-4">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold hover:bg-background"
          href="/pipeline"
        >
          <ArrowLeft size={16} />
          Retour pipeline
        </Link>
      </div>

      <ImportQuotesForm />
    </main>
  );
}
