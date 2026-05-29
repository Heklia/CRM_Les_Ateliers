"use server";

import { createClient } from "@/lib/supabase/server";
import { canAccessCommercialData, getCurrentProfile } from "@/lib/auth/roles";
import { opportunityStages } from "@/lib/constants";
import type { OpportunityStage } from "@/lib/types";

export type PipelineCardType = "prospect" | "opportunite";

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

  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    return { ok: false, error: "Utilisateur non connecte." };
  }

  if (type === "prospect") {
    const { data: prospect, error: findError } = await supabase
      .from("prospects")
      .select("id, commercial_id")
      .eq("id", id)
      .single();

    if (findError || !prospect || !canAccessCommercialData(profile, prospect.commercial_id)) {
      return { ok: false, error: "Prospect introuvable ou non autorise." };
    }

    const { error } = await supabase
      .from("prospects")
      .update({
        pipeline_stage: stage,
        status: prospectStatusByStage[stage]
      })
      .eq("id", id);

    return error
      ? { ok: false, error: "Impossible de mettre a jour le prospect." }
      : { ok: true };
  }

  const { data: opportunity, error: findError } = await supabase
    .from("opportunites")
    .select("id, commercial_id")
    .eq("id", id)
    .single();

  if (findError || !opportunity || !canAccessCommercialData(profile, opportunity.commercial_id)) {
    return { ok: false, error: "Opportunite introuvable ou non autorisee." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("opportunites")
    .update({
      stage,
      won_at: stage === "gagne" ? now : null,
      lost_at: stage === "perdu" ? now : null
    })
    .eq("id", id);

  return error
    ? { ok: false, error: "Impossible de mettre a jour l'opportunite." }
    : { ok: true };
}
