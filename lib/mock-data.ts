import type { OpportunityStage, ProspectStatus, SegmentCode } from "@/lib/types";

export const prospects = [
  {
    id: "p-1",
    company: "Atelier Ligne Jardin",
    contact: "Camille Moreau",
    commercial: "Lea Martin",
    assignedUsers: ["Lea Martin"],
    city: "Nantes",
    segment: "bardage_decoratif" as SegmentCode,
    status: "qualifie" as ProspectStatus,
    pipelineStage: "contact_etabli" as OpportunityStage,
    estimatedPotential: 18000,
    createdAt: "2026-05-10",
    updatedAt: "2026-05-28",
    lastVisit: "2026-05-28",
    interest: 4,
    projectTimeline: "moins_3_mois",
    capacityFit: 5,
    recurrencePotential: 3,
    needMaturity: 4,
    nextAction: "Relance devis le 04/06"
  },
  {
    id: "p-2",
    company: "Maison Outdoor Studio",
    contact: "Julien Perrin",
    commercial: "Marc Dubois",
    assignedUsers: ["Marc Dubois"],
    city: "Lyon",
    segment: "structure_mobilier" as SegmentCode,
    status: "en_cours" as ProspectStatus,
    pipelineStage: "devis_envoye" as OpportunityStage,
    estimatedPotential: 42000,
    createdAt: "2026-05-08",
    updatedAt: "2026-05-27",
    lastVisit: "2026-05-27",
    interest: 5,
    projectTimeline: "immediat",
    capacityFit: 4,
    recurrencePotential: 4,
    needMaturity: 5,
    nextAction: "Rendez-vous technique"
  },
  {
    id: "p-3",
    company: "Protoform Industrie",
    contact: "Nora Haddad",
    commercial: "Lea Martin",
    assignedUsers: ["Lea Martin"],
    city: "Tours",
    segment: "usinage_3d" as SegmentCode,
    status: "contacte" as ProspectStatus,
    pipelineStage: "prospect_identifie" as OpportunityStage,
    estimatedPotential: 26000,
    createdAt: "2026-05-18",
    updatedAt: "2026-05-22",
    lastVisit: "2026-05-22",
    interest: 3,
    projectTimeline: "moins_6_mois",
    capacityFit: 5,
    recurrencePotential: 5,
    needMaturity: 3,
    nextAction: "Envoyer exemples pieces"
  },
  {
    id: "p-4",
    company: "Paysages Contemporains",
    contact: "Anne Rolland",
    commercial: "Ines Caron",
    assignedUsers: ["Ines Caron"],
    city: "Rennes",
    segment: "autres_agencements" as SegmentCode,
    status: "nouveau" as ProspectStatus,
    pipelineStage: "prospect_identifie" as OpportunityStage,
    estimatedPotential: 12000,
    createdAt: "2026-05-25",
    updatedAt: "2026-05-25",
    lastVisit: null,
    interest: 2,
    projectTimeline: "inconnu",
    capacityFit: 3,
    recurrencePotential: 2,
    needMaturity: 2,
    nextAction: "Premier appel"
  },
  {
    id: "p-5",
    company: "Mobilier Urbain Atlantique",
    contact: "Thomas Riviere",
    commercial: "Marc Dubois",
    assignedUsers: ["Marc Dubois"],
    city: "Bordeaux",
    segment: "structure_mobilier" as SegmentCode,
    status: "qualifie" as ProspectStatus,
    pipelineStage: "devis_a_faire" as OpportunityStage,
    estimatedPotential: 35000,
    createdAt: "2026-04-29",
    updatedAt: "2026-05-20",
    lastVisit: "2026-05-20",
    interest: 4,
    projectTimeline: "moins_3_mois",
    capacityFit: 4,
    recurrencePotential: 4,
    needMaturity: 4,
    nextAction: "Valider budget"
  }
];

export const opportunities = [
  {
    id: "o-1",
    company: "Atelier Ligne Jardin",
    title: "Mur decoratif mineral",
    commercial: "Lea Martin",
    segment: "bardage_decoratif" as SegmentCode,
    stage: "opportunite_detectee" as OpportunityStage,
    value: 18000,
    probability: 35,
    createdAt: "2026-05-28"
  },
  {
    id: "o-2",
    company: "Maison Outdoor Studio",
    title: "Cuisine exterieure premium",
    commercial: "Marc Dubois",
    segment: "structure_mobilier" as SegmentCode,
    stage: "devis_envoye" as OpportunityStage,
    value: 42000,
    probability: 60,
    createdAt: "2026-05-27"
  },
  {
    id: "o-3",
    company: "Protoform Industrie",
    title: "Prototype moule rotomoulage",
    commercial: "Lea Martin",
    segment: "usinage_3d" as SegmentCode,
    stage: "prospect_identifie" as OpportunityStage,
    value: 26000,
    probability: 20,
    createdAt: "2026-05-22"
  }
];

export const visits = [
  {
    id: "v-1",
    company: "Atelier Ligne Jardin",
    commercial: "Lea Martin",
    date: "2026-05-28",
    type: "Premiere visite",
    summary: "Besoin confirme sur des agencements exterieurs differenciants.",
    interest: 4
  },
  {
    id: "v-2",
    company: "Maison Outdoor Studio",
    commercial: "Marc Dubois",
    date: "2026-05-27",
    type: "Rendez-vous technique",
    summary: "Discussion sur resistance, finitions et contraintes de pose.",
    interest: 5
  }
];

export const followUps = [
  {
    id: "a-0",
    company: "Protoform Industrie",
    commercial: "Lea Martin",
    dueAt: "2026-05-29",
    status: "a_faire"
  },
  {
    id: "a-1",
    company: "Atelier Ligne Jardin",
    commercial: "Lea Martin",
    dueAt: "2026-06-04",
    status: "a_faire"
  },
  {
    id: "a-2",
    company: "Paysages Contemporains",
    commercial: "Ines Caron",
    dueAt: "2026-05-31",
    status: "a_faire"
  },
  {
    id: "a-3",
    company: "Mobilier Urbain Atlantique",
    commercial: "Marc Dubois",
    dueAt: "2026-05-30",
    status: "a_faire"
  }
];
