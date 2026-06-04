"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import {
  segmentLabels
} from "@/lib/constants";
import {
  exportFollowUps,
  exportOpportunities,
  exportProspects,
  exportSegmentSummary,
  exportVisits
} from "@/lib/exporters";
import type {
  ReportingFollowUp,
  ReportingOpportunity,
  ReportingProspect,
  ReportingVisit
} from "@/lib/reporting-data";
import type { SegmentCode } from "@/lib/types";

const periodOptions = [
  { label: "30 derniers jours", value: "30" },
  { label: "7 derniers jours", value: "7" },
  { label: "90 derniers jours", value: "90" },
  { label: "Toutes les periodes", value: "all" }
] as const;

type ExportsScreenProps = {
  followUps: ReportingFollowUp[];
  opportunities: ReportingOpportunity[];
  prospects: ReportingProspect[];
  visits: ReportingVisit[];
};

export function ExportsScreen({
  followUps,
  opportunities,
  prospects,
  visits
}: ExportsScreenProps) {
  const [commercial, setCommercial] = useState("");
  const [segment, setSegment] = useState("");
  const [period, setPeriod] = useState<(typeof periodOptions)[number]["value"]>("30");

  const commercials = useMemo(() => {
    return Array.from(
      new Set([
        ...prospects.flatMap((prospect) => prospect.assignedUsers),
        ...opportunities.flatMap((opportunity) => opportunity.assignedUsers),
        ...visits.flatMap((visit) => visit.assignedUsers)
      ])
    ).sort();
  }, [opportunities, prospects, visits]);

  const filtered = useMemo(() => {
    const inPeriod = createPeriodFilter(period);
    const byCommercial = (values: string[]) => commercial === "" || values.includes(commercial);
    const bySegment = (value: SegmentCode) => segment === "" || value === segment;
    const prospectSegmentByCompany = new Map(
      prospects.map((prospect) => [prospect.company, prospect.segment])
    );

    return {
      prospects: prospects.filter(
        (prospect) =>
          byCommercial(prospect.assignedUsers) &&
          bySegment(prospect.segment) &&
          inPeriod(prospect.createdAt)
      ),
      visits: visits.filter((visit) => {
        const visitSegment = visit.segment ?? prospectSegmentByCompany.get(visit.company);
        return (
          byCommercial(visit.assignedUsers) &&
          (!visitSegment || bySegment(visitSegment)) &&
          inPeriod(visit.date)
        );
      }),
      opportunities: opportunities.filter(
        (opportunity) =>
          byCommercial(opportunity.assignedUsers) &&
          bySegment(opportunity.segment) &&
          inPeriod(opportunity.createdAt)
      ),
      followUps: followUps.filter((followUp) => {
        const followUpSegment = followUp.segment ?? prospectSegmentByCompany.get(followUp.company);
        return (
          byCommercial(followUp.assignedUsers) &&
          (!followUpSegment || bySegment(followUpSegment)) &&
          inPeriod(followUp.dueAt) &&
          followUp.status === "a_faire"
        );
      })
    };
  }, [commercial, followUps, opportunities, period, prospects, segment, visits]);

  const exportCards = [
    {
      count: filtered.prospects.length,
      description: "Entreprises, segments, pipeline, potentiel et score priorite.",
      label: "Liste des prospects",
      onClick: () => exportProspects(filtered.prospects)
    },
    {
      count: filtered.visits.length,
      description: "Actions realisees sur la periode filtree : visites, appels, emails, salons.",
      label: "Actions realisees",
      onClick: () => exportVisits(filtered.visits)
    },
    {
      count: filtered.opportunities.length,
      description: "Opportunites commerciales et potentiel estime.",
      label: "Opportunites",
      onClick: () => exportOpportunities(filtered.opportunities)
    },
    {
      count: filtered.followUps.length,
      description: "Actions ouvertes avec date de relance a venir.",
      label: "Relances a venir",
      onClick: () => exportFollowUps(filtered.followUps)
    },
    {
      count: filtered.prospects.length,
      description: "Synthese du volume et du potentiel par segment.",
      label: "Synthese par segment",
      onClick: () => exportSegmentSummary(filtered.prospects, filtered.opportunities)
    }
  ];

  return (
    <main>
      <PageHeader
        title="Exports"
        description="Telecharger les donnees CSV en respectant les filtres appliques a l'ecran."
      />

      <section className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft lg:grid-cols-3">
        <label className="block text-sm font-medium">
          Personne affectee
          <select
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setCommercial(event.target.value)}
            value={commercial}
          >
            <option value="">Toutes les personnes affectees</option>
            {commercials.map((name) => (
              <option key={name} value={name}>
                {name}
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
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {exportCards.map((item) => (
          <div
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5 shadow-soft"
            key={item.label}
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{item.label}</h2>
                <StatusPill>{item.count}</StatusPill>
              </div>
              <p className="mt-1 text-sm text-muted">{item.description}</p>
            </div>
            <Button aria-label={`Telecharger ${item.label}`} onClick={item.onClick}>
              <Download size={16} />
            </Button>
          </div>
        ))}
      </section>
    </main>
  );
}

function createPeriodFilter(period: string) {
  if (period === "all") {
    return () => true;
  }

  const days = Number(period);
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - days);

  return (value: string | null) => {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    return date >= start && date <= end;
  };
}
