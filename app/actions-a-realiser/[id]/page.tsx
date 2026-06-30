import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CommercialActionThreadDetail } from "@/components/actions-a-realiser/commercial-action-thread-detail";
import { getCurrentProfile } from "@/lib/auth/roles";
import { segmentLabels } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { SegmentCode } from "@/lib/types";

type ThreadRow = {
  id: string;
  prospect_id: string;
  contact_id: string | null;
  owner_user_id: string;
  current_action_type: string;
  current_due_date: string;
  current_priority: string;
  current_status: string;
  prospect_status: string;
  current_comment: string | null;
  last_completed_action_at: string | null;
  closed_at: string | null;
  closed_reason: string | null;
  segment_id?: string;
  company_name?: string;
  sub_segment?: string | null;
  address_line1?: string | null;
  postal_code?: string | null;
  city?: string | null;
  website?: string | null;
  crm_status?: string;
  prospect_notes?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_job_title?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  owner_name?: string | null;
  segment_codes?: string[];
};

type ProspectRow = {
  id: string;
  segment_id: string;
  company_name: string;
  sub_segment: string | null;
  address_line1: string | null;
  postal_code: string | null;
  city: string | null;
  website: string | null;
  status: string;
  notes: string | null;
};

type SegmentRow = {
  id: string;
  code: string;
};

type ProspectSegmentRow = {
  segment_id: string;
};

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
};

type UserRow = {
  id: string;
  full_name: string;
};

type EventRow = {
  id: string;
  completed_at: string;
  action_type: string;
  result: string | null;
  report: string | null;
  prospect_status_after_action: string;
  next_action_type: string | null;
  next_due_date: string | null;
  priority_after_action: string | null;
  created_by_user_id: string;
  created_at: string;
};

export default async function ActionThreadDetailPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const { data: thread } = await fetchSharedActionThread(supabase, params.id);

  if (!thread) {
    notFound();
  }

  const threadRow = thread as ThreadRow;
  const [
    { data: prospect },
    { data: contact },
    { data: owner },
    { data: events },
    { data: users },
    { data: segments },
    { data: prospectSegments }
  ] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, segment_id, company_name, sub_segment, address_line1, postal_code, city, website, status, notes")
      .eq("id", threadRow.prospect_id)
      .single(),
    threadRow.contact_id
      ? supabase
          .from("contacts")
          .select("id, first_name, last_name, job_title, phone, email")
          .eq("id", threadRow.contact_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase.from("users").select("id, full_name").eq("id", threadRow.owner_user_id).single(),
    supabase
      .from("commercial_action_events")
      .select("id, completed_at, action_type, result, report, prospect_status_after_action, next_action_type, next_due_date, priority_after_action, created_by_user_id, created_at")
      .eq("action_thread_id", threadRow.id)
      .order("completed_at", { ascending: false }),
    supabase.from("users").select("id, full_name"),
    supabase.from("segments").select("id, code"),
    supabase
      .from("prospect_segments")
      .select("segment_id")
      .eq("prospect_id", threadRow.prospect_id)
  ]);

  const prospectRow = prospect
    ? (prospect as ProspectRow)
    : mapSharedProspect(threadRow);
  const contactRow = contact
    ? (contact as ContactRow)
    : mapSharedContact(threadRow);

  if (!prospectRow) {
    notFound();
  }

  const userById = new Map(((users ?? []) as UserRow[]).map((user) => [user.id, user.full_name]));
  const segmentRows = (segments ?? []) as SegmentRow[];
  const selectedSegmentIds = new Set(
    ((prospectSegments ?? []) as ProspectSegmentRow[]).map((item) => item.segment_id)
  );
  const prospectSegmentNames = threadRow.segment_codes?.length
    ? threadRow.segment_codes.map(
        (code) => segmentLabels[code as SegmentCode] ?? code
      )
    : segmentRows
        .filter((segment) => selectedSegmentIds.has(segment.id) || (
          selectedSegmentIds.size === 0 && segment.id === prospectRow.segment_id
        ))
        .map((segment) => segmentLabels[segment.code as SegmentCode] ?? segment.code);

  return (
    <main>
      <div className="mb-4">
        <Link className="text-sm font-semibold text-primary hover:underline" href="/actions-a-realiser">
          Retour aux actions a mener
        </Link>
      </div>
      <CommercialActionThreadDetail
        contact={contactRow ? mapContact(contactRow) : null}
        events={((events ?? []) as EventRow[]).map((event) => ({
          id: event.id,
          completedAt: event.completed_at,
          actionType: event.action_type,
          result: event.result,
          report: event.report,
          prospectStatusAfterAction: event.prospect_status_after_action,
          nextActionType: event.next_action_type,
          nextDueDate: event.next_due_date,
          priorityAfterAction: event.priority_after_action,
          createdBy: userById.get(event.created_by_user_id) ?? "Commercial"
        }))}
        ownerName={threadRow.owner_name ?? (owner as UserRow | null)?.full_name ?? "Commercial"}
        profile={profile}
        prospect={mapProspect(prospectRow, prospectSegmentNames)}
        thread={{
          id: threadRow.id,
          ownerId: threadRow.owner_user_id,
          currentActionType: threadRow.current_action_type,
          currentDueDate: threadRow.current_due_date,
          currentPriority: threadRow.current_priority,
          currentStatus: threadRow.current_status,
          prospectStatus: threadRow.prospect_status,
          currentComment: threadRow.current_comment,
          lastCompletedActionAt: threadRow.last_completed_action_at,
          closedAt: threadRow.closed_at,
          closedReason: threadRow.closed_reason
        }}
      />
    </main>
  );
}

