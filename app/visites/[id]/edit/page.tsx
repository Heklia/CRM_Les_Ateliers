import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EditVisitReportForm } from "@/components/visites/edit-visit-report-form";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";

type VisitRow = {
  id: string;
  prospect_id: string;
  visite_date: string;
  type: string;
  personnes_rencontrees: string | null;
  besoins: string | null;
  freins: string | null;
  application_envisagee: string | null;
  matiere_procede: string | null;
  budget_estime: number | null;
  delai_projet: string | null;
  niveau_interet: number | null;
  prochaine_etape: string | null;
  prochaine_relance_at: string | null;
  commentaire: string | null;
};

type ProspectRow = {
  id: string;
  company_name: string;
  city: string | null;
};

export default async function EditVisitPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const [{ data: visit }, { data: prospects }] = await Promise.all([
    supabase
      .from("visites")
      .select("id, prospect_id, commercial_id, visite_date, type, personnes_rencontrees, besoins, freins, application_envisagee, matiere_procede, budget_estime, delai_projet, niveau_interet, prochaine_etape, prochaine_relance_at, commentaire")
      .eq("id", params.id)
      .single(),
    scopeByCommercial(
      supabase
        .from("prospects")
        .select("id, company_name, city, commercial_id")
        .order("company_name", { ascending: true }),
      profile
    )
  ]);

  if (!visit) {
    notFound();
  }

  const visitRow = visit as VisitRow;
  const prospectRows = (prospects ?? []) as ProspectRow[];

  return (
    <main>
      <PageHeader
        title="Modifier la visite"
        description="Mettre a jour le compte-rendu terrain et les prochaines actions."
        action={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-background"
            href="/visites"
          >
            <ArrowLeft size={16} />
            Retour aux visites
          </Link>
        }
      />

      <EditVisitReportForm
        prospects={prospectRows}
        visit={{
          id: visitRow.id,
          prospectId: visitRow.prospect_id,
          visitDate: visitRow.visite_date,
          type: visitRow.type,
          peopleMet: visitRow.personnes_rencontrees,
          need: visitRow.besoins ?? "",
          pain: visitRow.freins,
          application: visitRow.application_envisagee,
          material: visitRow.matiere_procede,
          budget: visitRow.budget_estime,
          timeline: visitRow.delai_projet,
          interest: toInterestLabel(visitRow.niveau_interet),
          nextStep: visitRow.prochaine_etape ?? "",
          followUpAt: visitRow.prochaine_relance_at,
          comment: visitRow.commentaire
        }}
      />
    </main>
  );
}

function toInterestLabel(value: number | null) {
  if ((value ?? 0) >= 5) return "chaud";
  if ((value ?? 0) >= 3) return "tiede";
  return "froid";
}
