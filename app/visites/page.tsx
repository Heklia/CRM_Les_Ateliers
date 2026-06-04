import { redirect } from "next/navigation";
import { ActionsScreen, type ActionListItem } from "@/components/visites/actions-screen";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";
import type { SegmentCode } from "@/lib/types";

type VisitRow = {
  id: string;
  prospect_id: string;
  contact_id: string | null;
  commercial_id: string;
  visite_date: string;
  type: string;
  resume: string;
  niveau_interet: number | null;
  created_at: string;
  updated_at: string;
};

type ProspectRow = {
  id: string;
  company_name: string;
  commercial_id: string;
  segment_id: string;
};

type ContactRow = {
  id: string;
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

type VisitAssignmentRow = {
  visite_id: string;
  user_id: string;
};

export default async function VisitesPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const visitsQuery = supabase
    .from("visites")
    .select("id, prospect_id, contact_id, commercial_id, visite_date, type, resume, niveau_interet, created_at, updated_at")
    .order("visite_date", { ascending: false });

  const [{ data: visits }, { data: prospects }, { data: contacts }, { data: users }, { data: segments }, { data: assignments }] =
    await Promise.all([
      scopeByCommercial(visitsQuery, profile),
      scopeByCommercial(
        supabase.from("prospects").select("id, company_name, commercial_id, segment_id"),
        profile
      ),
      scopeByCommercial(
        supabase.from("contacts").select("id, first_name, last_name, commercial_id"),
        profile
      ),
      supabase.from("users").select("id, full_name"),
      supabase.from("segments").select("id, code"),
      supabase.from("visite_assignments").select("visite_id, user_id")
    ]);

  const visitRows = (visits ?? []) as VisitRow[];
  const prospectRows = (prospects ?? []) as ProspectRow[];
  const contactRows = (contacts ?? []) as ContactRow[];
  const userRows = (users ?? []) as UserRow[];
  const segmentRows = (segments ?? []) as SegmentRow[];
  const assignmentRows = (assignments ?? []) as VisitAssignmentRow[];

  const prospectById = new Map(prospectRows.map((prospect) => [prospect.id, prospect]));
  const contactById = new Map(
    contactRows.map((contact) => [
      contact.id,
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Personne non renseignee"
    ])
  );
  const userById = new Map(userRows.map((user) => [user.id, user.full_name]));
  const segmentById = new Map(segmentRows.map((segment) => [segment.id, segment.code]));
  const assignedUsersByVisit = new Map<string, string[]>();

  assignmentRows.forEach((assignment) => {
    const name = userById.get(assignment.user_id);
    if (!name) return;
    assignedUsersByVisit.set(assignment.visite_id, [
      ...(assignedUsersByVisit.get(assignment.visite_id) ?? []),
      name
    ]);
  });

  const actions: ActionListItem[] = visitRows.map((visit) => {
    const prospect = prospectById.get(visit.prospect_id);

    return {
      id: visit.id,
      prospect: prospect?.company_name ?? "Prospect",
      contact: visit.contact_id ? contactById.get(visit.contact_id) ?? "Non renseignee" : "Non renseignee",
      commercial: userById.get(visit.commercial_id) ?? "Commercial",
      assignedUsers: assignedUsersByVisit.get(visit.id) ?? [userById.get(visit.commercial_id) ?? "Commercial"],
      date: visit.visite_date,
      type: visit.type,
      summary: visit.resume,
      interest: visit.niveau_interet ?? 0,
      createdAt: visit.created_at,
      updatedAt: visit.updated_at,
      segment: prospect ? ((segmentById.get(prospect.segment_id) ?? null) as SegmentCode | null) : null
    };
  });

  return <ActionsScreen actions={actions} />;
}
