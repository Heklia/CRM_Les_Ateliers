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

type UpdateProspectState = {
  error?: string;
};

const segmentCodes = [
  "agencements_decoratifs",
  "structures_mobilier",
  "usinage_3d_prototypage_rotomoulage"
] as const;

const projectTimelines = ["immediat", "moins_3_mois", "moins_6_mois", "plus_6_mois", "inconnu"] as const;

export async function updateProspect(
  _previousState: UpdateProspectState,
  formData: FormData
): Promise<UpdateProspectState> {
  const supabase = createClient() as any;
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
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

  if (!prospectId.ok) return { error: prospectId.error };
  if (!companyName.ok) return { error: companyName.error };
  if (!segmentCode.ok) return { error: segmentCode.error };
  if (!contactName.ok) return { error: contactName.error };
  if (!website.ok) return { error: website.error };
  if (!email.ok) return { error: email.error };
  if (!estimatedPotential.ok) return { error: estimatedPotential.error };
  if (!projectTimeline.ok) return { error: projectTimeline.error };
  if (!capacityFit.ok) return { error: capacityFit.error };
  if (!recurrencePotential.ok) return { error: recurrencePotential.error };
  if (!needMaturity.ok) return { error: needMaturity.error };

  const { data: existingProspect, error: prospectReadError } = await supabase
    .from("prospects")
    .select("id, commercial_id")
    .eq("id", prospectId.data)
    .single();

  if (prospectReadError || !existingProspect) {
    return { error: "Prospect introuvable ou non autorise." };
  }

  const { data: segment, error: segmentError } = await supabase
    .from("segments")
    .select("id")
    .eq("code", segmentCode.data)
    .single();

  if (segmentError || !segment) {
    return { error: "Segment introuvable dans Supabase." };
  }

  const prospectsTable = supabase.from("prospects") as any;
  const { error: updateError } = await prospectsTable
    .update({
      segment_id: segment.id,
      company_name: companyName.data,
      sub_segment: optionalText(formData, "sub_segment"),
      address_line1: optionalText(formData, "address"),
      city: optionalText(formData, "city"),
      postal_code: optionalText(formData, "postal_code"),
      website: website.data,
      estimated_potential: estimatedPotential.data,
      project_timeline: projectTimeline.data,
      capacity_fit: capacityFit.data,
      recurrence_potential: recurrencePotential.data,
      need_maturity: needMaturity.data,
      notes: optionalText(formData, "notes")
    })
    .eq("id", prospectId.data);

  if (updateError) {
    return { error: "Impossible de modifier le prospect." };
  }

  const { firstName, lastName } = splitContactName(contactName.data);
  const contactId = optionalText(formData, "contact_id");
  const contactPayload = {
    prospect_id: prospectId.data,
    commercial_id: existingProspect.commercial_id,
    first_name: firstName,
    last_name: lastName,
    job_title: optionalText(formData, "contact_job_title"),
    phone: optionalText(formData, "phone"),
    email: email.data,
    is_primary: true
  };

  const contactsTable = supabase.from("contacts") as any;
  const { error: contactError } = contactId
    ? await contactsTable
        .update(contactPayload)
        .eq("id", contactId)
        .eq("prospect_id", prospectId.data)
    : await contactsTable.insert(contactPayload);

  if (contactError) {
    return { error: "Le prospect est modifie, mais le contact principal n'a pas pu etre mis a jour." };
  }

  redirect(`/prospects/${prospectId.data}`);
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
