export type SegmentCode =
  | "agencements_decoratifs"
  | "structures_mobilier"
  | "usinage_3d_prototypage_rotomoulage";

export type ProspectStatus =
  | "nouveau"
  | "a_qualifier"
  | "qualifie"
  | "contacte"
  | "en_cours"
  | "client"
  | "perdu";

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
};
