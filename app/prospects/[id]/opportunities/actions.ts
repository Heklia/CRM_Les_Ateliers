"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canAccessCommercialData, getCurrentProfile } from "@/lib/auth/roles";
import { opportunityStages } from "@/lib/constants";
import {
  optionalNonNegativeNumber,
  optionalText,
  requiredEnum,
  requiredText
} from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

type OpportunityActionState = {
  error?: string;
  success?: string;
};

export async function updateOpportunityStage(
  _previousState: OpportunityActionState,
  formData: FormData
): Promise<OpportunityActionState> {
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

  const access = await getOpportunityAccess(supabase, profile, opportunityId.data, prospectId.data);
  if (!access.ok) return { error: access.error };

  const { error } = await supabase
    .from("opportunites")
    .update(buildStageUpdate(stage.data, access.lossReason))
    .eq("id", opportunityId.data);

  if (error) {
    return { error: "Impossible de mettre a jour le statut de l'opportunite." };
  }

  revalidateProspectViews(prospectId.data);
  return { success: "Statut de l'opportunite mis a jour." };
}

export async function updateOpportunityDetails(
  _previousState: OpportunityActionState,
  formData: FormData
): Promise<OpportunityActionState> {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const opportunityId = requiredText(formData, "opportunity_id", "Opportunite");
  const title = requiredText(formData, "title", "Nom de l'opportunite");
  const amount = optionalNonNegativeNumber(formData, "estimated_value", "Montant estime");

  if (!prospectId.ok) return { error: prospectId.error };
  if (!opportunityId.ok) return { error: opportunityId.error };
  if (!title.ok) return { error: title.error };
  if (!amount.ok) return { error: amount.error };

  const access = await getOpportunityAccess(supabase, profile, opportunityId.data, prospectId.data);
  if (!access.ok) return { error: access.error };

  const { error } = await supabase
    .from("opportunites")
    .update({
      title: title.data,
      description: optionalText(formData, "description"),
      estimated_value: amount.data === null ? null : amount.data * 1000,
      probability: getProbability(formData),
      expected_close_date: optionalText(formData, "expected_close_date")
    })
    .eq("id", opportunityId.data);

  if (error) {
    return { error: "Impossible de mettre a jour l'opportunite." };
  }

  revalidateProspectViews(prospectId.data);
  return { success: "Opportunite mise a jour." };
}

export async function deleteOpportunity(formData: FormData) {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const opportunityId = requiredText(formData, "opportunity_id", "Opportunite");

  if (!prospectId.ok || !opportunityId.ok) {
    return;
  }

  const access = await getOpportunityAccess(supabase, profile, opportunityId.data, prospectId.data);
  if (!access.ok) {
    return;
  }

  await supabase.from("opportunites").delete().eq("id", opportunityId.data);
  revalidateProspectViews(prospectId.data);
}

async function getOpportunityAccess(
  supabase: any,
  profile: Awaited<ReturnType<typeof getCurrentProfile>>,
  opportunityId: string,
  prospectId: string
) {
  const { data: opportunity, error } = await supabase
    .from("opportunites")
    .select("id, prospect_id, commercial_id, loss_reason")
    .eq("id", opportunityId)
    .eq("prospect_id", prospectId)
    .single();

  if (error || !opportunity || !profile || !canAccessCommercialData(profile, opportunity.commercial_id)) {
    return { ok: false as const, error: "Opportunite introuvable ou non autorisee." };
  }

  return { ok: true as const, lossReason: opportunity.loss_reason as string | null };
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

function getProbability(formData: FormData) {
  const value = Number(String(formData.get("probability") ?? "0"));
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function revalidateProspectViews(prospectId: string) {
  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/exports");
}
