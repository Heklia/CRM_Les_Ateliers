"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BadgeEuro,
  CalendarCheck,
  FileText,
  Percent,
  PhoneCall,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
  Wallet
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import type { CurrentProfile } from "@/lib/auth/roles";
import type {
  ReportingCompletedAction,
  ReportingFollowUp,
  ReportingOpportunity,
  ReportingProspect,
  ReportingVisit
} from "@/lib/reporting-data";

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
  completedActions: ReportingCompletedAction[];
  followUps: ReportingFollowUp[];
  opportunities: ReportingOpportunity[];
  profile: CurrentProfile;
  prospects: ReportingProspect[];
  visits: ReportingVisit[];
};

type CommercialMetric = {
  commercialId: string;
  commercial: string;
  assignedProspects: number;
  assignedProspectIds: string[];
  visits: number;
  prospects: number;
  quotes: number;
  quoteAmount: number;
  margin: number;
  marginTotal: number;
  marginQuoteCount: number;
  completedFollowUps: number;
};

export function DashboardScreen({
  completedActions,
  followUps,
  opportunities,
  profile,
  prospects,
  visits
}: DashboardScreenProps) {
  const [commercialId, setCommercialId] = useState("");
  const [period, setPeriod] = useState<(typeof periodOptions)[number]["value"]>("30");
  const [followUpPeriod, setFollowUpPeriod] =
    useState<(typeof followUpPeriodOptions)[number]["value"]>("today");
  const isAdmin = profile.role === "admin";
  const selectedCommercialId = isAdmin ? commercialId : profile.id;

  const commercials = useMemo(() => {
    const byId = new Map<string, string>();
    prospects.forEach((item) => item.commercialId && byId.set(item.commercialId, item.commercial));
    opportunities.forEach((item) => item.commercialId && byId.set(item.commercialId, item.commercial));
    visits.forEach((item) => item.commercialId && byId.set(item.commercialId, item.commercial));
    completedActions.forEach((item) => byId.set(item.commercialId, item.commercial));
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [completedActions, opportunities, prospects, visits]);

  const inPeriod = useMemo(() => createPeriodFilter(period), [period]);
  const matchesCommercial = (value?: string) =>
    selectedCommercialId === "" || value === selectedCommercialId;

  const periodProspects = prospects.filter(
    (item) => matchesCommercial(item.commercialId) && inPeriod(item.createdAt)
  );
  const periodVisits = visits.filter(
    (item) =>
      matchesCommercial(item.commercialId) &&
      item.type === "visite_terrain" &&
      inPeriod(item.date)
  );
  const periodQuotes = opportunities.filter(
    (item) =>
      item.isQuote &&
      matchesCommercial(item.commercialId) &&
      inPeriod(item.quoteDate ?? item.createdAt)
  );
  const periodCompletedActions = completedActions.filter(
    (item) => matchesCommercial(item.commercialId) && inPeriod(item.completedAt)
  );
  const quoteAmount = sum(periodQuotes.map((item) => item.value));
  const quoteMargins = periodQuotes.flatMap((item) =>
    item.margin === null ? [] : [item.margin]
  );
  const quoteMargin = sum(quoteMargins);
  const averageQuoteMargin = quoteMargins.length ? quoteMargin / quoteMargins.length : 0;
  const openFollowUps = followUps.filter(
    (item) => matchesCommercial(item.commercialId) && isOpenFollowUp(item)
  );
  const visibleFollowUps = openFollowUps.filter((item) =>
    isInFollowUpPeriod(item.dueAt, followUpPeriod)
  );

  const commercialMetrics = useMemo(
    () =>
      commercials.map((commercial) =>
        buildCommercialMetric(
          commercial,
          createPeriodFilter(period),
          completedActions,
          opportunities,
          prospects,
          visits
        )
      ),
    [commercials, completedActions, opportunities, period, prospects, visits]
  );
  const displayedCommercialMetrics = commercialId
    ? commercialMetrics.filter((item) => item.commercialId === commercialId)
    : commercialMetrics;

  const acceptedQuotes = opportunities.filter(
    (item) =>
      item.isQuote &&
      item.stage === "accepte" &&
      matchesCommercial(item.commercialId) &&
      inPeriod(item.wonAt ?? item.updatedAt)
  );
  const acceptedQuoteAmount = sum(acceptedQuotes.map((item) => item.value));
  const acceptedMargin = sum(
    acceptedQuotes.flatMap((item) => (item.margin === null ? [] : [item.margin]))
  );
  const transformationRate = periodQuotes.length
    ? periodQuotes.filter((item) => item.stage === "accepte").length / periodQuotes.length
    : 0;
  const newClients = new Set(acceptedQuotes.map((item) => item.prospectId)).size;
  const activeClientThreshold = new Date();
  activeClientThreshold.setMonth(activeClientThreshold.getMonth() - 3);
  const activeClients = new Set(
    opportunities
      .filter(
        (item) =>
          item.isQuote &&
          matchesCommercial(item.commercialId) &&
          new Date(item.quoteDate ?? item.createdAt) >= activeClientThreshold
      )
      .map((item) => item.prospectId)
  ).size;
  const monthlyOrders = groupAcceptedQuotesByMonth(acceptedQuotes);

  return (
    <main>
      <PageHeader
        title={`Dashboard de ${profile.full_name}`}
        description={
          isAdmin
            ? "Suivi des resultats commerciaux et indicateurs de direction."
            : "Vos resultats commerciaux sur la periode selectionnee."
        }
      />

      <FollowUpsSection
        followUpPeriod={followUpPeriod}
        setFollowUpPeriod={setFollowUpPeriod}
        visibleFollowUps={visibleFollowUps}
      />

      <section className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft md:grid-cols-2">
        {isAdmin ? (
          <label className="block text-sm font-medium">
            Commercial
            <select
              className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
              onChange={(event) => setCommercialId(event.target.value)}
              value={commercialId}
            >
              <option value="">Total equipe</option>
              {commercials.map((commercial) => (
                <option key={commercial.id} value={commercial.id}>{commercial.name}</option>
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
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            value={period}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </section>

      <h2 className="mb-3 text-base font-semibold">
        {isAdmin ? "Suivi des commerciaux" : "Mes indicateurs"}
      </h2>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={CalendarCheck} label="Nombre de visites" value={`${periodVisits.length}`} detail="Visites terrain realisees" />
        <StatCard icon={Users} label="Nouveaux prospects" value={`${periodProspects.length}`} detail="Prospects crees" />
        <StatCard icon={FileText} label="Nombre de devis" value={`${periodQuotes.length}`} detail="Devis issus de l'import" />
        <StatCard icon={BadgeEuro} label="Montant des devis" value={formatCurrency(quoteAmount)} detail="Total HT net des devis" />
        <StatCard
          icon={TrendingUp}
          label="Marge / devis"
          value={formatCurrency(averageQuoteMargin)}
          detail={quoteMargins.length ? `Moyenne calculee sur ${quoteMargins.length} devis` : "Debourse non renseigne"}
        />
        <StatCard icon={RefreshCw} label="Relances effectuees" value={`${periodCompletedActions.length}`} detail="Actions de suivi finalisees" />
      </section>

      {isAdmin ? (
        <>
          <CommercialTable metrics={displayedCommercialMetrics} />

          <h2 className="mb-3 mt-8 text-base font-semibold">Tableau de bord administrateur</h2>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={ShoppingCart} label="Commandes HT" value={formatCurrency(acceptedQuoteAmount)} detail="Devis acceptes sur la periode" />
            <StatCard icon={Wallet} label="Marge brute" value={formatCurrency(acceptedMargin)} detail="Marge des devis acceptes" />
            <StatCard icon={Percent} label="Taux de transformation" value={formatRate(transformationRate)} detail="Devis acceptes / devis" />
            <StatCard icon={UserPlus} label="Nouveaux clients" value={`${newClients}`} detail="Clients ayant accepte un devis" />
            <StatCard icon={Activity} label="Clients actifs sur 3 mois" value={`${activeClients}`} detail="Avec demande de devis ou commande" />
          </section>

          <section className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-base font-semibold">Commandes HT / mois</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {monthlyOrders.length ? monthlyOrders.map((item) => (
                <div className="rounded-md border border-border p-4" key={item.month}>
                  <p className="text-sm text-muted">{formatMonth(item.month)}</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(item.amount)}</p>
                  <p className="mt-1 text-xs text-muted">Marge {formatCurrency(item.margin)}</p>
                </div>
              )) : <p className="text-sm text-muted">Aucune commande acceptee sur la periode.</p>}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function FollowUpsSection({
  followUpPeriod,
  setFollowUpPeriod,
  visibleFollowUps
}: {
  followUpPeriod: (typeof followUpPeriodOptions)[number]["value"];
  setFollowUpPeriod: (value: (typeof followUpPeriodOptions)[number]["value"]) => void;
  visibleFollowUps: ReportingFollowUp[];
}) {
  return (
    <section className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Actions a realiser</h2>
        <StatusPill tone={visibleFollowUps.length ? "warning" : "success"}>{visibleFollowUps.length}</StatusPill>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {followUpPeriodOptions.map((option) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-medium ${followUpPeriod === option.value ? "border-primary bg-primary text-white" : "border-border bg-white text-muted"}`}
            key={option.value}
            onClick={() => setFollowUpPeriod(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleFollowUps.length ? visibleFollowUps.map((item) => (
          <article className="flex items-center justify-between gap-3 rounded-md border border-border p-4" key={item.id}>
            <div>
              <h3 className="text-sm font-semibold">{item.company}</h3>
              <p className="mt-1 text-xs text-muted">{item.commercial} - {formatDate(item.dueAt)}</p>
            </div>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white" href={`/actions-a-realiser/${item.id}`}>
              <PhoneCall size={16} />
              Traiter
            </a>
          </article>
        )) : <p className="text-sm text-muted">Aucune action a realiser sur cette periode.</p>}
      </div>
    </section>
  );
}

function CommercialTable({ metrics }: { metrics: CommercialMetric[] }) {
  const totalAssignedProspects = new Set(
    metrics.flatMap((item) => item.assignedProspectIds)
  ).size;
  const totalMargin = sum(metrics.map((item) => item.marginTotal));
  const totalMarginQuoteCount = sum(metrics.map((item) => item.marginQuoteCount));
  const averageTotalMargin = totalMarginQuoteCount
    ? totalMargin / totalMarginQuoteCount
    : 0;
  const total = metrics.reduce<CommercialMetric>((acc, item) => ({
    commercialId: "total",
    commercial: "Total",
    assignedProspects: totalAssignedProspects,
    assignedProspectIds: [],
    visits: acc.visits + item.visits,
    prospects: acc.prospects + item.prospects,
    quotes: acc.quotes + item.quotes,
    quoteAmount: acc.quoteAmount + item.quoteAmount,
    margin: averageTotalMargin,
    marginTotal: totalMargin,
    marginQuoteCount: totalMarginQuoteCount,
    completedFollowUps: acc.completedFollowUps + item.completedFollowUps
  }), { commercialId: "total", commercial: "Total", assignedProspects: totalAssignedProspects, assignedProspectIds: [], visits: 0, prospects: 0, quotes: 0, quoteAmount: 0, margin: averageTotalMargin, marginTotal: totalMargin, marginQuoteCount: totalMarginQuoteCount, completedFollowUps: 0 });

  return (
    <section className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface p-5 shadow-soft">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="text-xs uppercase text-muted"><tr className="border-b border-border"><th className="py-3">Commercial</th><th>Prospects affectes</th><th>Visites</th><th>Nouveaux prospects</th><th>Devis</th><th>Montant devis</th><th>Marge / devis</th><th>Relances</th></tr></thead>
        <tbody>
          {[...metrics, total].map((item) => (
            <tr className={`border-b border-border last:border-0 ${item.commercialId === "total" ? "font-semibold" : ""}`} key={item.commercialId}>
              <td className="py-3">{item.commercial}</td><td>{item.assignedProspects}</td><td>{item.visits}</td><td>{item.prospects}</td><td>{item.quotes}</td><td>{formatCurrency(item.quoteAmount)}</td><td>{formatCurrency(item.margin)}</td><td>{item.completedFollowUps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function buildCommercialMetric(
  commercial: { id: string; name: string },
  inPeriod: (value: string | null) => boolean,
  completedActions: ReportingCompletedAction[],
  opportunities: ReportingOpportunity[],
  prospects: ReportingProspect[],
  visits: ReportingVisit[]
): CommercialMetric {
  const quotes = opportunities.filter((item) => item.commercialId === commercial.id && item.isQuote && inPeriod(item.quoteDate ?? item.createdAt));
  const assignedProspectIds = prospects
    .filter((item) =>
      (item.assignedUserIds ?? [item.commercialId]).includes(commercial.id)
    )
    .map((item) => item.id);
  const quoteMargins = quotes.flatMap((item) =>
    item.margin === null ? [] : [item.margin]
  );
  const marginTotal = sum(quoteMargins);
  return {
    commercialId: commercial.id,
    commercial: commercial.name,
    assignedProspects: assignedProspectIds.length,
    assignedProspectIds,
    visits: visits.filter((item) => item.commercialId === commercial.id && item.type === "visite_terrain" && inPeriod(item.date)).length,
    prospects: prospects.filter((item) => item.commercialId === commercial.id && inPeriod(item.createdAt)).length,
    quotes: quotes.length,
    quoteAmount: sum(quotes.map((item) => item.value)),
    margin: quoteMargins.length ? marginTotal / quoteMargins.length : 0,
    marginTotal,
    marginQuoteCount: quoteMargins.length,
    completedFollowUps: completedActions.filter((item) => item.commercialId === commercial.id && inPeriod(item.completedAt)).length
  };
}

function createPeriodFilter(period: string) {
  if (period === "all") return () => true;
  const start = new Date();
  start.setDate(start.getDate() - Number(period));
  return (value: string | null) => Boolean(value && new Date(value) >= start);
}

function isOpenFollowUp(item: ReportingFollowUp) {
  return item.status !== "terminee" && item.status !== "annulee";
}

function isInFollowUpPeriod(value: string, period: "overdue" | "today" | "week" | "month") {
  const date = new Date(value);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "overdue") return date < start;
  const end = new Date(start);
  if (period === "today") end.setDate(end.getDate() + 1);
  if (period === "week") end.setDate(end.getDate() + 7);
  if (period === "month") end.setMonth(end.getMonth() + 1);
  return date >= start && date < end;
}

function groupAcceptedQuotesByMonth(items: ReportingOpportunity[]) {
  const months = new Map<string, { amount: number; margin: number }>();
  items.forEach((item) => {
    const month = (item.wonAt ?? item.updatedAt).slice(0, 7);
    const current = months.get(month) ?? { amount: 0, margin: 0 };
    current.amount += item.value;
    current.margin += item.margin ?? 0;
    months.set(month, current);
  });
  return Array.from(months, ([month, values]) => ({ month, ...values })).sort((a, b) => b.month.localeCompare(a.month));
}

function sum(values: number[]) { return values.reduce((total, value) => total + value, 0); }
function formatCurrency(value: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value); }
function formatRate(value: number) { return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value); }
function formatDate(value: string) { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)); }
function formatMonth(value: string) { const [year, month] = value.split("-"); return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, 1)); }
