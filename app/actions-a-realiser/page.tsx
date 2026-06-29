import { redirect } from "next/navigation";
import { CommercialActionThreadsScreen, type ActionThreadListItem, type ActionThreadOption } from "@/components/actions-a-realiser/commercial-action-threads-screen";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  company_name?: string;
  city?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_job_title?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  owner_name?: string | null;
};

type ProspectRow = {
  id: string;
  company_name: string;
  city: string | null;
};

type ContactRow = {
  id: string;
  prospect_id: string;
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
  action_thread_id: string;
  completed_at: string;
  action_type: string;
};

export default async function ActionsARealiserPage() {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const [
    threadsResult,
    { data: prospects },
    { data: contacts },
    { data: users },
    { data: events }
  ] = await Promise.all([
    fetchSharedActionThreads(supabase),
    supabase.from("prospects").select("id, company_name, city").order("company_name", { ascending: true }),
    supabase
      .from("contacts")
      .select("id, prospect_id, first_name, last_name, job_title, phone, email")
      .order("last_name", { ascending: true }),
    supabase.from("users").select("id, full_name").order("full_name", { ascending: true }),
    supabase
      .from("commercial_action_events")
      .select("action_thread_id, completed_at, action_type")
      .order("completed_at", { ascending: false })
  ]);

  const threadRows = (threadsResult.data ?? []) as ThreadRow[];
  const prospectRows = (prospects ?? []) as ProspectRow[];
  const contactRows = (contacts ?? []) as ContactRow[];
  const userRows = (users ?? []) as UserRow[];
  const eventRows = (events ?? []) as EventRow[];
  const prospectById = new Map(prospectRows.map((prospect) => [prospect.id, prospect]));
  const contactById = new Map(contactRows.map((contact) => [contact.id, contact]));
  const userById = new Map(userRows.map((user) => [user.id, user.full_name]));
  const lastEventByThread = new Map<string, EventRow>();

  eventRows.forEach((event) => {
    if (!lastEventByThread.has(event.action_thread_id)) {
      lastEventByThread.set(event.action_thread_id, event);
    }
  });

  const items: ActionThreadListItem[] = threadRows.map((thread) => {
    const prospect = prospectById.get(thread.prospect_id);
    const contact = thread.contact_id ? contactById.get(thread.contact_id) : null;
    const lastEvent = lastEventByThread.get(thread.id);
    const sharedContactName = formatSharedContactName(thread);

    return {
      id: thread.id,
      prospectId: thread.prospect_id,
      contactId: thread.contact_id,
      company: thread.company_name ?? prospect?.company_name ?? "Prospect",
      city: thread.city ?? prospect?.city ?? null,
      contactName: sharedContactName ?? (contact ? formatContactName(contact) : "Contact non renseigne"),
      contactPhone: thread.contact_phone ?? contact?.phone ?? null,
      contactEmail: thread.contact_email ?? contact?.email ?? null,
      ownerId: thread.owner_user_id,
      ownerName: thread.owner_name ?? userById.get(thread.owner_user_id) ?? "Commercial",
      currentActionType: thread.current_action_type,
      currentDueDate: thread.current_due_date,
      currentPriority: thread.current_priority,
      prospectStatus: thread.prospect_status,
      currentComment: thread.current_comment,
      lastCompletedActionAt: thread.last_completed_action_at,
      lastAction: lastEvent ? `${lastEvent.action_type} - ${formatDate(lastEvent.completed_at)}` : "Aucune"
    };
  });

  const options: ActionThreadOption = {
    contacts: contactRows.map((contact) => ({
      id: contact.id,
      prospectId: contact.prospect_id,
      label: formatContactName(contact)
    })),
    prospects: prospectRows.map((prospect) => ({
      id: prospect.id,
      label: [prospect.company_name, prospect.city].filter(Boolean).join(" - ")
    })),
    users: userRows.map((user) => ({
      id: user.id,
      label: user.full_name
    }))
  };

  return <CommercialActionThreadsScreen items={items} options={options} profile={profile} />;
}

function formatContactName(contact: ContactRow) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  return [name || "Contact", contact.job_title].filter(Boolean).join(" - ");
}

function formatSharedContactName(thread: ThreadRow) {
  const name = [thread.contact_first_name, thread.contact_last_name].filter(Boolean).join(" ");
  const label = [name, thread.contact_job_title].filter(Boolean).join(" - ");
  return label || null;
}

async function fetchSharedActionThreads(supabase: any) {
  const sharedResult = await supabase
    .from("shared_commercial_action_threads")
    .select("id, prospect_id, contact_id, owner_user_id, current_action_type, current_due_date, current_priority, current_status, prospect_status, current_comment, last_completed_action_at, company_name, city, contact_first_name, contact_last_name, contact_job_title, contact_phone, contact_email, owner_name")
    .eq("current_status", "active")
    .order("current_due_date", { ascending: true });

  if (!sharedResult.error) {
    return { data: sharedResult.data };
  }

  const fallback = await supabase
    .from("commercial_action_threads")
    .select("id, prospect_id, contact_id, owner_user_id, current_action_type, current_due_date, current_priority, current_status, prospect_status, current_comment, last_completed_action_at")
    .eq("current_status", "active")
    .order("current_due_date", { ascending: true });

  return { data: fallback.data };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
