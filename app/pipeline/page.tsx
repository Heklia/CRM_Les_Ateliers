import { redirect } from "next/navigation";
import { PipelineKanban, type PipelineCard } from "@/components/pipeline/pipeline-kanban";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";
import type { OpportunityStage } from "@/lib/types";

type PipelineProspectRow = {
  id: string;
  company_name: string;
  city: string | null;
  pipeline_stage: string;
  estimated_potential: number | null;
  interest_level: number | null;
  priority_score: number | null;
  project_timeline: string | null;
  capacity_fit: number | null;
  recurrence_potential: number | null;
  need_maturity: number | null;
};

type PipelineOpportunityRow = {
  id: string;
  prospect_id: string;
  title: string;
  stage: string;
  estimated_value: number | null;
  probability: number;
  expected_close_date: string | null;
};

export default async function PipelinePage() {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const prospectsQuery = supabase
    .from("prospects")
    .select("id, company_name, city, pipeline_stage, estimated_potential, interest_level, priority_score, project_timeline, capacity_fit, recurrence_potential, need_maturity")
    .order("updated_at", { ascending: false });
  const opportunitiesQuery = supabase
    .from("opportunites")
    .select("id, prospect_id, title, stage, estimated_value, probability, expected_close_date")
    .order("updated_at", { ascending: false });

  const [{ data: prospects }, { data: opportunities }] = await Promise.all([
    scopeByCommercial(prospectsQuery, profile),
    scopeByCommercial(opportunitiesQuery, profile)
  ]);

  const prospectRows = (prospects ?? []) as PipelineProspectRow[];
  const opportunityRows = (opportunities ?? []) as PipelineOpportunityRow[];
  const prospectById = new Map(
    prospectRows.map((prospect) => [prospect.id, prospect])
  );

  const cards: PipelineCard[] = opportunityRows.map((opportunity) => ({
    id: opportunity.id,
    type: "opportunite" as const,
    title: opportunity.title,
    prospectName: prospectById.get(opportunity.prospect_id)?.company_name ?? "Prospect",
    city: prospectById.get(opportunity.prospect_id)?.city ?? null,
    stage: opportunity.stage as OpportunityStage,
    estimatedPotential: opportunity.estimated_value,
    probability: opportunity.probability,
    expectedCloseDate: opportunity.expected_close_date
  }));

  return (
    <main>
      <PageHeader
        title="Pipeline"
        description="Vue Kanban dediee aux opportunites, avec potentiel mensuel et export."
      />

      <PipelineKanban initialCards={cards} />
    </main>
  );
}
