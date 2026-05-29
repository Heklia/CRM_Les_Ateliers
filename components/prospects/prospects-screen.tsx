"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import {
  opportunityStageLabels,
  segmentLabels,
  statusLabels
} from "@/lib/constants";
import { prospects as mockProspects } from "@/lib/mock-data";
import { calculatePriorityScore, getPriorityTone } from "@/lib/priority-score";
import type { OpportunityStage, ProspectStatus, SegmentCode } from "@/lib/types";

export type ProspectListItem = {
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
  const [commercial, setCommercial] = useState("");

  const commercials = useMemo(
    () => Array.from(new Set(prospects.map((prospect) => prospect.commercial))).sort(),
    []
  );

  const filteredProspects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return prospects.filter((prospect) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        prospect.company.toLowerCase().includes(normalizedQuery);
      const matchesSegment = segment === "" || prospect.segment === segment;
      const matchesCommercial =
        commercial === "" || prospect.commercial === commercial;

      return matchesQuery && matchesSegment && matchesCommercial;
    });
  }, [commercial, query, segment]);

  return (
    <main>
      <PageHeader
        title="Prospects"
        description="Liste de travail pour qualifier les comptes cibles, suivre le pipeline et prioriser les visites terrain."
        action={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
            href="/prospects/new"
          >
            <Plus size={16} />
            Ajouter un prospect
          </Link>
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
            <span className="sr-only">Filtrer par commercial</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              onChange={(event) => setCommercial(event.target.value)}
              value={commercial}
            >
              <option value="">Tous les commerciaux</option>
              {commercials.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm text-muted">
          <span>{filteredProspects.length} prospect(s)</span>
          <span>Potentiel visible : {formatCurrency(totalPotential(filteredProspects))}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Entreprise</th>
                <th>Segment</th>
                <th>Ville</th>
                <th>Contact principal</th>
                <th>Statut</th>
                <th>Pipeline</th>
                <th>Score</th>
                <th className="text-right">Potentiel estime</th>
                <th>Derniere visite</th>
              </tr>
            </thead>
            <tbody>
              {filteredProspects.map((prospect) => (
                <tr
                  className="border-b border-border last:border-0 hover:bg-background"
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
                    <StatusPill tone={prospect.status === "client" ? "success" : "neutral"}>
                      {statusLabels[prospect.status]}
                    </StatusPill>
                  </td>
                  <td>
                    <StatusPill tone={prospect.pipelineStage === "devis_a_faire" ? "warning" : "neutral"}>
                      {opportunityStageLabels[prospect.pipelineStage]}
                    </StatusPill>
                  </td>
                  <td>
                    <StatusPill tone={getPriorityTone(getProspectScore(prospect))}>
                      {getProspectScore(prospect)}/100
                    </StatusPill>
                  </td>
                  <td className="text-right font-medium">
                    {formatCurrency(prospect.estimatedPotential)}
                  </td>
                  <td className="text-muted">
                    {prospect.lastVisit ? formatDate(prospect.lastVisit) : "A planifier"}
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

function totalPotential(items: ProspectListItem[]) {
  return items.reduce((sum, prospect) => sum + prospect.estimatedPotential, 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
