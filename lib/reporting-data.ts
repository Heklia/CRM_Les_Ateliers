import type { OpportunityStage, ProspectStatus, SegmentCode } from "@/lib/types";

export type ReportingProspect = {
  id: string;
  company: string;
  contact: string;
  commercial: string;
  city: string;
  segment: SegmentCode;
  status: ProspectStatus;
  pipelineStage: OpportunityStage;
  estimatedPotential: number;
  createdAt: string;
  updatedAt: string;
  lastVisit: string | null;
  interest: number;
  projectTimeline: string;
  capacityFit: number | null;
  recurrencePotential: number | null;
  needMaturity: number | null;
  nextAction: string;
};

export type ReportingVisit = {
  id: string;
  company: string;
  contact: string;
  commercial: string;
  date: string;
  type: string;
  summary: string;
  interest: number;
  segment: SegmentCode | null;
  createdAt: string;
  updatedAt: string;
};

export type ReportingOpportunity = {
  id: string;
  title: string;
  company: string;
  commercial: string;
  segment: SegmentCode;
  stage: OpportunityStage;
  value: number;
  probability: number;
  createdAt: string;
  updatedAt: string;
};

export type ReportingFollowUp = {
  id: string;
  company: string;
  commercial: string;
  dueAt: string;
  status: string;
  segment: SegmentCode | null;
  createdAt: string;
  updatedAt: string;
};

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
  updated_at: string;
  last_interaction_at: string | null;
  interest_level: number | null;
  project_timeline: string;
  capacity_fit: number | null;
  recurrence_potential: number | null;
  need_maturity: number | null;
};

