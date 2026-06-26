import { redirect } from "next/navigation";
import { ProspectsScreen, type ProspectListItem } from "@/components/prospects/prospects-screen";
import { canModifyData, getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";
import { toOpportunityStage } from "@/lib/pipeline-stages";
import type { ProspectCategory, ProspectStatus, SegmentCode } from "@/lib/types";

type ProspectRow = {
  id: string;
  commercial_id: string;
  segment_id: string;
  company_name: string;
  city: string | null;
  status: string;
  category: string;
  pipeline_stage: string;
  estimated_potential: number | null;
  created_at: string;
  updated_at: string;
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

type ProspectAssignmentRow = {
  prospect_id: string;
  user_id: string;
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

  const prospectResult = await fetchProspects(supabase, profile);

  const [{ data: contacts }, { data: users }, { data: segments }, { data: assignments }] =
    await Promise.all([
      scopeByCommercial(
        supabase
          .from("contacts")
          .select("prospect_id, first_name, last_name, commercial_id, is_primary")
          .order("is_primary", { ascending: false }),
        profile
      ),
      supabase.from("users").select("id, full_name"),
      supabase.from("segments").select("id, code"),
      supabase.from("prospect_assignments").select("prospect_id, user_id")
    ]);

  const prospectRows = (prospectResult.data ?? []) as ProspectRow[];
  const contactRows = (contacts ?? []) as ContactRow[];
  const userRows = (users ?? []) as UserRow[];
  const segmentRows = (segments ?? []) as SegmentRow[];
  const assignmentRows = (assignments ?? []) as ProspectAssignmentRow[];

  const contactByProspect = new Map(
    contactRows.map((contact) => [
      contact.prospect_id,
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Contact non renseigne"
    ])
  );
  const userById = new Map(userRows.map((user) => [user.id, user.full_name]));
  const segmentById = new Map(segmentRows.map((segment) => [segment.id, segment.code]));
  const assignedUsersByProspect = new Map<string, string[]>();

  assignmentRows.forEach((assignment) => {
    const name = userById.get(assignment.user_id);
    if (!name) return;
    assignedUsersByProspect.set(assignment.prospect_id, [
      ...(assignedUsersByProspect.get(assignment.prospect_id) ?? []),
      name
    ]);
  });

  const items: ProspectListItem[] = prospectRows.map((prospect) => ({
    id: prospect.id,
    company: prospect.company_name,
    contact: contactByProspect.get(prospect.id) ?? "Contact non renseigne",
    commercial: userById.get(prospect.commercial_id) ?? "Commercial",
    assignedUsers: assignedUsersByProspect.get(prospect.id) ?? [userById.get(prospect.commercial_id) ?? "Commercial"],
    city: prospect.city ?? "",
    segment: (segmentById.get(prospect.segment_id) ?? "autres_agencements") as SegmentCode,
    status: prospect.status as ProspectStatus,
    category: (prospect.category ?? "standard") as ProspectCategory,
    pipelineStage: toOpportunityStage(prospect.pipeline_stage),
    estimatedPotential: prospect.estimated_potential ?? 0,
    createdAt: prospect.created_at,
    updatedAt: prospect.updated_at,
    lastVisit: prospect.last_interaction_at,
    interest: prospect.interest_level ?? 0,
    projectTimeline: prospect.project_timeline,
    capacityFit: prospect.capacity_fit,
    recurrencePotential: prospect.recurrence_potential,
    needMaturity: prospect.need_maturity,
    nextAction: ""
  }));

  return (
    <ProspectsScreen
      canModify={canModifyData(profile) && prospectResult.hasCategoryColumn}
      categoryAvailable={prospectResult.hasCategoryColumn}
      prospects={items}
    />
  );
}

async function fetchProspects(
  supabase: ReturnType<typeof createClient>,
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>
) {
  const selectWithCategory =
    "id, commercial_id, segment_id, company_name, city, status, category, pipeline_stage, estimated_potential, created_at, updated_at, last_interaction_at, interest_level, project_timeline, capacity_fit, recurrence_potential, need_maturity";
  const selectWithoutCategory =
    "id, commercial_id, segment_id, company_name, city, status, pipeline_stage, estimated_potential, created_at, updated_at, last_interaction_at, interest_level, project_timeline, capacity_fit, recurrence_potential, need_maturity";

  const queryWithCategory = supabase
    .from("prospects")
    .select(selectWithCategory)
    .order("updated_at", { ascending: false });
  const result = await scopeByCommercial(queryWithCategory, profile);

  if (!isMissingCategoryError(result.error)) {
    return { data: result.data as ProspectRow[] | null, hasCategoryColumn: true };
  }

  const queryWithoutCategory = supabase
    .from("prospects")
    .select(selectWithoutCategory)
    .order("updated_at", { ascending: false });
  const fallback = await scopeByCommercial(queryWithoutCategory, profile);

  return {
    data: ((fallback.data ?? []) as Omit<ProspectRow, "category">[]).map((prospect) => ({
      ...prospect,
      category: "standard"
    })),
    hasCategoryColumn: false
  };
}

function isMissingCategoryError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";

  return code === "42703" || message.includes("category");
}
