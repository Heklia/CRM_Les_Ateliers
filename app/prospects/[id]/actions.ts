"use server";

import { redirect } from "next/navigation";
import { canAccessCommercialData, getCurrentProfile } from "@/lib/auth/roles";
import { requiredText } from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

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
