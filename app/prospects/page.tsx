import { redirect } from "next/navigation";
import { ProspectsScreen, type ProspectListItem } from "@/components/prospects/prospects-screen";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";
import type { OpportunityStage, ProspectStatus, SegmentCode } from "@/lib/types";

type ProspectRow = {
  id: string;
  commercial_id: string;
  segment_id: string;
  company_name: string;
  city: string | null;
  status: string;
  pipeline_stage: string;
  estimated_potential: number | null;
  created_at: string;
  last_interaction_at: string | null;
  interest_level: number | null;
  project_timeline: string;
  capacity_fit: number | null;
  recurrence_potential: number | null;
  need_maturity: number | null;
};

type ContactRow = {
  prospect_id: string;
  first_name: string | null;
  last_name: string | null;
};

type UserRow = {
  id: string;
  full_name: string;
};

type SegmentRow = {
  id: string;
  code: string;
};

export default async function ProspectsPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectsQuery = supabase
    .from("prospects")
    .select("id, commercial_id, segment_id, company_name, city, status, pipeline_stage, estimated_potential, created_at, last_interaction_at, interest_level, project_timeline, capacity_fit, recurrence_potential, need_maturity")
    .order("updated_at", { ascending: false });

  const [{ data: prospects }, { data: contacts }, { data: users }, { data: segments }] =
    await Promise.all([
      scopeByCommercial(prospectsQuery, profile),
      scopeByCommercial(
        supabase
          .from("contacts")
          .select("prospect_id, first_name, last_name, commercial_id, is_primary")
          .order("is_primary", { ascending: false }),
        profile
      ),
      supabase.from("users").select("id, full_name"),
      supabase.from("segments").select("id, code")
    ]);

  const prospectRows = (prospects ?? []) as ProspectRow[];
  const contactRows = (contacts ?? []) as ContactRow[];
  const userRows = (users ?? []) as UserRow[];
  const segmentRows = (segments ?? []) as SegmentRow[];

  const contactByProspect = new Map(
    contactRows.map((contact) => [
      contact.prospect_id,
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Contact non renseigne"
    ])
  );
  const userById = new Map(userRows.map((user) => [user.id, user.full_name]));
  const segmentById = new Map(segmentRows.map((segment) => [segment.id, segment.code]));

  const items: ProspectListItem[] = prospectRows.map((prospect) => ({
    id: prospect.id,
    company: prospect.company_name,
    contact: contactByProspect.get(prospect.id) ?? "Contact non renseigne",
    commercial: userById.get(prospect.commercial_id) ?? "Commercial",
    city: prospect.city ?? "",
    segment: (segmentById.get(prospect.segment_id) ?? "autres_agencements") as SegmentCode,
    status: prospect.status as ProspectStatus,
    pipelineStage: prospect.pipeline_stage as OpportunityStage,
    estimatedPotential: prospect.estimated_potential ?? 0,
    createdAt: prospect.created_at,
    lastVisit: prospect.last_interaction_at,
    interest: prospect.interest_level ?? 0,
    projectTimeline: prospect.project_timeline,
    capacityFit: prospect.capacity_fit,
    recurrencePotential: prospect.recurrence_potential,
    needMaturity: prospect.need_maturity,
    nextAction: ""
  }));

  return <ProspectsScreen prospects={items} />;
}
