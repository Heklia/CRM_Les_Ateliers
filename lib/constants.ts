import type { NavItem } from "@/lib/types";

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Prospects", href: "/prospects" },
  { label: "Actions", href: "/visites" },
  { label: "A faire", href: "/actions-a-realiser" },
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
