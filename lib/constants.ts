import type { NavItem } from "@/lib/types";

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Prospects", href: "/prospects" },
  { label: "Actions", href: "/visites" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Exports", href: "/exports" }
];

export const segmentLabels = {
  agencements_decoratifs: "Agencements decoratifs",
  structures_mobilier: "Structures et mobilier",
  usinage_3d_prototypage_rotomoulage: "Usinage 3D et prototypage"
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

export const opportunityStages = [
  "prospect_identifie",
  "contact_etabli",
  "rdv_realise",
  "opportunite_detectee",
  "devis_a_faire",
  "devis_envoye",
  "gagne",
  "perdu"
] as const;

export const opportunityStageLabels = {
  prospect_identifie: "Prospect identifie",
  contact_etabli: "Contact etabli",
  rdv_realise: "RDV realise",
  opportunite_detectee: "Opportunite detectee",
  devis_a_faire: "Devis a faire",
  devis_envoye: "Devis envoye",
  gagne: "Gagne",
  perdu: "Perdu"
} as const;
