import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { VisitReportForm } from "@/components/visites/visit-report-form";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";

export default async function NewVisitPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectsQuery = supabase
    .from("prospects")
    .select("id, company_name, city")
    .order("company_name", { ascending: true });
  const { data: prospects } = await scopeByCommercial(prospectsQuery, profile);

  return (
    <main>
      <PageHeader
        title="Compte-rendu de visite"
        description="Saisie rapide terrain : prospect, besoin, interet, prochaine action."
      />

      <VisitReportForm prospects={prospects ?? []} />
    </main>
  );
}
