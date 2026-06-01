"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  Flame,
  PhoneCall,
  ListTodo,
  Target,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  opportunityStageLabels,
  opportunityStages,
  segmentLabels
} from "@/lib/constants";
import { calculatePriorityScore, getPriorityTone } from "@/lib/priority-score";
import type {
  ReportingFollowUp,
  ReportingOpportunity,
  ReportingProspect,
  ReportingVisit
} from "@/lib/reporting-data";
import type { OpportunityStage, SegmentCode } from "@/lib/types";

const periodOptions = [
  { label: "30 derniers jours", value: "30" },
  { label: "7 derniers jours", value: "7" },
  { label: "90 derniers jours", value: "90" },
  { label: "Toutes les periodes", value: "all" }
] as const;

type DashboardScreenProps = {
  followUps: ReportingFollowUp[];
  opportunities: ReportingOpportunity[];
  prospects: ReportingProspect[];
  visits: ReportingVisit[];
};

export function DashboardScreen({
  followUps,
  opportunities,
  prospects,
  visits
}: DashboardScreenProps) {
  const [commercial, setCommercial] = useState("");
  const [period, setPeriod] = useState<(typeof periodOptions)[number]["value"]>("30");

  const commercials = useMemo(() => {
    return Array.from(
      new Set([
        ...prospects.map((prospect) => prospect.commercial),
        ...opportunities.map((opportunity) => opportunity.commercial)
      ])
    ).sort();
  }, [opportunities, prospects]);

  const filtered = useMemo(() => {
    const inPeriod = createPeriodFilter(period);
    const byCommercial = (value: string) => commercial === "" || value === commercial;

    return {
      prospects: prospects.filter(
        (prospect) => byCommercial(prospect.commercial) && inPeriod(prospect.createdAt)
      ),
      visits: visits.filter((visit) => byCommercial(visit.commercial) && inPeriod(visit.date)),
      followUps: followUps.filter(
        (followUp) => byCommercial(followUp.commercial) && followUp.status === "a_faire"
      ),
      opportunities: opportunities.filter(
        (opportunity) => byCommercial(opportunity.commercial) && inPeriod(opportunity.createdAt)
      )
    };
  }, [commercial, followUps, opportunities, period, prospects, visits]);

  const potentialTotal = filtered.prospects.reduce(
    (sum, prospect) => sum + prospect.estimatedPotential,
    0
  );
  const detectedOpportunities = filtered.opportunities.filter(
    (opportunity) => opportunity.stage !== "prospect_identifie"
  );
  const hotProspects = filtered.prospects.filter((prospect) => prospect.interest >= 4);
  const todaysFollowUps = filtered.followUps.filter((followUp) => isToday(followUp.dueAt));
  const averagePriorityScore = filtered.prospects.length
    ? Math.round(
        filtered.prospects.reduce((sum, prospect) => sum + getProspectScore(prospect), 0) /
          filtered.prospects.length
      )
    : 0;
  const potentialBySegment = getPotentialBySegment(filtered.prospects);
  const bestOpportunities = [...filtered.opportunities].sort((a, b) => b.value - a.value);
  const prospectScoreByCompany = new Map(
    filtered.prospects.map((prospect) => [prospect.company, getProspectScore(prospect)])
  );
  const maxSegmentPotential = Math.max(
    ...potentialBySegment.map((item) => item.value),
    1
  );
  const hasSegmentPotential = potentialBySegment.some((item) => item.value > 0);

  return (
    <main>
      <PageHeader
        title="Dashboard commercial"
        description="Vue de pilotage pour suivre l'activite terrain, le potentiel commercial et la performance du pipeline."
      />

      <section className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft md:grid-cols-2">
        <label className="block text-sm font-medium">
          Commercial
          <select
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Prospects crees" value={`${filtered.prospects.length}`} detail="Nouveaux comptes sur la periode" />
        <StatCard icon={CalendarCheck} label="Visites realisees" value={`${filtered.visits.length}`} detail="Comptes-rendus saisis" />
        <StatCard icon={ListTodo} label="Relances a faire" value={`${filtered.followUps.length}`} detail="Actions ouvertes" />
        <StatCard icon={Target} label="Opportunites detectees" value={`${detectedOpportunities.length}`} detail="Hors simple identification" />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="CA potentiel total" value={formatCurrency(potentialTotal)} detail="Somme des potentiels prospects" />
        <StatCard icon={Flame} label="Prospects chauds" value={`${hotProspects.length}`} detail="Niveau d'interet 4 ou 5" />
        <StatCard icon={Target} label="Score priorite moyen" value={`${averagePriorityScore}/100`} detail="Moyenne des prospects filtres" />
        <StatCard icon={TrendingUp} label="Taux devis envoye" value={formatRate(rateForStage(filtered.prospects, "devis_envoye"))} detail="Prospects arrives a cette etape" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Relances du jour</h2>
            <StatusPill tone={todaysFollowUps.length ? "warning" : "success"}>
              {todaysFollowUps.length}
            </StatusPill>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {todaysFollowUps.length ? (
              todaysFollowUps.map((followUp) => (
                <article
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-4"
                  key={followUp.id}
                >
                  <div>
                    <h3 className="text-sm font-semibold">{followUp.company}</h3>
                    <p className="mt-1 text-xs text-muted">{followUp.commercial}</p>
                  </div>
                  <a
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white"
                    href="/visites/new"
                  >
                    <PhoneCall size={16} />
                    Traiter
                  </a>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted">Aucune relance prevue aujourd'hui.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-semibold">CA potentiel par segment</h2>
          <div className="mt-5 space-y-4">
            {hasSegmentPotential ? (
              potentialBySegment.map((item) => (
                <div key={item.segment}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{segmentLabels[item.segment]}</span>
                    <span className="text-muted">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-background">
                    <div
                      className="h-3 rounded-full bg-primary"
                      style={{ width: `${Math.max((item.value / maxSegmentPotential) * 100, 4)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Aucune donnee disponible.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-semibold">Taux de transformation par etape</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr className="border-b border-border">
                  <th className="py-3">Etape</th>
                  <th>Prospects</th>
                  <th>Taux</th>
                </tr>
              </thead>
              <tbody>
                {opportunityStages.map((stage) => {
                  const count = filtered.prospects.filter(
                    (prospect) => prospect.pipelineStage === stage
                  ).length;

                  return (
                    <tr className="border-b border-border last:border-0" key={stage}>
                      <td className="py-3 font-medium">{opportunityStageLabels[stage]}</td>
                      <td>{count}</td>
                      <td>{formatRate(filtered.prospects.length ? count / filtered.prospects.length : 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-base font-semibold">Meilleures opportunites</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="py-3">Opportunite</th>
                <th>Entreprise</th>
                <th>Segment</th>
                <th>Etape</th>
                <th>Score</th>
                <th className="text-right">Potentiel</th>
              </tr>
            </thead>
            <tbody>
              {bestOpportunities.length ? (
                bestOpportunities.map((opportunity) => (
                  <tr className="border-b border-border last:border-0" key={opportunity.id}>
                    <td className="py-3 font-medium">{opportunity.title}</td>
                    <td>{opportunity.company}</td>
                    <td>{segmentLabels[opportunity.segment]}</td>
                    <td><StatusPill>{opportunityStageLabels[opportunity.stage]}</StatusPill></td>
                    <td>
                      <StatusPill tone={getPriorityTone(prospectScoreByCompany.get(opportunity.company) ?? 0)}>
                        {prospectScoreByCompany.get(opportunity.company) ?? 0}/100
                      </StatusPill>
                    </td>
                    <td className="text-right font-semibold">{formatCurrency(opportunity.value)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-6 text-center text-muted" colSpan={6}>
                    Aucune opportunite disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

function isToday(value: string) {
  const date = new Date(value);
  return date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function getPotentialBySegment(items: ReportingProspect[]) {
  return (Object.keys(segmentLabels) as SegmentCode[]).map((segment) => ({
    segment,
    value: items
      .filter((prospect) => prospect.segment === segment)
      .reduce((sum, prospect) => sum + prospect.estimatedPotential, 0)
  }));
}

function getProspectScore(prospect: ReportingProspect) {
  return calculatePriorityScore({
    interestLevel: prospect.interest,
    estimatedBudget: prospect.estimatedPotential,
    projectTimeline: prospect.projectTimeline,
    capacityFit: prospect.capacityFit,
    recurrencePotential: prospect.recurrencePotential,
    needMaturity: prospect.needMaturity
  });
}

function rateForStage(items: ReportingProspect[], stage: OpportunityStage) {
  if (items.length === 0) {
    return 0;
  }

  return items.filter((prospect) => prospect.pipelineStage === stage).length / items.length;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function formatRate(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    style: "percent"
  }).format(value);
}
