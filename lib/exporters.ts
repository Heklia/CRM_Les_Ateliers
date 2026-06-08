import {
  opportunityStageLabels,
  prospectCategoryLabels,
  segmentLabels,
  statusLabels
} from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import { calculatePriorityScore } from "@/lib/priority-score";
import type {
  ReportingFollowUp,
  ReportingOpportunity,
  ReportingProspect,
  ReportingVisit
} from "@/lib/reporting-data";
import type { SegmentCode } from "@/lib/types";

export function exportProspects(items: ReportingProspect[]) {
  downloadCsv(
    "prospects.csv",
    items.map((prospect) => ({
      entreprise: prospect.company,
      segment: segmentLabels[prospect.segment],
      ville: prospect.city,
      contact_principal: prospect.contact,
      commercial: prospect.commercial,
      personnes_affectees: prospect.assignedUsers.join(", "),
      categorie: prospectCategoryLabels[prospect.category],
      statut: statusLabels[prospect.status],
      pipeline: opportunityStageLabels[prospect.pipelineStage],
      potentiel_estime: prospect.estimatedPotential,
      score_priorite: getProspectScore(prospect),
      derniere_visite: prospect.lastVisit,
      prochaine_action: prospect.nextAction,
      date_creation: prospect.createdAt,
      date_derniere_modification: prospect.updatedAt
    }))
  );
}

export function exportVisits(items: ReportingVisit[]) {
  downloadCsv(
    "actions-realisees.csv",
    items.map((visit) => ({
      entreprise: visit.company,
      personne_concernee: visit.contact,
      commercial: visit.commercial,
      personnes_affectees: visit.assignedUsers.join(", "),
      date: visit.date,
      type: visit.type,
      resume: visit.summary,
      niveau_interet: visit.interest,
      date_creation: visit.createdAt,
      date_derniere_modification: visit.updatedAt
    }))
  );
}

export function exportOpportunities(items: ReportingOpportunity[]) {
  downloadCsv(
    "opportunites.csv",
    items.map((opportunity) => ({
      opportunite: opportunity.title,
      entreprise: opportunity.company,
      commercial: opportunity.commercial,
      personnes_affectees: opportunity.assignedUsers.join(", "),
      segment: segmentLabels[opportunity.segment],
      etape: opportunityStageLabels[opportunity.stage],
      potentiel_estime: opportunity.value,
      probabilite: opportunity.probability,
      date_creation: opportunity.createdAt,
      date_derniere_modification: opportunity.updatedAt
    }))
  );
}

export function exportFollowUps(items: ReportingFollowUp[]) {
  downloadCsv(
    "relances-a-venir.csv",
    items.map((followUp) => ({
      entreprise: followUp.company,
      commercial: followUp.commercial,
      personnes_affectees: followUp.assignedUsers.join(", "),
      date_relance: followUp.dueAt,
      statut: followUp.status,
      date_creation: followUp.createdAt,
      date_derniere_modification: followUp.updatedAt
    }))
  );
}

export function exportSegmentSummary(
  prospectItems: ReportingProspect[],
  opportunityItems: ReportingOpportunity[] = []
) {
  downloadCsv(
    "synthese-par-segment.csv",
    prospectItems.length || opportunityItems.length
      ? (Object.keys(segmentLabels) as SegmentCode[]).map((segment) => {
          const segmentProspects = prospectItems.filter((prospect) => prospect.segment === segment);
          const segmentOpportunities = opportunityItems.filter(
            (opportunity) => opportunity.segment === segment
          );

          return {
            segment: segmentLabels[segment],
            prospects: segmentProspects.length,
            opportunites: segmentOpportunities.length,
            ca_potentiel_prospects: segmentProspects.reduce(
              (sum, prospect) => sum + prospect.estimatedPotential,
              0
            ),
            ca_potentiel_opportunites: segmentOpportunities.reduce(
              (sum, opportunity) => sum + opportunity.value,
              0
            ),
            score_priorite_moyen: segmentProspects.length
              ? Math.round(
                  segmentProspects.reduce((sum, prospect) => sum + getProspectScore(prospect), 0) /
                    segmentProspects.length
                )
              : 0
          };
        })
      : []
  );
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
