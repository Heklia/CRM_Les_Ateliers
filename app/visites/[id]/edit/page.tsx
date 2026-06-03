import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ResourceAssignmentsForm } from "@/components/admin/resource-assignments-form";
import { EditVisitReportForm } from "@/components/visites/edit-visit-report-form";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";

type VisitRow = {
  id: string;
  prospect_id: string;
  opportunite_id: string | null;
  commercial_id: string;
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
  contact_id: string | null;
};

type ProspectRow = {
  id: string;
  company_name: string;
  city: string | null;
  status: string;
};

type ContactRow = {
  id: string;
  prospect_id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
};

type OpportunityRow = {
  id: string;
  prospect_id: string;
  title: string;
  stage: string;
  description: string | null;
  estimated_value: number | null;
  expected_close_date: string | null;
  probability: number;
};

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
};

type VisitAssignmentRow = {
  user_id: string;
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

  const [
    { data: visit },
    { data: prospects },
    { data: contacts },
    { data: opportunities },
    { data: users },
    { data: assignments }
  ] = await Promise.all([
    supabase
      .from("visites")
      .select("id, prospect_id, opportunite_id, contact_id, commercial_id, visite_date, type, personnes_rencontrees, besoins, freins, application_envisagee, matiere_procede, budget_estime, delai_projet, niveau_interet, prochaine_etape, prochaine_relance_at, commentaire")
      .eq("id", params.id)
      .single(),
    scopeByCommercial(
      supabase
        .from("prospects")
        .select("id, company_name, city, status, commercial_id")
        .order("company_name", { ascending: true }),
      profile
    ),
    scopeByCommercial(
      supabase
        .from("contacts")
        .select("id, prospect_id, first_name, last_name, job_title, commercial_id")
        .order("is_primary", { ascending: false }),
      profile
    ),
    scopeByCommercial(
      supabase
        .from("opportunites")
        .select("id, prospect_id, title, stage, description, estimated_value, expected_close_date, probability, commercial_id")
        .order("updated_at", { ascending: false }),
      profile
    ),
    profile.role === "admin"
      ? supabase
          .from("users")
          .select("id, email, full_name, is_active")
          .order("full_name", { ascending: true })
      : Promise.resolve({ data: [] }),
    profile.role === "admin"
      ? supabase
          .from("visite_assignments")
          .select("user_id")
          .eq("visite_id", params.id)
      : Promise.resolve({ data: [] })
  ]);

  if (!visit) {
    notFound();
  }

  const visitRow = visit as VisitRow;
  const prospectRows = (prospects ?? []) as ProspectRow[];
  const contactRows = (contacts ?? []) as ContactRow[];
  const opportunityRows = (opportunities ?? []) as OpportunityRow[];
  const userRows = (users ?? []) as UserRow[];
  const assignmentRows = (assignments ?? []) as VisitAssignmentRow[];
  const currentProspect = prospectRows.find((prospect) => prospect.id === visitRow.prospect_id);
  const assignmentUsers = userRows.map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    isActive: user.is_active
  }));
  const assignedUserIds =
    assignmentRows.length > 0
      ? assignmentRows.map((assignment) => assignment.user_id)
      : [visitRow.commercial_id];

  return (
    <main>
      <PageHeader
        title="Modifier l'action"
        description="Mettre a jour l'action commerciale et l'action a realiser."
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

      {profile.role === "admin" ? (
        <div className="mb-6">
          <ResourceAssignmentsForm
            assignedUserIds={assignedUserIds}
            resourceId={visitRow.id}
            type="visit"
            users={assignmentUsers}
          />
        </div>
      ) : null}

      <EditVisitReportForm
        contacts={contactRows}
        opportunities={opportunityRows}
        prospects={prospectRows}
        visit={{
          id: visitRow.id,
          prospectId: visitRow.prospect_id,
          opportunityId: visitRow.opportunite_id,
          contactId: visitRow.contact_id,
          visitDate: visitRow.visite_date,
          type: visitRow.type,
          peopleMet: visitRow.personnes_rencontrees,
          need: visitRow.besoins ?? "",
          pain: visitRow.freins,
          application: visitRow.application_envisagee,
          material: visitRow.matiere_procede,
          budget: visitRow.budget_estime === null ? null : visitRow.budget_estime / 1000,
          timeline: visitRow.delai_projet,
          interest: toInterestLabel(visitRow.niveau_interet),
          prospectStatus: currentProspect?.status ?? "en_cours",
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
