"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canAccessCommercialData, canModifyData, getCurrentProfile } from "@/lib/auth/roles";
import { requiredEnum, requiredText } from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

const prospectStatuses = ["en_cours", "qualifie", "client", "perdu"] as const;
const prospectCategories = ["favori", "standard", "a_ecarter"] as const;
const imageBucket = "prospect-images";
const maxImageSize = 10 * 1024 * 1024;

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
      ...(status.data === "perdu" ? { pipeline_stage: "refuse" } : {})
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

export async function updateProspectCategory(formData: FormData) {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const category = requiredEnum(formData, "category", "Categorie", prospectCategories);

  if (!prospectId.ok || !category.ok) {
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

  const { error: updateError } = await supabase
    .from("prospects")
    .update({ category: category.data })
    .eq("id", prospectId.data);

  if (updateError) {
    console.error("updateProspectCategory failed", {
      code: updateError.code,
      message: updateError.message,
      prospectId: prospectId.data
    });
    return;
  }

  revalidatePath(`/prospects/${prospectId.data}`);
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  revalidatePath("/exports");
}

export async function registerProspectImage(formData: FormData) {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const storagePath = requiredText(formData, "storage_path", "Chemin de l'image");
  const fileName = requiredText(formData, "file_name", "Nom de l'image");
  const contentType = requiredText(formData, "content_type", "Type de l'image");
  const originalFileName = String(formData.get("original_file_name") ?? "").trim() || null;
  const fileSize = Number(String(formData.get("file_size") ?? "0"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!prospectId.ok) return { error: prospectId.error };
  if (!storagePath.ok) return { error: storagePath.error };
  if (!fileName.ok) return { error: fileName.error };
  if (!contentType.ok) return { error: contentType.error };

  if (!canModifyData(profile)) {
    return { error: "Vous n'avez pas les droits pour ajouter une image." };
  }

  if (!contentType.data.startsWith("image/")) {
    return { error: "Le fichier doit etre une image." };
  }

  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > maxImageSize) {
    return { error: "L'image ne doit pas depasser 10 Mo." };
  }

  const { data: prospect, error: readError } = await supabase
    .from("prospects")
    .select("id, commercial_id, company_name")
    .eq("id", prospectId.data)
    .single();

  if (
    readError ||
    !prospect ||
    !(await canAccessProspect(supabase, profile, prospect.id, prospect.commercial_id))
  ) {
    return { error: "Prospect introuvable ou non autorise." };
  }

  if (
    storagePath.data !== `${prospect.id}/${fileName.data}` ||
    !/^[a-z0-9-]+_\d{8}_\d{9}\.[a-z0-9]{2,5}$/.test(fileName.data)
  ) {
    return { error: "Nom ou chemin d'image invalide." };
  }

  const { error: insertError } = await supabase.from("prospect_images").insert({
    prospect_id: prospect.id,
    commercial_id: prospect.commercial_id,
    created_by: profile.id,
    bucket_id: imageBucket,
    storage_path: storagePath.data,
    file_name: fileName.data,
    original_file_name: originalFileName,
    content_type: contentType.data,
    file_size: fileSize,
    notes
  });

  if (insertError) {
    return {
      error: `Image envoyee, mais rattachement impossible (${insertError.message}).`
    };
  }

  revalidatePath(`/prospects/${prospect.id}`);
  return { success: "Image ajoutee a la fiche prospect." };
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
