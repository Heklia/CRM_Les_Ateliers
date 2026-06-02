"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canAccessCommercialData, getCurrentProfile } from "@/lib/auth/roles";
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
    .select("id, commercial_id")
    .eq("id", visitId.data)
    .single();

  if (readError || !visit || !canAccessCommercialData(profile, visit.commercial_id)) {
    return;
  }

  await supabase.from("actions_suivantes").delete().eq("visite_id", visitId.data);
  await supabase.from("visites").delete().eq("id", visitId.data);

  revalidatePath("/visites");
  revalidatePath("/dashboard");
  revalidatePath("/exports");
}