function mapProspect(prospect: ProspectRow, segments: string[]) {
  return {
    id: prospect.id,
    companyName: prospect.company_name,
    address: prospect.address_line1,
    postalCode: prospect.postal_code,
    city: prospect.city,
    website: prospect.website,
    status: prospect.status,
    segments,
    activityDetail: prospect.sub_segment,
    notes: prospect.notes
  };
}

function mapContact(contact: ContactRow) {
  return {
    id: contact.id,
    name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Contact",
    jobTitle: contact.job_title,
    phone: contact.phone,
    email: contact.email
  };
}

function mapSharedProspect(thread: ThreadRow): ProspectRow | null {
  if (!thread.company_name || !thread.segment_id || !thread.crm_status) return null;
  return {
    id: thread.prospect_id,
    segment_id: thread.segment_id,
    company_name: thread.company_name,
    sub_segment: thread.sub_segment ?? null,
    address_line1: thread.address_line1 ?? null,
    postal_code: thread.postal_code ?? null,
    city: thread.city ?? null,
    website: thread.website ?? null,
    status: thread.crm_status,
    notes: thread.prospect_notes ?? null
  };
}

function mapSharedContact(thread: ThreadRow): ContactRow | null {
  if (!thread.contact_id) return null;
  return {
    id: thread.contact_id,
    first_name: thread.contact_first_name ?? null,
    last_name: thread.contact_last_name ?? null,
    job_title: thread.contact_job_title ?? null,
    phone: thread.contact_phone ?? null,
    email: thread.contact_email ?? null
  };
}

async function fetchSharedActionThread(supabase: any, threadId: string) {
  const sharedResult = await supabase
    .from("shared_commercial_action_threads")
    .select("id, prospect_id, contact_id, owner_user_id, current_action_type, current_due_date, current_priority, current_status, prospect_status, current_comment, last_completed_action_at, closed_at, closed_reason, segment_id, company_name, sub_segment, address_line1, postal_code, city, website, crm_status, prospect_notes, contact_first_name, contact_last_name, contact_job_title, contact_phone, contact_email, owner_name, segment_codes")
    .eq("id", threadId)
    .single();

  if (!sharedResult.error) return { data: sharedResult.data };

  const fallback = await supabase
    .from("commercial_action_threads")
    .select("id, prospect_id, contact_id, owner_user_id, current_action_type, current_due_date, current_priority, current_status, prospect_status, current_comment, last_completed_action_at, closed_at, closed_reason")
    .eq("id", threadId)
    .single();

  return { data: fallback.data };
}
