"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, Save, Trash2 } from "lucide-react";
import {
  deleteOpportunity,
  updateOpportunityDetails,
  updateOpportunityStage
} from "@/app/prospects/[id]/opportunities/actions";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { opportunityStageLabels, opportunityStages } from "@/lib/constants";
import type { OpportunityStage } from "@/lib/types";

type OpportunityItem = {
  id: string;
  prospectId: string;
  title: string;
  description: string | null;
  stage: OpportunityStage;
  estimatedValue: number | null;
  probability: number;
  expectedCloseDate: string | null;
  updatedAt: string;
};

const initialState: { error?: string; success?: string } = {};

export function ProspectOpportunitiesPanel({
  opportunities,
  prospectId
}: {
  opportunities: OpportunityItem[];
  prospectId: string;
}) {
  const [state, formAction] = useFormState(updateOpportunityStage, initialState);
  const [detailsState, detailsAction] = useFormState(updateOpportunityDetails, initialState);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-soft lg:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Opportunites du prospect</h2>
          <p className="mt-1 text-sm text-muted">
            Suivez les affaires detectees et reprenez-les directement dans une action.
          </p>
        </div>
      </div>

      {state.error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}
      {detailsState.error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {detailsState.error}
        </p>
      ) : null}
      {detailsState.success ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {detailsState.success}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3">
        {opportunities.length ? (
          opportunities.map((opportunity) => (
            <article className="rounded-md border border-border p-4" key={opportunity.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-semibold">{opportunity.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <StatusPill>{opportunityStageLabels[opportunity.stage]}</StatusPill>
                    <span>{formatCurrency(opportunity.estimatedValue)}</span>
                    <span>{opportunity.probability}% interet</span>
                    <span>{opportunity.expectedCloseDate ? formatDate(opportunity.expectedCloseDate) : "Date projet non renseignee"}</span>
                    <span>Modifiee le {formatDate(opportunity.updatedAt)}</span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-background"
                    href={`/visites/new?prospect_id=${prospectId}&opportunite_id=${opportunity.id}`}
                  >
                    Reprendre en action
                    <ArrowRight size={16} />
                  </Link>
                  <form action={deleteOpportunity}>
                    <input name="prospect_id" type="hidden" value={prospectId} />
                    <input name="opportunity_id" type="hidden" value={opportunity.id} />
                    <Button className="w-full" type="submit" variant="secondary">
                      <Trash2 size={16} />
                      Supprimer
                    </Button>
                  </form>
                </div>
              </div>

              <form action={detailsAction} className="mt-4 grid gap-3 lg:grid-cols-4">
                <input name="prospect_id" type="hidden" value={prospectId} />
                <input name="opportunity_id" type="hidden" value={opportunity.id} />
                <label className="block text-sm font-medium lg:col-span-2">
                  Nom de l'opportunite
                  <input
                    className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    defaultValue={opportunity.title}
                    name="title"
                    required
                  />
                </label>
                <label className="block text-sm font-medium">
                  kEUR estime
                  <input
                    className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    defaultValue={opportunity.estimatedValue === null ? "" : opportunity.estimatedValue / 1000}
                    min="0"
                    name="estimated_value"
                    step="1"
                    type="number"
                  />
                </label>
                <label className="block text-sm font-medium">
                  % interet
                  <input
                    className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    defaultValue={opportunity.probability}
                    max="100"
                    min="0"
                    name="probability"
                    step="1"
                    type="number"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Date du projet
                  <input
                    className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    defaultValue={opportunity.expectedCloseDate ?? ""}
                    name="expected_close_date"
                    type="date"
                  />
                </label>
                <label className="block text-sm font-medium lg:col-span-2">
                  Detail
                  <input
                    className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    defaultValue={opportunity.description ?? ""}
                    name="description"
                  />
                </label>
                <div className="flex items-end">
                  <OpportunitySubmitButton label="Enregistrer" />
                </div>
              </form>

              <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input name="prospect_id" type="hidden" value={prospectId} />
                <input name="opportunity_id" type="hidden" value={opportunity.id} />
                <label className="block text-sm font-medium">
                  Statut de l'opportunite
                  <select
                    className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    defaultValue={opportunity.stage}
                    name="stage"
                  >
                    {opportunityStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {opportunityStageLabels[stage]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <OpportunitySubmitButton label="Mettre a jour" />
                </div>
              </form>
            </article>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
            Aucune opportunite rattachee a ce prospect pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}

function OpportunitySubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full sm:w-auto" disabled={pending} type="submit" variant="secondary">
      <Save size={16} />
      {pending ? "Mise a jour..." : label}
    </Button>
  );
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Montant non renseigne";
  }

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
