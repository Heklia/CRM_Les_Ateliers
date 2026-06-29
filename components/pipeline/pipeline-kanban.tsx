"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, CircleDollarSign, Download, GripVertical, Percent } from "lucide-react";
import { updatePipelineStage, type PipelineCardType } from "@/app/pipeline/actions";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { opportunityStageLabels, opportunityStages } from "@/lib/constants";
import type { OpportunityStage } from "@/lib/types";

export type PipelineCard = {
  id: string;
  type: PipelineCardType;
  title: string;
  prospectName: string;
  city?: string | null;
  stage: OpportunityStage;
  estimatedPotential: number | null;
  probability: number;
  expectedCloseDate: string | null;
};

export function PipelineKanban({
  canEdit,
  initialCards
}: {
  canEdit: boolean;
  initialCards: PipelineCard[];
}) {
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
  const monthlyPotential = useMemo(() => {
    const totals = new Map<string, number>();
    cards.forEach((card) => {
      if (!card.expectedCloseDate) return;
      const month = card.expectedCloseDate.slice(0, 7);
      totals.set(month, (totals.get(month) ?? 0) + (card.estimatedPotential ?? 0));
    });
    return Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [cards]);

  function moveCard(targetStage: OpportunityStage) {
    if (!canEdit || !draggedCard || draggedCard.stage === targetStage) {
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
        <span>
          {cards.length} carte(s) dans le pipeline
          {!canEdit ? " - Lecture seule" : ""}
        </span>
        <div className="flex items-center gap-2">
          {isPending ? <span>Mise a jour...</span> : null}
          <Button onClick={() => exportPipeline(cards)} type="button" variant="secondary">
            <Download size={16} />
            Export pipeline
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-soft">
        <h2 className="text-sm font-semibold">EUR pipeline / mois potentiel</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {monthlyPotential.length ? (
            monthlyPotential.map(([month, total]) => (
              <div className="rounded-md border border-border bg-white p-3" key={month}>
                <p className="text-xs text-muted">{formatMonth(month)}</p>
                <p className="mt-1 font-semibold">{formatCurrency(total)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Aucune date projet renseignee.</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="grid min-w-[1800px] grid-cols-6 gap-4">
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
              onDragOver={canEdit ? (event) => event.preventDefault() : undefined}
              onDrop={canEdit ? () => moveCard(stage) : undefined}
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
                    className={`${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-default"} rounded-md border border-border bg-white p-3 shadow-sm`}
                    draggable={canEdit}
                    key={`${card.type}-${card.id}`}
                    onDragEnd={() => setDraggedCard(null)}
                    onDragStart={() => setDraggedCard(card)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">{card.prospectName}</h3>
                        <p className="mt-1 text-xs text-muted">{card.title}</p>
                      </div>
                      {canEdit ? <GripVertical className="shrink-0 text-muted" size={16} /> : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted">
                        <CircleDollarSign size={14} />
                        {formatCurrency(card.estimatedPotential ?? 0)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Percent size={14} />
                        {card.probability}%
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
                      <span>{card.city ?? "Ville non renseignee"}</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={14} />
                        {card.expectedCloseDate ? formatDate(card.expectedCloseDate) : "Date projet"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
        </div>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric"
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

function exportPipeline(cards: PipelineCard[]) {
  const rows = cards.map((card) => ({
    prospect: card.prospectName,
    opportunite: card.title,
    etape: opportunityStageLabels[card.stage],
    potentiel_eur: card.estimatedPotential ?? 0,
    interet_pourcent: card.probability,
    date_projet: card.expectedCloseDate ?? "",
    ville: card.city ?? ""
  }));
  const headers = Object.keys(rows[0] ?? {
    prospect: "",
    opportunite: "",
    etape: "",
    potentiel_eur: "",
    interet_pourcent: "",
    date_projet: "",
    ville: ""
  });
  const csv = [
    headers.join(";"),
    ...rows.map((row) =>
      headers.map((header) => `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`).join(";")
    )
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pipeline.csv";
  link.click();
  URL.revokeObjectURL(url);
}
