"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Pencil, Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { segmentLabels, statusLabels } from "@/lib/constants";
import { exportProspects, exportSegmentSummary } from "@/lib/exporters";
import { prospects as mockProspects } from "@/lib/mock-data";
import { calculatePriorityScore, getPriorityTone } from "@/lib/priority-score";
import type { OpportunityStage, ProspectStatus, SegmentCode } from "@/lib/types";

export type ProspectListItem = {
  id: string;
  company: string;
  contact: string;
  commercial: string;
  assignedUsers: string[];
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

export function ProspectsScreen({
  prospects = mockProspects
}: {
  prospects?: ProspectListItem[];
}) {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("");
  const [assignedUser, setAssignedUser] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<ProspectStatus[]>([
    "en_cours",
    "qualifie",
    "client"
  ]);

  const assignedUsers = useMemo(
    () => Array.from(new Set(prospects.flatMap((prospect) => prospect.assignedUsers))).sort(),
    [prospects]
  );

  const filteredProspects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return prospects.filter((prospect) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        prospect.company.toLowerCase().includes(normalizedQuery);
      const matchesSegment = segment === "" || prospect.segment === segment;
      const matchesAssignedUser =
        assignedUser === "" || prospect.assignedUsers.includes(assignedUser);
      const matchesStatus = selectedStatuses.includes(prospect.status);

      return matchesQuery && matchesSegment && matchesAssignedUser && matchesStatus;
    });
  }, [assignedUser, prospects, query, segment, selectedStatuses]);

  function toggleStatus(status: ProspectStatus) {
    setSelectedStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status]
    );
  }

  return (
    <main>
      <PageHeader
        title="Prospects"
        description="Liste de travail pour qualifier les comptes cibles, suivre le pipeline et prioriser les visites terrain."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-background"
              href="/prospects/import"
            >
              <Upload size={16} />
              Importer
            </Link>
            <Button onClick={() => exportProspects(filteredProspects)} type="button" variant="secondary">
              <Download size={16} />
              Export CSV
            </Button>
            <Button onClick={() => exportSegmentSummary(filteredProspects)} type="button" variant="secondary">
              <Download size={16} />
              Synthese
            </Button>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
              href="/prospects/new"
            >
              <Plus size={16} />
              Ajouter un prospect
            </Link>
          </div>
        }
      />

      <section className="rounded-lg border border-border bg-surface shadow-soft">
        <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <label className="relative block">
            <span className="sr-only">Rechercher par nom d'entreprise</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={16}
            />
            <input
              className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une entreprise"
              value={query}
            />
          </label>

          <label className="block">
            <span className="sr-only">Filtrer par segment de marche</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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

          <label className="block">
            <span className="sr-only">Filtrer par personne affectee</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 text-sm">
          <span className="mr-1 font-medium">Statuts</span>
          {(Object.keys(statusLabels) as ProspectStatus[]).map((status) => (
            <label
              className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-semibold text-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white"
              key={status}
            >
              <input
                checked={selectedStatuses.includes(status)}
                className="sr-only"
                onChange={() => toggleStatus(status)}
                type="checkbox"
              />
              {statusLabels[status]}
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm text-muted">
          <span>{filteredProspects.length} prospect(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Entreprise</th>
                <th>Segment</th>
                <th>Ville</th>
                <th>Contact principal</th>
                <th>Personnes affectees</th>
                <th>Statut</th>
                <th>Score</th>
                <th>Derniere visite</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProspects.map((prospect) => (
                <tr
                  className={`border-b border-border last:border-0 hover:bg-background ${
                    prospect.status === "perdu" ? "bg-slate-50 text-muted opacity-70" : ""
                  }`}
                  key={prospect.id}
                >
                  <td className="px-4 py-3">
                    <Link className="font-semibold hover:text-primary" href={`/prospects/${prospect.id}`}>
                      {prospect.company}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{prospect.commercial}</p>
                  </td>
                  <td>{segmentLabels[prospect.segment]}</td>
                  <td>{prospect.city}</td>
                  <td>{prospect.contact}</td>
                  <td>
                    <AssignedUsers names={prospect.assignedUsers} />
                  </td>
                  <td>
                    <StatusPill tone={prospect.status === "client" ? "success" : "neutral"}>
                      {statusLabels[prospect.status]}
                    </StatusPill>
                  </td>
                  <td>
                    <StatusPill tone={getPriorityTone(getProspectScore(prospect))}>
                      {getProspectScore(prospect)}/100
                    </StatusPill>
                  </td>
                  <td className="text-muted">
                    {prospect.lastVisit ? formatDate(prospect.lastVisit) : "A planifier"}
                  </td>
                  <td className="text-right">
                    <Link
                      aria-label={`Modifier ${prospect.company}`}
                      className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-white text-muted hover:bg-background hover:text-foreground"
                      href={`/prospects/${prospect.id}/edit`}
                    >
                      <Pencil size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProspects.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            Aucun prospect ne correspond aux filtres selectionnes.
          </div>
        ) : null}
      </section>
    </main>
  );
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

function getProspectScore(prospect: ProspectListItem) {
  return calculatePriorityScore({
    interestLevel: prospect.interest,
    estimatedBudget: prospect.estimatedPotential,
    projectTimeline: prospect.projectTimeline,
    capacityFit: prospect.capacityFit,
    recurrencePotential: prospect.recurrencePotential,
    needMaturity: prospect.needMaturity
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
