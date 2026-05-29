"use server";

import { redirect } from "next/navigation";
import {
  normalizeOptionalWebsite,
  optionalEmail,
  optionalNonNegativeNumber,
  optionalScaleNumber,
  optionalText,
  requiredEnum,
  requiredText
} from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

type CreateProspectState = {
  error?: string;
};
const segmentCodes = [
  "agencements_decoratifs",
  "structures_mobilier",
  "usinage_3d_prototypage_rotomoulage"
] as const;
const projectTimelines = ["immediat", "moins_3_mois", "moins_6_mois", "plus_6_mois", "inconnu"] as const;

export async function createProspect(
  _previousState: CreateProspectState,
  formData: FormData
): Promise<CreateProspectState> {
  const supabase = createClient() as any;
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const companyName = requiredText(formData, "company_name", "Nom entreprise");
  const segmentCode = requiredEnum(formData, "segment_code", "Segment marche", segmentCodes);
  const contactName = requiredText(formData, "contact_name", "Nom du contact");
  const website = normalizeOptionalWebsite(formData, "website");
  const email = optionalEmail(formData, "email", "Email");
  const estimatedPotential = optionalNonNegativeNumber(formData, "estimated_potential", "Potentiel estime");
  const projectTimeline = requiredEnum(formData, "project_timeline", "Delai projet", projectTimelines);
  const capacityFit = optionalScaleNumber(formData, "capacity_fit", "Adequation capacites");
  const recurrencePotential = optionalScaleNumber(formData, "recurrence_potential", "Recurrence potentielle");
  const needMaturity = optionalScaleNumber(formData, "need_maturity", "Maturite du besoin");

  for (const result of [
    companyName,
    segmentCode,
    contactName,
    website,
    email,
    estimatedPotential,
    projectTimeline,
    capacityFit,
    recurrencePotential,
    needMaturity
  ]) {
    if (!result.ok) {
      return { error: result.error };
    }
  }

  const validatedSegmentCode = segmentCode.data;
  const validatedCompanyName = companyName.data;
  const validatedContactName = contactName.data;
  const validatedWebsite = website.data;
  const validatedEmail = email.data;
  const validatedEstimatedPotential = estimatedPotential.data;
  const validatedProjectTimeline = projectTimeline.data;
  const validatedCapacityFit = capacityFit.data;
  const validatedRecurrencePotential = recurrencePotential.data;
  const validatedNeedMaturity = needMaturity.data;

  const profile = await ensureCommercialProfile(user);

  if (!profile.ok) {
    return { error: profile.error };
  }

  const { data: segment, error: segmentError } = await supabase
    .from("segments")
    .select("id")
    .eq("code", validatedSegmentCode)
    .single();

  if (segmentError || !segment) {
    return { error: "Segment introuvable dans Supabase." };
  }

  const { firstName, lastName } = splitContactName(validatedContactName);

  const { error: createError } = await supabase.rpc("create_prospect_with_contact", {
    prospect_payload: {
      commercial_id: user.id,
      segment_id: segment.id,
      company_name: validatedCompanyName,
      sub_segment: optionalText(formData, "sub_segment"),
      address_line1: optionalText(formData, "address"),
      city: optionalText(formData, "city"),
      postal_code: optionalText(formData, "postal_code"),
      website: validatedWebsite,
      estimated_potential: validatedEstimatedPotential,
      project_timeline: validatedProjectTimeline,
      capacity_fit: validatedCapacityFit,
      recurrence_potential: validatedRecurrencePotential,
      need_maturity: validatedNeedMaturity,
      notes: optionalText(formData, "notes"),
      source: "terrain",
      status: "nouveau"
    },
    contact_payload: {
      commercial_id: user.id,
      first_name: firstName,
      last_name: lastName,
      job_title: optionalText(formData, "contact_job_title"),
      phone: optionalText(formData, "phone"),
      email: validatedEmail,
      is_primary: true
    }
  });

  if (createError) {
    return { error: "Impossible de creer le prospect et son contact." };
  }

  redirect("/prospects");
}

async function ensureCommercialProfile(user: {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}) {
  const supabase = createClient() as any;
  const { data: existingProfile, error: readError } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return { ok: false as const, error: "Impossible de verifier le profil commercial." };
  }

  if (existingProfile) {
    return { ok: true as const };
  }

  const email = user.email ?? "";
  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    email.split("@")[0] ??
    "Commercial";

  const { error } = await supabase.from("users").insert(
    {
      id: user.id,
      email,
      full_name: fullName,
      role: "commercial",
      is_active: true
    }
  );

  if (error) {
    return { ok: false as const, error: "Impossible de rattacher le commercial connecte." };
  }

  return { ok: true as const };
}

function splitContactName(value: string) {
  const parts = value.trim().split(/\s+/);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? null
  };
}
