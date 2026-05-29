"use client";

import { useMemo, useState, useTransition } from "react";
import { Building2, CircleDollarSign, GripVertical } from "lucide-react";
import { updatePipelineStage, type PipelineCardType } from "@/app/pipeline/actions";
import { StatusPill } from "@/components/ui/status-pill";
import { opportunityStageLabels, opportunityStages } from "@/lib/constants";
import { getPriorityTone } from "@/lib/priority-score";
import type { OpportunityStage } from "@/lib/types";

export type PipelineCard = {
  id: string;
  type: PipelineCardType;
  title: string;
  subtitle: string;
  city?: string | null;
  stage: OpportunityStage;
  estimatedPotential: number | null;
  priorityScore: number | null;
};

export function PipelineKanban({ initialCards }: { initialCards: PipelineCard[] }) {
  const [cards, setCards] = useState(initialCards);
  const [draggedCard, setDraggedCard] = useState<PipelineCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cardsByStage = useMemo(() => {
    return opportunityStages.reduce(
      (acc, stage) => {
        acc[stage] = cards.filter((card) => card.stage === stage);
        return acc;
      },
      {} as Record<OpportunityStage, PipelineCard[]>
    );
  }, [cards]);

  function moveCard(targetStage: OpportunityStage) {
    if (!draggedCard || draggedCard.stage === targetStage) {
      return;
    }

    const previousCards = cards;
    setError(null);
    setCards((currentCards) =>
      currentCards.map((card) =>
        card.id === draggedCard.id && card.type === draggedCard.type
          ? { ...card, stage: targetStage }
          : card
      )
    );

    startTransition(async () => {
      const result = await updatePipelineStage({
        id: draggedCard.id,
        stage: targetStage,
        type: draggedCard.type
      });

      if (!result.ok) {
        setCards(previousCards);
        setError(result.error ?? "Mise a jour impossible.");
      }
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted">
        <span>{cards.length} carte(s) dans le pipeline</span>
        {isPending ? <span>Mise a jour...</span> : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 overflow-x-auto pb-3 xl:grid-cols-8">
        {opportunityStages.map((stage) => {
          const stageCards = cardsByStage[stage];
          const total = stageCards.reduce(
            (sum, card) => sum + (card.estimatedPotential ?? 0),
            0
          );

          return (
            <section
              className="min-h-80 rounded-lg border border-border bg-surface p-3 shadow-soft"
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveCard(stage)}
            >
              <div className="mb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold leading-tight">
                    {opportunityStageLabels[stage]}
                  </h2>
                  <StatusPill>{stageCards.length}</StatusPill>
                </div>
                <p className="text-xs text-muted">{formatCurrency(total)}</p>
              </div>

              <div className="space-y-3">
                {stageCards.map((card) => (
                  <article
                    className="cursor-grab rounded-md border border-border bg-white p-3 shadow-sm active:cursor-grabbing"
                    draggable
                    key={`${card.type}-${card.id}`}
                    onDragEnd={() => setDraggedCard(null)}
                    onDragStart={() => setDraggedCard(card)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">{card.title}</h3>
                        <p className="mt-1 truncate text-xs text-muted">{card.subtitle}</p>
                      </div>
                      <GripVertical className="shrink-0 text-muted" size={16} />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted">
                        {card.type === "prospect" ? (
                          <Building2 size={14} />
                        ) : (
                          <CircleDollarSign size={14} />
                        )}
                        {card.type === "prospect" ? "Prospect" : "Opportunite"}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(card.estimatedPotential ?? 0)}
                      </span>
                    </div>

                    {card.priorityScore !== null ? (
                      <div className="mt-3">
                        <StatusPill tone={getPriorityTone(card.priorityScore)}>
                          Priorite {card.priorityScore}/100
                        </StatusPill>
                      </div>
                    ) : null}

                    {card.city ? (
                      <p className="mt-2 text-xs text-muted">{card.city}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}
