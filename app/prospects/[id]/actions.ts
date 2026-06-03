"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canAccessCommercialData, canModifyData, getCurrentProfile } from "@/lib/auth/roles";
import { requiredEnum, requiredText } from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

const prospectStatuses = ["en_cours", "qualifie", "client", "perdu"] as const;

export async function deleteProspect(formData: FormData) {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");

  if (!prospectId.ok) {
    redirect("/prospects");
  }

  const { data: prospect, error: readError } = await supabase
    .from("prospects")
    .select("id, commercial_id")
    .eq("id", prospectId.data)
    .single();

  if (readError || !prospect || !canAccessCommercialData(profile, prospect.commercial_id)) {
    redirect("/prospects");
  }

  await supabase.from("prospects").delete().eq("id", prospectId.data);
  redirect("/prospects");
}

export async function updateProspectStatus(formData: FormData) {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const status = requiredEnum(formData, "status", "Statut", prospectStatuses);

  if (!prospectId.ok || !status.ok) {
    return;
  }

  const { data: prospect, error: readError } = await supabase
    .from("prospects")
    .select("id, commercial_id")
    .eq("id", prospectId.data)
    .single();

  if (
    readError ||
    !prospect ||
    !canModifyData(profile) ||
    !(await canAccessProspect(supabase, profile, prospect.id, prospect.commercial_id))
  ) {
    return;
  }

  await supabase
    .from("prospects")
    .update({
      status: status.data,
      ...(status.data === "perdu" ? { pipeline_stage: "perdu" } : {})
    })
    .eq("id", prospectId.data);

  if (status.data === "perdu") {
    await supabase
      .from("actions_suivantes")
      .delete()
      .eq("prospect_id", prospectId.data)
      .eq("status", "a_faire");
  }

  revalidatePath(`/prospects/${prospectId.data}`);
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  revalidatePath("/exports");
}

async function canAccessProspect(
  supabase: any,
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  prospectId: string,
  commercialId: string
) {
  if (canAccessCommercialData(profile, commercialId)) {
    return true;
  }

  const { data } = await supabase
    .from("prospect_assignments")
    .select("prospect_id")
    .eq("prospect_id", prospectId)
    .eq("user_id", profile.id)
    .maybeSingle();

  return Boolean(data);
}
