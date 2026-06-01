"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, Save } from "lucide-react";
import { updateOpportunityStage } from "@/app/prospects/[id]/opportunities/actions";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { opportunityStageLabels, opportunityStages } from "@/lib/constants";
import type { OpportunityStage } from "@/lib/types";

type OpportunityItem = {
  id: string;
  prospectId: string;
  title: string;
  stage: OpportunityStage;
  estimatedValue: number | null;
  probability: number;
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
                    <span>{opportunity.probability}%</span>
                    <span>Modifiee le {formatDate(opportunity.updatedAt)}</span>
                  </div>
                </div>
                <Link
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-background"
                  href={`/visites/new?prospect_id=${prospectId}&opportunite_id=${opportunity.id}`}
                >
                  Reprendre en action
                  <ArrowRight size={16} />
                </Link>
              </div>

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
                  <OpportunitySubmitButton />
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

function OpportunitySubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full sm:w-auto" disabled={pending} type="submit" variant="secondary">
      <Save size={16} />
      {pending ? "Mise a jour..." : "Mettre a jour"}
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
