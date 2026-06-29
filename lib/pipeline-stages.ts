import { opportunityStages } from "@/lib/constants";
import type { OpportunityStage } from "@/lib/types";

export function toOpportunityStage(value: string | null | undefined): OpportunityStage {
  if (opportunityStages.includes(value as OpportunityStage)) {
    return value as OpportunityStage;
  }

  switch (value) {
    case "prospect_identifie":
    case "contact_etabli":
    case "rdv_realise":
    case "opportunite_detectee":
      return "en_cours";
    case "devis_a_faire":
      return "en_cours";
    case "devis_envoye":
      return "envoye";
    case "gagne":
      return "accepte";
    case "perdu":
      return "refuse";
    default:
      return "en_cours";
  }
}