type ContactRow = {
  id: string;
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

type VisitRow = {
  id: string;
  prospect_id: string;
  contact_id: string | null;
  commercial_id: string;
  visite_date: string;
  type: string;
  resume: string | null;
  niveau_interet: number | null;
  created_at: string;
  updated_at: string;
};

type OpportunityRow = {
  id: string;
  prospect_id: string;
  commercial_id: string;
  segment_id: string;
  title: string;
  stage: string;
  estimated_value: number | null;
  probability: number | null;
  created_at: string;
  updated_at: string;
};

type FollowUpRow = {
  id: string;
  prospect_id: string;
  commercial_id: string;
  title: string;
  due_at: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getReportingData(supabase: any) {
  const [
    { data: prospects },
    { data: contacts },
    { data: users },
    { data: segments },
    { data: visits },
    { data: opportunities },
    { data: followUps }
  ] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, commercial_id, segment_id, company_name, city, status, pipeline_stage, estimated_potential, created_at, updated_at, last_interaction_at, interest_level, project_timeline, capacity_fit, recurrence_potential, need_maturity")
      .order("created_at", { ascending: false }),
    supabase
      .from("contacts")
      .select("id, prospect_id, first_name, last_name, commercial_id, is_primary")
      .order("is_primary", { ascending: false }),
    supabase.from("users").select("id, full_name"),
    supabase.from("segments").select("id, code"),
    supabase
      .from("visites")
      .select("id, prospect_id, contact_id, commercial_id, visite_date, type, resume, niveau_interet, created_at, updated_at")
      .order("visite_date", { ascending: false }),
    supabase
      .from("opportunites")
      .select("id, prospect_id, commercial_id, segment_id, title, stage, estimated_value, probability, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("actions_suivantes")
      .select("id, prospect_id, commercial_id, title, due_at, status, created_at, updated_at")
      .order("due_at", { ascending: true })
  ]);

  const prospectRows = (prospects ?? []) as ProspectRow[];
  const contactRows = (contacts ?? []) as ContactRow[];
  const userRows = (users ?? []) as UserRow[];
  const segmentRows = (segments ?? []) as SegmentRow[];
  const visitRows = (visits ?? []) as VisitRow[];
  const opportunityRows = (opportunities ?? []) as OpportunityRow[];
  const followUpRows = (followUps ?? []) as FollowUpRow[];

  const contactByProspect = new Map(
    contactRows.map((contact) => [
      contact.prospect_id,
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Contact non renseigne"
    ])
  );
  const contactById = new Map(
    contactRows.map((contact) => [
      contact.id,
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Contact non renseigne"
    ])
  );
  const userById = new Map(userRows.map((user) => [user.id, user.full_name]));
  const segmentById = new Map(segmentRows.map((segment) => [segment.id, segment.code]));
  const prospectById = new Map(prospectRows.map((prospect) => [prospect.id, prospect]));
  const firstActionByProspect = new Map<string, string>();

  followUpRows
    .filter((followUp) => followUp.status === "a_faire")
    .forEach((followUp) => {
      if (!firstActionByProspect.has(followUp.prospect_id)) {
        firstActionByProspect.set(followUp.prospect_id, followUp.title);
      }
    });

  const mappedProspects: ReportingProspect[] = prospectRows.map((prospect) => ({
    id: prospect.id,
    company: prospect.company_name,
    contact: contactByProspect.get(prospect.id) ?? "Contact non renseigne",
    commercial: userById.get(prospect.commercial_id) ?? "Commercial",
    city: prospect.city ?? "",
    segment: (segmentById.get(prospect.segment_id) ?? "agencements_decoratifs") as SegmentCode,
    status: prospect.status as ProspectStatus,
    pipelineStage: prospect.pipeline_stage as OpportunityStage,
    estimatedPotential: prospect.estimated_potential ?? 0,
    createdAt: prospect.created_at,
    updatedAt: prospect.updated_at,
    lastVisit: prospect.last_interaction_at,
    interest: prospect.interest_level ?? 0,
    projectTimeline: prospect.project_timeline,
    capacityFit: prospect.capacity_fit,
    recurrencePotential: prospect.recurrence_potential,
    needMaturity: prospect.need_maturity,
    nextAction: firstActionByProspect.get(prospect.id) ?? ""
  }));

  const mappedVisits: ReportingVisit[] = visitRows.map((visit) => {
    const prospect = prospectById.get(visit.prospect_id);

    return {
      id: visit.id,
      company: prospect?.company_name ?? "Prospect",
      contact: visit.contact_id
        ? contactById.get(visit.contact_id) ?? "Contact non renseigne"
        : "Non renseignee",
      commercial: userById.get(visit.commercial_id) ?? "Commercial",
      date: visit.visite_date,
      type: visit.type,
      summary: visit.resume ?? "",
      interest: visit.niveau_interet ?? 0,
      segment: prospect ? ((segmentById.get(prospect.segment_id) ?? null) as SegmentCode | null) : null,
      createdAt: visit.created_at,
      updatedAt: visit.updated_at
    };
  });

  const mappedOpportunities: ReportingOpportunity[] = opportunityRows.map((opportunity) => {
    const prospect = prospectById.get(opportunity.prospect_id);

    return {
      id: opportunity.id,
      title: opportunity.title,
      company: prospect?.company_name ?? "Prospect",
      commercial: userById.get(opportunity.commercial_id) ?? "Commercial",
      segment: (segmentById.get(opportunity.segment_id) ?? "agencements_decoratifs") as SegmentCode,
      stage: opportunity.stage as OpportunityStage,
      value: opportunity.estimated_value ?? 0,
      probability: opportunity.probability ?? 0,
      createdAt: opportunity.created_at,
      updatedAt: opportunity.updated_at
    };
  });

  const mappedFollowUps: ReportingFollowUp[] = followUpRows.map((followUp) => {
    const prospect = prospectById.get(followUp.prospect_id);

    return {
      id: followUp.id,
      company: prospect?.company_name ?? "Prospect",
      commercial: userById.get(followUp.commercial_id) ?? "Commercial",
      dueAt: followUp.due_at,
      status: followUp.status,
      segment: prospect ? ((segmentById.get(prospect.segment_id) ?? null) as SegmentCode | null) : null,
      createdAt: followUp.created_at,
      updatedAt: followUp.updated_at
    };
  });

  return {
    followUps: mappedFollowUps,
    opportunities: mappedOpportunities,
    prospects: mappedProspects,
    visits: mappedVisits
  };
}
