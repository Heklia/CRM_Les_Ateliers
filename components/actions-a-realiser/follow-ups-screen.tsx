"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { segmentLabels } from "@/lib/constants";
import { exportFollowUps } from "@/lib/exporters";
import type { ReportingFollowUp } from "@/lib/reporting-data";
import type { SegmentCode } from "@/lib/types";

const periodOptions = [
  { label: "En retard", value: "overdue" },
  { label: "Aujourd'hui", value: "today" },
  { label: "Cette semaine", value: "week" },
  { label: "Ce mois", value: "month" },
  { label: "Tout", value: "all" }
] as const;

const followUpStatusLabels = {
  a_faire: "A faire",
  en_cours: "En cours",
  en_retard: "En retard",
  terminee: "Finalisee",
  annulee: "Annulee"
} as const;

export function FollowUpsScreen({ followUps }: { followUps: ReportingFollowUp[] }) {
  const [period, setPeriod] = useState<(typeof periodOptions)[number]["value"]>("all");
  const [assignedUser, setAssignedUser] = useState("");
  const [segment, setSegment] = useState("");

  const assignedUsers = useMemo(
    () => Array.from(new Set(followUps.flatMap((followUp) => followUp.assignedUsers))).sort(),
    [followUps]
  );

  const filteredFollowUps = useMemo(() => {
    return followUps.filter((followUp) => {
      const matchesStatus = isOpenFollowUp(followUp);
      const matchesPeriod = period === "all" || isInPeriod(followUp.dueAt, period);
      const matchesAssignedUser =
        assignedUser === "" || followUp.assignedUsers.includes(assignedUser);
      const matchesSegment = segment === "" || followUp.segment === segment;

      return matchesStatus && matchesPeriod && matchesAssignedUser && matchesSegment;
    });
  }, [assignedUser, followUps, period, segment]);

  return (
    <main>
      <PageHeader
        title="Actions a realiser"
        description="Relances, appels, emails, devis et prochaines actions ouvertes."
        action={
          <Button onClick={() => exportFollowUps(filteredFollowUps)} type="button" variant="secondary">
            <Download size={16} />
            Export CSV
          </Button>
        }
      />

      <section className="mb-4 grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft lg:grid-cols-3">
        <label className="block text-sm font-medium">
          Periode
          <select
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            value={period}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Segment
          <select
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setSegment(event.target.value)}
            value={segment}
          >
            <option value="">Tous les segments</option>
            {Object.entries(segmentLabels).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Personne affectee
          <select
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setAssignedUser(event.target.value)}
            value={assignedUser}
          >
            <option value="">Toutes les personnes affectees</option>
            {assignedUsers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-lg border border-border bg-surface shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm text-muted">
          <span>{filteredFollowUps.length} action(s) a realiser</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Entreprise</th>
                <th>Action</th>
                <th>Segment</th>
                <th>Personnes affectees</th>
                <th>Echeance</th>
                <th>Statut</th>
                <th className="text-right">Traiter</th>
              </tr>
            </thead>
            <tbody>
              {filteredFollowUps.map((followUp) => (
                <tr className="border-b border-border last:border-0 hover:bg-background" key={followUp.id}>
                  <td className="px-4 py-3 font-semibold">{followUp.company}</td>
                  <td>
                    <p className="font-medium">{followUp.title}</p>
                    {followUp.description ? (
                      <p className="mt-1 max-w-[260px] truncate text-xs text-muted" title={followUp.description}>
                        {followUp.description}
                      </p>
                    ) : null}
                  </td>
                  <td>
                    {followUp.segment ? (
                      segmentLabels[followUp.segment]
                    ) : (
                      <span className="text-muted">Non renseigne</span>
                    )}
                  </td>
                  <td>
                    <AssignedUsers names={followUp.assignedUsers} />
                  </td>
                  <td className={isOverdue(followUp.dueAt) ? "font-semibold text-amber-700" : "text-muted"}>
                    {formatDate(followUp.dueAt)}
                  </td>
                  <td>
                    <StatusPill tone={getFollowUpTone(followUp)}>
                      {followUpStatusLabels[followUp.status]}
                    </StatusPill>
                  </td>
                  <td className="text-right">
                    <Link
                      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white"
                      href={buildFollowUpHref(followUp)}
                    >
                      <PhoneCall size={16} />
                      Traiter
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredFollowUps.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            Aucune action a realiser ne correspond aux filtres selectionnes.
          </div>
        ) : null}
      </section>
    </main>
  );
}

function buildFollowUpHref(followUp: ReportingFollowUp) {
  const params = new URLSearchParams({
    follow_up_id: followUp.id,
    prospect_id: followUp.prospectId
  });

  if (followUp.opportunityId) {
    params.set("opportunite_id", followUp.opportunityId);
  }

  return `/visites/new?${params.toString()}`;
}

function AssignedUsers({ names }: { names: string[] }) {
  if (!names.length) {
    return <span className="text-muted">Non affecte</span>;
  }

  return (
    <div className="flex max-w-[220px] flex-wrap gap-1">
      {names.map((name) => (
        <span className="rounded-md bg-background px-2 py-1 text-xs font-medium" key={name}>
          {name}
        </span>
      ))}
    </div>
  );
}

function isInPeriod(value: string, period: "overdue" | "today" | "week" | "month") {
  const date = new Date(value);
  const status = getFollowUpStatusFromDate(value);

  if (period === "overdue") {
    return status === "en_retard";
  }

  if (period === "today") {
    return status === "en_cours";
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  if (period === "week") {
    end.setDate(start.getDate() + 7);
  } else {
    end.setMonth(start.getMonth() + 1);
  }

  return date >= start && date < end;
}

function isOverdue(value: string) {
  return getFollowUpStatusFromDate(value) === "en_retard";
}

function isOpenFollowUp(followUp: ReportingFollowUp) {
  return followUp.status !== "terminee" && followUp.status !== "annulee";
}

function getFollowUpTone(followUp: ReportingFollowUp) {
  if (followUp.status === "en_retard") return "warning";
  if (followUp.status === "en_cours") return "success";
  return "neutral";
}

function getFollowUpStatusFromDate(value: string) {
  const dueKey = getDateKey(value);
  const todayKey = getDateKey(new Date().toISOString());

  if (dueKey < todayKey) return "en_retard";
  if (dueKey === todayKey) return "en_cours";
  return "a_faire";
}

function getDateKey(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
