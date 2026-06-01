"use server";

import { createClient } from "@/lib/supabase/server";
import { canAccessCommercialData, getCurrentProfile } from "@/lib/auth/roles";
import { opportunityStages } from "@/lib/constants";
import type { OpportunityStage } from "@/lib/types";

export type PipelineCardType = "prospect" | "opportunite";
type CommercialOwner = {
  id: string;
  commercial_id: string;
};

const prospectStatusByStage: Record<OpportunityStage, string> = {
  prospect_identifie: "nouveau",
  contact_etabli: "contacte",
  rdv_realise: "en_cours",
  opportunite_detectee: "qualifie",
  devis_a_faire: "en_cours",
  devis_envoye: "en_cours",
  gagne: "client",
  perdu: "perdu"
};

export async function updatePipelineStage({
  id,
  stage,
  type
}: {
  id: string;
  stage: OpportunityStage;
  type: PipelineCardType;
}) {
  if (!["prospect", "opportunite"].includes(type)) {
    return { ok: false, error: "Type de carte invalide." };
  }

  if (!opportunityStages.includes(stage)) {
    return { ok: false, error: "Etape de pipeline invalide." };
  }

  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    return { ok: false, error: "Utilisateur non connecte." };
  }

  if (type === "prospect") {
    const prospectsTable = supabase.from("prospects") as any;
    const { data, error: findError } = await prospectsTable
      .select("id, commercial_id")
      .eq("id", id)
      .single();
    const prospect = data as CommercialOwner | null;

    if (findError || !prospect || !canAccessCommercialData(profile, prospect.commercial_id)) {
      return { ok: false, error: "Prospect introuvable ou non autorise." };
    }

    const { error } = await prospectsTable.update({
        pipeline_stage: stage,
        status: prospectStatusByStage[stage]
      })
      .eq("id", id);

    return error
      ? { ok: false, error: "Impossible de mettre a jour le prospect." }
      : { ok: true };
  }

  const opportunitiesTable = supabase.from("opportunites") as any;
  const { data, error: findError } = await opportunitiesTable
    .select("id, commercial_id")
    .eq("id", id)
    .single();
  const opportunity = data as CommercialOwner | null;

  if (findError || !opportunity || !canAccessCommercialData(profile, opportunity.commercial_id)) {
    return { ok: false, error: "Opportunite introuvable ou non autorisee." };
  }

  const now = new Date().toISOString();
  const { error } = await opportunitiesTable.update({
      stage,
      won_at: stage === "gagne" ? now : null,
      lost_at: stage === "perdu" ? now : null,
      loss_reason: stage === "perdu" ? "Perdu depuis le pipeline" : null
    })
    .eq("id", id);

  return error
    ? { ok: false, error: "Impossible de mettre a jour l'opportunite." }
    : { ok: true };
}
