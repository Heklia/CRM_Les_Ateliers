export type SegmentCode =
  | "bardage_decoratif"
  | "autres_agencements"
  | "structure_mobilier"
  | "usinage_3d"
  | "co_conception"
  | "nautisme"
  | "pieces_industrielles";

export type ProspectStatus =
  | "nouveau"
  | "a_qualifier"
  | "qualifie"
  | "contacte"
  | "en_cours"
  | "client"
  | "perdu";

export type ProspectCategory = "favori" | "standard" | "a_ecarter";

export type OpportunityStage =
  | "prospect_identifie"
  | "contact_etabli"
  | "rdv_realise"
  | "opportunite_detectee"
  | "devis_a_faire"
  | "devis_envoye"
  | "gagne"
  | "perdu";

export type NavItem = {
  label: string;
  href: string;
  adminOnly?: boolean;
};
