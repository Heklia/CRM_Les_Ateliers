"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canAccessCommercialData, canModifyData, getCurrentProfile } from "@/lib/auth/roles";
import { requiredText } from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

export async function deleteVisitAction(formData: FormData) {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const visitId = requiredText(formData, "visit_id", "Action");

  if (!visitId.ok) {
    return;
  }

  const { data: visit, error: readError } = await supabase
    .from("visites")
    .select("id, prospect_id, commercial_id")
    .eq("id", visitId.data)
    .single();

  if (
    readError ||
    !visit ||
    !canModifyData(profile) ||
    !(await canAccessVisit(supabase, profile, visit.id, visit.prospect_id, visit.commercial_id))
  ) {
    return;
  }

  await supabase.from("actions_suivantes").delete().eq("visite_id", visitId.data);
  await supabase.from("visites").delete().eq("id", visitId.data);

  revalidatePath("/visites");
  revalidatePath("/dashboard");
  revalidatePath("/exports");
}

async function canAccessVisit(
  supabase: any,
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  visitId: string,
  prospectId: string,
  commercialId: string
) {
  if (canAccessCommercialData(profile, commercialId)) {
    return true;
  }

  const [{ data: prospectAssignment }, { data: visitAssignment }] = await Promise.all([
    supabase
      .from("prospect_assignments")
      .select("prospect_id")
      .eq("prospect_id", prospectId)
      .eq("user_id", profile.id)
      .maybeSingle(),
    supabase
      .from("visite_assignments")
      .select("visite_id")
      .eq("visite_id", visitId)
      .eq("user_id", profile.id)
      .maybeSingle()
  ]);

  return Boolean(prospectAssignment || visitAssignment);
}
