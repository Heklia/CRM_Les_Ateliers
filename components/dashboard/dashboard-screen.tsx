"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  AlertTriangle,
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
import type { CurrentProfile } from "@/lib/auth/roles";
import type { OpportunityStage, SegmentCode } from "@/lib/types";

const periodOptions = [
  { label: "30 derniers jours", value: "30" },
  { label: "7 derniers jours", value: "7" },
  { label: "90 derniers jours", value: "90" },
  { label: "Toutes les periodes", value: "all" }
] as const;

const followUpPeriodOptions = [
  { label: "En retard", value: "overdue" },
  { label: "Aujourd'hui", value: "today" },
  { label: "Cette semaine", value: "week" },
  { label: "Ce mois", value: "month" }
] as const;

type DashboardScreenProps = {
  followUps: ReportingFollowUp[];
  opportunities: ReportingOpportunity[];
  profile: CurrentProfile;
  prospects: ReportingProspect[];
  visits: ReportingVisit[];
};

export function DashboardScreen({
  followUps,
  opportunities,
  profile,
  prospects,
  visits
}: DashboardScreenProps) {
  const [commercial, setCommercial] = useState("");
  const [period, setPeriod] = useState<(typeof periodOptions)[number]["value"]>("30");
  const [followUpPeriod, setFollowUpPeriod] =
    useState<(typeof followUpPeriodOptions)[number]["value"]>("today");
  const canFilterCommercials = profile.role === "admin";

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
    const byCommercial = (value: string) =>
      !canFilterCommercials || commercial === "" || value === commercial;

    return {
      prospects: prospects.filter(
        (prospect) => byCommercial(prospect.commercial) && inPeriod(prospect.createdAt)
      ),
      visits: visits.filter((visit) => byCommercial(visit.commercial) && inPeriod(visit.date)),
      followUps: followUps.filter(
        (followUp) => byCommercial(followUp.commercial) && isOpenFollowUp(followUp)
      ),
      opportunities: opportunities.filter(
        (opportunity) => byCommercial(opportunity.commercial) && inPeriod(opportunity.createdAt)
      )
    };
  }, [canFilterCommercials, commercial, followUps, opportunities, period, prospects, visits]);

  const potentialTotal = filtered.prospects.reduce(
    (sum, prospect) => sum + prospect.estimatedPotential,
    0
  );
  const detectedOpportunities = filtered.opportunities.filter(
    (opportunity) => opportunity.stage !== "prospect_identifie"
  );
  const hotProspects = filtered.prospects.filter((prospect) => prospect.interest >= 4);
  const completedFollowUpsThisWeek = filtered.visits.filter(
    (visit) => isCompletedFollowUpVisit(visit) && isInCurrentWeek(visit.date)
  );
  const completedFollowUpsThisMonth = filtered.visits.filter(
    (visit) => isCompletedFollowUpVisit(visit) && isInCurrentMonth(visit.date)
  );
  const visibleFollowUps = filtered.followUps.filter((followUp) =>
    isInFollowUpPeriod(followUp.dueAt, followUpPeriod)
  );
  const overdueFollowUps = filtered.followUps.filter((followUp) => followUp.status === "en_retard");
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
        title={`Accueil de ${profile.full_name}`}
        description={
          canFilterCommercials
            ? "Vue equipe pour suivre les actions du jour et les indicateurs d'activite."
            : "Vue personnelle pour suivre vos actions du jour et vos indicateurs d'activite."
        }
      />

      <section className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft md:grid-cols-2">
        {canFilterCommercials ? (
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
        ) : (
          <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <p className="font-medium">Vue personnelle</p>
            <p className="mt-1 text-muted">{profile.full_name}</p>
          </div>
        )}

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

      <section className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Actions a realiser aujourd'hui</h2>
          <StatusPill tone={visibleFollowUps.length ? "warning" : "success"}>
            {visibleFollowUps.length}
          </StatusPill>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {followUpPeriodOptions.map((option) => (
            <button
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                followUpPeriod === option.value
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-muted hover:bg-background hover:text-foreground"
              }`}
              key={option.value}
              onClick={() => setFollowUpPeriod(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleFollowUps.length ? (
            visibleFollowUps.map((followUp) => (
              <article
                className="flex items-center justify-between gap-3 rounded-md border border-border p-4"
                key={followUp.id}
              >
                <div>
                  <h3 className="text-sm font-semibold">{followUp.company}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {followUp.commercial} - {formatDate(followUp.dueAt)}
                  </p>
                  {followUp.status === "en_retard" ? (
                    <div className="mt-2">
                      <StatusPill tone="warning">En retard</StatusPill>
                    </div>
                  ) : null}
                </div>
                <a
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white"
                  href={buildFollowUpHref(followUp)}
                >
                  <PhoneCall size={16} />
                  Traiter
                </a>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted">Aucune action a realiser sur cette periode.</p>
          )}
        </div>
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarCheck}
          label="Nombre de visites"
          value={`${filtered.visits.length}`}
          detail="Actions et comptes-rendus saisis sur la periode"
        />
        <StatCard
          icon={Users}
          label="Nouveaux prospects"
          value={`${filtered.prospects.length}`}
          detail="Prospects crees sur la periode"
        />
        <StatCard
          icon={PhoneCall}
          label="Relances semaine"
          value={`${completedFollowUpsThisWeek.length}`}
          detail="Appels, emails et devis realises cette semaine"
        />
        <StatCard
          icon={ListTodo}
          label="Relances mois"
          value={`${completedFollowUpsThisMonth.length}`}
          detail="Appels, emails et devis realises ce mois"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={ListTodo} label="Actions a realiser" value={`${filtered.followUps.length}`} detail="Actions ouvertes" />
        <StatCard icon={AlertTriangle} label="Actions en retard" value={`${overdueFollowUps.length}`} detail="Echeance depassee" />
        <StatCard icon={Target} label="Opportunites detectees" value={`${detectedOpportunities.length}`} detail="Hors simple identification" />
        <StatCard icon={Flame} label="Prospects chauds" value={`${hotProspects.length}`} detail="Niveau d'interet 4 ou 5" />
        <StatCard icon={Target} label="Score priorite moyen" value={`${averagePriorityScore}/100`} detail="Moyenne des prospects filtres" />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <StatCard icon={Wallet} label="CA potentiel total" value={formatCurrency(potentialTotal)} detail="Somme des potentiels prospects" />
        <StatCard icon={TrendingUp} label="Taux devis envoye" value={formatRate(rateForStage(filtered.prospects, "devis_envoye"))} detail="Prospects arrives a cette etape" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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

function isInFollowUpPeriod(value: string, period: "overdue" | "today" | "week" | "month") {
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

function isOpenFollowUp(followUp: ReportingFollowUp) {
  return followUp.status !== "terminee" && followUp.status !== "annulee";
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

function isCompletedFollowUpVisit(visit: ReportingVisit) {
  return ["appel", "email", "devis"].includes(visit.type);
}

function isInCurrentWeek(value: string) {
  const date = new Date(value);
  const now = new Date();
  const start = getStartOfLocalDay(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return date >= start && date < end;
}

function isInCurrentMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return date >= start && date < end;
}

function getStartOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
