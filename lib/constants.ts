import type { NavItem } from "@/lib/types";

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "A faire", href: "/actions-a-realiser" },
  { label: "Prospects", href: "/prospects" },
  { label: "Actions", href: "/visites" },
  { label: "Pipeline", href: "/pipeline", adminOnly: true },
  { label: "Administration", href: "/admin", adminOnly: true }
];

export const segmentLabels = {
  bardage_decoratif: "Bardage decoratif",
  autres_agencements: "Autres agencements",
  structure_mobilier: "Structure et mobilier",
  usinage_3d: "Usinage 3D",
  co_conception: "Co-conception",
  nautisme: "Nautisme",
  pieces_industrielles: "Pieces industrielles"
} as const;

export const statusLabels = {
  nouveau: "Nouveau",
  a_qualifier: "A qualifier",
  qualifie: "Qualifie",
  contacte: "Contacte",
  en_cours: "En cours",
  client: "Client",
  perdu: "Perdu"
} as const;

export const prospectCategoryLabels = {
  favori: "Favori",
  standard: "Standard",
  a_ecarter: "A ecarter"
} as const;

export const commercialActionTypeLabels = {
  appel: "Appel",
  email: "Email",
  visite_terrain: "Visite terrain",
  salon: "Salon",
  devis: "Devis",
  autre: "Autre"
} as const;

export const commercialActionPriorityLabels = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute"
} as const;

export const commercialActionThreadStatusLabels = {
  active: "Active",
  closed_won: "Cloturee gagnee",
  closed_lost: "Cloturee perdue",
  archived: "Archivee"
} as const;

export const commercialProspectStatusLabels = {
  a_qualifier: "A qualifier",
  interesse: "Interesse",
  projet_identifie: "Projet identifie",
  devis_a_faire: "Devis a faire",
  devis_envoye: "Devis envoye",
  relance_a_faire: "Relance a faire",
  commande_gagnee: "Commande gagnee",
  perdu: "Perdu",
  sans_suite_temporaire: "Sans suite temporaire"
} as const;

export const opportunityStages = [
  "opportunite_detectee",
  "en_cours",
  "a_reviser",
  "envoye",
  "accepte",
  "refuse"
] as const;

export const opportunityStageLabels = {
  opportunite_detectee: "Opportunite detectee",
  en_cours: "En cours",
  a_reviser: "A reviser",
  envoye: "Envoye",
  accepte: "Accepte",
  refuse: "Refuse"
} as const;
