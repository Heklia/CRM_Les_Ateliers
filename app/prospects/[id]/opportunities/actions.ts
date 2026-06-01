"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canAccessCommercialData, getCurrentProfile } from "@/lib/auth/roles";
import { opportunityStages } from "@/lib/constants";
import { requiredEnum, requiredText } from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

type UpdateOpportunityStageState = {
  error?: string;
  success?: string;
};

export async function updateOpportunityStage(
  _previousState: UpdateOpportunityStageState,
  formData: FormData
): Promise<UpdateOpportunityStageState> {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const opportunityId = requiredText(formData, "opportunity_id", "Opportunite");
  const stage = requiredEnum(formData, "stage", "Statut de l'opportunite", opportunityStages);

  if (!prospectId.ok) return { error: prospectId.error };
  if (!opportunityId.ok) return { error: opportunityId.error };
  if (!stage.ok) return { error: stage.error };

  const { data: opportunity, error: readError } = await supabase
    .from("opportunites")
    .select("id, prospect_id, commercial_id, loss_reason")
    .eq("id", opportunityId.data)
    .eq("prospect_id", prospectId.data)
    .single();

  if (
    readError ||
    !opportunity ||
    !canAccessCommercialData(profile, opportunity.commercial_id)
  ) {
    return { error: "Opportunite introuvable ou non autorisee." };
  }

  const stageUpdate = buildStageUpdate(stage.data, opportunity.loss_reason);
  const { error: updateError } = await supabase
    .from("opportunites")
    .update(stageUpdate)
    .eq("id", opportunityId.data);

  if (updateError) {
    return { error: "Impossible de mettre a jour le statut de l'opportunite." };
  }

  revalidatePath(`/prospects/${prospectId.data}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/exports");

  return { success: "Statut de l'opportunite mis a jour." };
}

function buildStageUpdate(stage: (typeof opportunityStages)[number], currentLossReason: string | null) {
  if (stage === "gagne") {
    return {
      stage,
      won_at: new Date().toISOString(),
      lost_at: null,
      loss_reason: null
    };
  }

  if (stage === "perdu") {
    return {
      stage,
      won_at: null,
      lost_at: new Date().toISOString(),
      loss_reason: currentLossReason ?? "Non renseigne"
    };
  }

  return {
    stage,
    won_at: null,
    lost_at: null,
    loss_reason: null
  };
}
