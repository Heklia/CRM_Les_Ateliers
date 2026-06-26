import { redirect } from "next/navigation";
import { AdminAssignmentsScreen } from "@/components/admin/admin-assignments-screen";
import { AdminUsersScreen } from "@/components/admin/admin-users-screen";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  phone: string | null;
  representative_code: string | null;
  is_active: boolean;
  daily_task_email_enabled: boolean;
};

type ProspectRow = {
  id: string;
  company_name: string;
  city: string | null;
  commercial_id: string;
};

type VisitRow = {
  id: string;
  prospect_id: string;
  type: string;
  resume: string;
  visite_date: string;
};

type ProspectAssignmentRow = {
  prospect_id: string;
  user_id: string;
};

type VisitAssignmentRow = {
  visite_id: string;
  user_id: string;
};

export default async function AdminPage() {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const [
    usersResult,
    { data: prospects },
    { data: visits },
    { data: prospectAssignments },
    { data: visitAssignments }
  ] = await Promise.all([
    fetchUsers(supabase),
    supabase
      .from("prospects")
      .select("id, company_name, city, commercial_id")
      .order("company_name", { ascending: true }),
    supabase
      .from("visites")
      .select("id, prospect_id, type, resume, visite_date")
      .order("visite_date", { ascending: false })
      .limit(100),
    supabase.from("prospect_assignments").select("prospect_id, user_id"),
    supabase.from("visite_assignments").select("visite_id, user_id")
  ]);

  const items = ((usersResult.data ?? []) as UserRow[]).map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    phone: user.phone,
    representativeCode: user.representative_code,
    isActive: user.is_active,
    dailyTaskEmailEnabled: user.daily_task_email_enabled ?? true
  }));
  const userById = new Map(items.map((user) => [user.id, user.fullName]));
  const prospectRows = (prospects ?? []) as ProspectRow[];
  const prospectById = new Map(prospectRows.map((prospect) => [prospect.id, prospect.company_name]));
  const prospectAssignmentMap = groupAssignments(
    (prospectAssignments ?? []) as ProspectAssignmentRow[],
    "prospect_id"
  );
  const visitAssignmentMap = groupAssignments((visitAssignments ?? []) as VisitAssignmentRow[], "visite_id");

  const prospectItems = prospectRows.map((prospect) => ({
    id: prospect.id,
    label: prospect.company_name,
    detail: [prospect.city, `Responsable principal : ${userById.get(prospect.commercial_id) ?? "Non renseigne"}`]
      .filter(Boolean)
      .join(" - "),
    assignedUserIds: prospectAssignmentMap.get(prospect.id) ?? [prospect.commercial_id]
  }));

  const visitItems = ((visits ?? []) as VisitRow[]).map((visit) => ({
    id: visit.id,
    label: `${prospectById.get(visit.prospect_id) ?? "Prospect"} - ${visit.type}`,
    detail: `${formatDate(visit.visite_date)} - ${visit.resume}`,
    assignedUserIds: visitAssignmentMap.get(visit.id) ?? []
  }));

  return (
    <main>
      <PageHeader
        title="Administration"
        description="Gestion des utilisateurs, roles, reinitialisations et affectations commerciales."
      />
      <div className="grid gap-6">
        <AdminUsersScreen users={items} />
        <AdminAssignmentsScreen prospects={prospectItems} users={items} visits={visitItems} />
      </div>
    </main>
  );
}

async function fetchUsers(supabase: any) {
  const withPreference = await supabase
    .from("users")
    .select("id, email, full_name, role, phone, representative_code, is_active, daily_task_email_enabled")
    .order("full_name", { ascending: true });

  if (!isMissingUserOptionalColumnError(withPreference.error)) {
    return { data: withPreference.data as UserRow[] | null };
  }

  const withRepresentative = await supabase
    .from("users")
    .select("id, email, full_name, role, phone, representative_code, is_active")
    .order("full_name", { ascending: true });

  if (!isMissingUserOptionalColumnError(withRepresentative.error)) {
    return {
      data: ((withRepresentative.data ?? []) as Omit<UserRow, "daily_task_email_enabled">[]).map((user) => ({
        ...user,
        daily_task_email_enabled: true
      }))
    };
  }

  const fallback = await supabase
    .from("users")
    .select("id, email, full_name, role, phone, is_active")
    .order("full_name", { ascending: true });

  return {
    data: ((fallback.data ?? []) as Omit<UserRow, "daily_task_email_enabled" | "representative_code">[]).map((user) => ({
      ...user,
      representative_code: null,
      daily_task_email_enabled: true
    }))
  };
}

function isMissingUserOptionalColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";
  return code === "42703" || message.includes("daily_task_email_enabled") || message.includes("representative_code");
}

function groupAssignments<T extends { user_id: string }>(
  rows: T[],
  resourceKey: keyof T
) {
  const grouped = new Map<string, string[]>();

  rows.forEach((row) => {
    const resourceId = String(row[resourceKey]);
    grouped.set(resourceId, [...(grouped.get(resourceId) ?? []), row.user_id]);
  });

  return grouped;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
