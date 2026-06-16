import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  daily_task_email_enabled: boolean;
};

type FollowUpRow = {
  id: string;
  prospect_id: string;
  commercial_id: string;
  title: string;
  description: string | null;
  due_at: string;
  status: string;
};

type ActionThreadRow = {
  id: string;
  prospect_id: string;
  owner_user_id: string;
  current_action_type: string;
  current_due_date: string;
  current_comment: string | null;
  current_status: string;
};

type ProspectRow = {
  id: string;
  company_name: string;
};

type ProspectAssignmentRow = {
  prospect_id: string;
  user_id: string;
};

type TaskGroup = {
  overdue: FollowUpRow[];
  today: FollowUpRow[];
  upcoming: FollowUpRow[];
};

const timezone = "Europe/Paris";

export async function GET(request: Request) {
  const unauthorized = authorizeCron(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const now = new Date();

  if (!force && !shouldRunNowInParis(now)) {
    return NextResponse.json({ skipped: true, reason: "outside_paris_0730_weekday" });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquante cote serveur." },
      { status: 500 }
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!resendApiKey || !from) {
    return NextResponse.json(
      { error: "RESEND_API_KEY et EMAIL_FROM sont necessaires pour envoyer les notifications." },
      { status: 500 }
    );
  }

  const todayKey = getParisDateKey(now);
  const next15Key = addDaysToDateKey(todayKey, 15);
  const endDate = dateKeyToUtcEnd(next15Key);
  const [
    { data: users, error: usersError },
    { data: actionThreads, error: actionThreadsError },
    { data: prospects, error: prospectsError },
    { data: prospectAssignments, error: assignmentsError }
  ] = await Promise.all([
    (admin.from("users") as any)
      .select("id, email, full_name, is_active, daily_task_email_enabled")
      .eq("is_active", true)
      .eq("daily_task_email_enabled", true),
    (admin.from("commercial_action_threads") as any)
      .select("id, prospect_id, owner_user_id, current_action_type, current_due_date, current_comment, current_status")
      .eq("current_status", "active")
      .lte("current_due_date", endDate.toISOString())
      .order("current_due_date", { ascending: true }),
    (admin.from("prospects") as any).select("id, company_name"),
    (admin.from("prospect_assignments") as any).select("prospect_id, user_id")
  ]);

  if (usersError || actionThreadsError || prospectsError || assignmentsError) {
    return NextResponse.json(
      {
        error: usersError?.message ?? actionThreadsError?.message ?? prospectsError?.message ?? assignmentsError?.message
      },
      { status: 500 }
    );
  }

  const userRows = (users ?? []) as UserRow[];
  const followUpRows = ((actionThreads ?? []) as ActionThreadRow[]).map((thread) => ({
    id: thread.id,
    prospect_id: thread.prospect_id,
    commercial_id: thread.owner_user_id,
    title: actionTypeLabel(thread.current_action_type),
    description: thread.current_comment,
    due_at: thread.current_due_date,
    status: thread.current_status
  })).filter(
    (task) => getParisDateKey(new Date(task.due_at)) <= next15Key
  );
  const prospectRows = (prospects ?? []) as ProspectRow[];
  const assignmentRows = (prospectAssignments ?? []) as ProspectAssignmentRow[];
  const prospectById = new Map(prospectRows.map((prospect) => [prospect.id, prospect.company_name]));
  const assignedUsersByProspect = new Map<string, string[]>();

  assignmentRows.forEach((assignment) => {
    assignedUsersByProspect.set(assignment.prospect_id, [
      ...(assignedUsersByProspect.get(assignment.prospect_id) ?? []),
      assignment.user_id
    ]);
  });

  const tasksByUser = new Map<string, TaskGroup>();

  followUpRows.forEach((task) => {
    const recipientIds = new Set([
      task.commercial_id,
      ...(assignedUsersByProspect.get(task.prospect_id) ?? [])
    ]);

    recipientIds.forEach((userId) => {
      const group = tasksByUser.get(userId) ?? { overdue: [], today: [], upcoming: [] };
      const dueKey = getParisDateKey(new Date(task.due_at));

      if (dueKey < todayKey) {
        group.overdue.push(task);
      } else if (dueKey === todayKey) {
        group.today.push(task);
      } else {
        group.upcoming.push(task);
      }

      tasksByUser.set(userId, group);
    });
  });

  const baseUrl = getBaseUrl();
  const sendResults = await Promise.all(
    userRows.map(async (user) => {
      const group = tasksByUser.get(user.id) ?? { overdue: [], today: [], upcoming: [] };

      const html = renderEmail({
        baseUrl,
        dateKey: todayKey,
        group,
        prospectById,
        user
      });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: user.email,
          subject: `Vos taches commerciales - ${formatDateLabel(todayKey)}`,
          html,
          text: renderTextEmail({ group, prospectById, user })
        })
      });

      if (!response.ok) {
        return {
          email: user.email,
          error: await response.text()
        };
      }

      return { email: user.email, sent: true };
    })
  );

  return NextResponse.json({
    date: todayKey,
    users: userRows.length,
    sent: sendResults.filter((result) => "sent" in result).length,
    errors: sendResults.filter((result) => "error" in result)
  });
}

