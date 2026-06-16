import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CommercialActionThreadDetail } from "@/components/actions-a-realiser/commercial-action-thread-detail";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

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
};

type ProspectRow = {
  id: string;
  company_name: string;
  city: string | null;
  website: string | null;
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

  const { data: thread } = await supabase
    .from("commercial_action_threads")
    .select("id, prospect_id, contact_id, owner_user_id, current_action_type, current_due_date, current_priority, current_status, prospect_status, current_comment, last_completed_action_at, closed_at, closed_reason")
    .eq("id", params.id)
    .single();

  if (!thread) {
    notFound();
  }

  const threadRow = thread as ThreadRow;
  const [
    { data: prospect },
    { data: contact },
    { data: owner },
    { data: events },
    { data: users }
  ] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, company_name, city, website")
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
    supabase.from("users").select("id, full_name")
  ]);

  const userById = new Map(((users ?? []) as UserRow[]).map((user) => [user.id, user.full_name]));

  return (
    <main>
      <div className="mb-4">
        <Link className="text-sm font-semibold text-primary hover:underline" href="/actions-a-realiser">
          Retour aux actions a mener
        </Link>
      </div>
      <CommercialActionThreadDetail
        contact={contact ? mapContact(contact as ContactRow) : null}
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
        ownerName={(owner as UserRow | null)?.full_name ?? "Commercial"}
        profile={profile}
        prospect={mapProspect(prospect as ProspectRow)}
        thread={{
          id: threadRow.id,
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

function mapProspect(prospect: ProspectRow) {
  return {
    id: prospect.id,
    companyName: prospect.company_name,
    city: prospect.city,
    website: prospect.website
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
