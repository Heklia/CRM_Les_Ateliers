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

export async function uploadProspectImage(
  _previousState: { error?: string; success?: string },
  formData: FormData
) {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const file = formData.get("image");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!prospectId.ok || !(file instanceof File) || file.size === 0) {
    return { error: "Image obligatoire." };
  }

  if (!canModifyData(profile)) {
    return { error: "Vous n'avez pas les droits pour ajouter une image." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "Le fichier doit etre une image." };
  }

  if (file.size > maxImageSize) {
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

  const extension = getImageExtension(file);
  const fileName = `${slugifyFilePart(prospect.company_name)}_${formatFileTimestamp(new Date())}.${extension}`;
  const storagePath = `${prospect.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(imageBucket)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    return { error: "Impossible d'enregistrer l'image dans Supabase Storage." };
  }

  const { error: insertError } = await supabase.from("prospect_images").insert({
    prospect_id: prospect.id,
    commercial_id: prospect.commercial_id,
    created_by: profile.id,
    bucket_id: imageBucket,
    storage_path: storagePath,
    file_name: fileName,
    original_file_name: file.name || null,
    content_type: file.type,
    file_size: file.size,
    notes
  });

  if (insertError) {
    await supabase.storage.from(imageBucket).remove([storagePath]);
    return { error: "Image envoyee, mais impossible de la rattacher au prospect." };
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

function getImageExtension(file: File) {
  const mimeExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif"
  };

  if (mimeExtensions[file.type]) {
    return mimeExtensions[file.type];
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
}

function slugifyFilePart(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "prospect";
}

function formatFileTimestamp(value: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(value);

  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return [
    byType.get("year"),
    byType.get("month"),
    byType.get("day")
  ].join("") + "_" + [
    byType.get("hour"),
    byType.get("minute"),
    byType.get("second")
  ].join("");
}