function authorizeCron(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET manquant cote serveur." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const isAuthorized =
    authorization === `Bearer ${cronSecret}` || headerSecret === cronSecret;

  return isAuthorized
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function shouldRunNowInParis(value: Date) {
  const parts = getParisParts(value);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
  }).format(value);

  return (
    Number(parts.hour) === 7 &&
    Number(parts.minute) === 30 &&
    !["Sat", "Sun"].includes(weekday)
  );
}

function getParisDateKey(value: Date) {
  const parts = getParisParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getParisParts(value: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(value);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: byType.get("year") ?? "1970",
    month: byType.get("month") ?? "01",
    day: byType.get("day") ?? "01",
    hour: byType.get("hour") ?? "00",
    minute: byType.get("minute") ?? "00"
  };
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function dateKeyToUtcEnd(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

function getBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL ?? "";
  if (!raw) return "";
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

function renderEmail({
  baseUrl,
  dateKey,
  group,
  prospectById,
  user
}: {
  baseUrl: string;
  dateKey: string;
  group: TaskGroup;
  prospectById: Map<string, string>;
  user: UserRow;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">Bonjour ${escapeHtml(user.full_name)},</h1>
      <p style="margin: 0 0 20px;">Voici vos taches commerciales du ${formatDateLabel(dateKey)}.</p>
      ${renderSection("Taches en retard", group.overdue, prospectById, baseUrl)}
      ${renderSection("Taches a realiser aujourd'hui", group.today, prospectById, baseUrl)}
      ${renderSection("Taches prevues sur les 15 prochains jours", group.upcoming, prospectById, baseUrl)}
      ${
        baseUrl
          ? `<p style="margin-top: 24px;"><a href="${baseUrl}/actions-a-realiser" style="color: #2563eb;">Ouvrir la page A faire</a></p>`
          : ""
      }
    </div>
  `;
}

function renderSection(
  title: string,
  tasks: FollowUpRow[],
  prospectById: Map<string, string>,
  baseUrl: string
) {
  if (!tasks.length) {
    return `
      <h2 style="font-size: 16px; margin: 22px 0 8px;">${title}</h2>
      <p style="margin: 0; color: #64748b;">Aucune tache.</p>
    `;
  }

  return `
    <h2 style="font-size: 16px; margin: 22px 0 8px;">${title}</h2>
    <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
      <tbody>
        ${tasks
          .map((task) => renderTaskRow(task, prospectById, baseUrl))
          .join("")}
      </tbody>
    </table>
  `;
}

function renderTaskRow(
  task: FollowUpRow,
  prospectById: Map<string, string>,
  baseUrl: string
) {
  const prospectName = prospectById.get(task.prospect_id) ?? "Prospect";
  const appLink = baseUrl ? `${baseUrl}/actions-a-realiser` : "";

  return `
    <tr>
      <td style="border-top: 1px solid #e5e7eb; padding: 10px 0;">
        <strong>${escapeHtml(task.title)}</strong><br />
        <span style="color: #64748b;">${escapeHtml(prospectName)} - echeance ${formatDateTime(task.due_at)}</span>
        ${task.description ? `<br /><span>${escapeHtml(task.description)}</span>` : ""}
        <br />
        <a href="${createOutlookLink(task, prospectName, appLink)}" style="color: #2563eb;">Creer un evenement Outlook</a>
      </td>
    </tr>
  `;
}

function actionTypeLabel(value: string) {
  const labels: Record<string, string> = {
    appel: "Appel",
    email: "Email",
    visite_terrain: "Visite terrain",
    salon: "Salon",
    devis: "Devis",
    autre: "Autre"
  };

  return labels[value] ?? value;
}

function renderTextEmail({
  group,
  prospectById,
  user
}: {
  group: TaskGroup;
  prospectById: Map<string, string>;
  user: UserRow;
}) {
  return [
    `Bonjour ${user.full_name},`,
    "",
    "Taches en retard:",
    ...renderTextTasks(group.overdue, prospectById),
    "",
    "Taches a realiser aujourd'hui:",
    ...renderTextTasks(group.today, prospectById),
    "",
    "Taches prevues sur les 15 prochains jours:",
    ...renderTextTasks(group.upcoming, prospectById)
  ].join("\n");
}

function renderTextTasks(tasks: FollowUpRow[], prospectById: Map<string, string>) {
  if (!tasks.length) return ["- Aucune tache."];

  return tasks.map(
    (task) =>
      `- ${task.title} / ${prospectById.get(task.prospect_id) ?? "Prospect"} / ${formatDateTime(task.due_at)}`
  );
}

function createOutlookLink(task: FollowUpRow, prospectName: string, appLink: string) {
  const start = new Date(task.due_at);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const body = [task.description, appLink ? `Voir dans le CRM: ${appLink}` : ""]
    .filter(Boolean)
    .join("\n\n");
  const params = new URLSearchParams({
    subject: `${task.title} - ${prospectName}`,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
