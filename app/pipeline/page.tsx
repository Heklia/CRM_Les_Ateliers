import { redirect } from "next/navigation";
import { PipelineKanban, type PipelineCard } from "@/components/pipeline/pipeline-kanban";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";
import { calculatePriorityScore } from "@/lib/priority-score";
import type { OpportunityStage } from "@/lib/types";

export default async function PipelinePage() {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectsQuery = supabase
    .from("prospects")
    .select("id, company_name, city, pipeline_stage, estimated_potential, interest_level, priority_score, project_timeline, capacity_fit, recurrence_potential, need_maturity")
    .order("updated_at", { ascending: false });
  const opportunitiesQuery = supabase
    .from("opportunites")
    .select("id, prospect_id, title, stage, estimated_value")
    .order("updated_at", { ascending: false });

  const [{ data: prospects }, { data: opportunities }] = await Promise.all([
    scopeByCommercial(prospectsQuery, profile),
    scopeByCommercial(opportunitiesQuery, profile)
  ]);

  const prospectById = new Map(
    (prospects ?? []).map((prospect) => [prospect.id, prospect])
  );

  const cards: PipelineCard[] = [
    ...(prospects ?? []).map((prospect) => ({
      id: prospect.id,
      type: "prospect" as const,
      title: prospect.company_name,
      subtitle: "Prospect",
      city: prospect.city,
      stage: prospect.pipeline_stage as OpportunityStage,
      estimatedPotential: prospect.estimated_potential,
      priorityScore: prospect.priority_score ?? calculatePriorityScore({
        interestLevel: prospect.interest_level,
        estimatedBudget: prospect.estimated_potential,
        projectTimeline: prospect.project_timeline,
        capacityFit: prospect.capacity_fit,
        recurrencePotential: prospect.recurrence_potential,
        needMaturity: prospect.need_maturity
      })
    })),
    ...(opportunities ?? []).map((opportunity) => ({
      id: opportunity.id,
      type: "opportunite" as const,
      title: opportunity.title,
      subtitle: prospectById.get(opportunity.prospect_id)?.company_name ?? "Opportunite",
      city: prospectById.get(opportunity.prospect_id)?.city ?? null,
      stage: opportunity.stage as OpportunityStage,
      estimatedPotential: opportunity.estimated_value,
      priorityScore: null
    }))
  ];

  return (
    <main>
      <PageHeader
        title="Pipeline"
        description="Vue Kanban pour suivre les prospects et opportunites, du premier signal jusqu'a la decision."
      />

      <PipelineKanban initialCards={cards} />
    </main>
  );
}
