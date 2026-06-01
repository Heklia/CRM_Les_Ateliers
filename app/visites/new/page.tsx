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
    .select("id, company_name, city, status")
    .order("company_name", { ascending: true });
  const contactsQuery = supabase
    .from("contacts")
    .select("id, prospect_id, first_name, last_name, job_title, is_primary")
    .order("is_primary", { ascending: false });
  const [{ data: prospects }, { data: contacts }] = await Promise.all([
    scopeByCommercial(prospectsQuery, profile),
    scopeByCommercial(contactsQuery, profile)
  ]);

  return (
    <main>
      <PageHeader
        title="Nouvelle action"
        description="Saisie rapide terrain : prospect, personne concernee, besoin, interet et prochaine action."
      />

      <VisitReportForm contacts={contacts ?? []} prospects={prospects ?? []} />
    </main>
  );
}
