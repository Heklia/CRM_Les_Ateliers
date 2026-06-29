import { StatusPill } from "@/components/ui/status-pill";
import { opportunityStageLabels } from "@/lib/constants";
import type { OpportunityStage } from "@/lib/types";

type OpportunityItem = {
  id: string;
  title: string;
  description: string | null;
  stage: OpportunityStage;
  estimatedValue: number | null;
  probability: number;
  expectedCloseDate: string | null;
  updatedAt: string;
};

export function ProspectOpportunitiesPanel({
  opportunities
}: {
  opportunities: OpportunityItem[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-soft lg:col-span-2">
      <div>
        <h2 className="text-base font-semibold">Opportunites du prospect</h2>
        <p className="mt-1 text-sm text-muted">
          Consultation des opportunites rattachees a ce prospect.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {opportunities.length ? (
          opportunities.map((opportunity) => (
            <article className="rounded-md border border-border p-4" key={opportunity.id}>
              <div>
                <h3 className="font-semibold">{opportunity.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <StatusPill>{opportunityStageLabels[opportunity.stage]}</StatusPill>
                  <span>{formatCurrency(opportunity.estimatedValue)}</span>
                  <span>{opportunity.probability}% interet</span>
                  <span>
                    {opportunity.expectedCloseDate
                      ? formatDate(opportunity.expectedCloseDate)
                      : "Date projet non renseignee"}
                  </span>
                  <span>Modifiee le {formatDate(opportunity.updatedAt)}</span>
                </div>
                {opportunity.description ? (
                  <p className="mt-3 text-sm text-muted">{opportunity.description}</p>
                ) : null}
              </div>
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

function formatCurrency(value: number | null) {
  if (value === null) return "Montant non renseigne";

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
