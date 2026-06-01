"use server";

import { redirect } from "next/navigation";
import {
  normalizeOptionalWebsite,
  optionalEmail,
  optionalText,
  requiredText
} from "@/lib/forms/validation";
import { segmentLabels } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { SegmentCode } from "@/lib/types";

type UpdateProspectState = {
  error?: string;
};

const segmentCodes = Object.keys(segmentLabels) as SegmentCode[];

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
  const selectedSegmentCodes = getSelectedSegmentCodes(formData);
  const contactName = requiredText(formData, "contact_name", "Nom du contact");
  const website = normalizeOptionalWebsite(formData, "website");
  const email = optionalEmail(formData, "email", "Email");

  if (!prospectId.ok) return { error: prospectId.error };
  if (!companyName.ok) return { error: companyName.error };
  if (!selectedSegmentCodes.length) return { error: "Selectionnez au moins un segment marche." };
  if (!contactName.ok) return { error: contactName.error };
  if (!website.ok) return { error: website.error };
  if (!email.ok) return { error: email.error };

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
    .eq("code", selectedSegmentCodes[0])
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
      notes: optionalText(formData, "notes")
    })
    .eq("id", prospectId.data);

  if (updateError) {
    return { error: "Impossible de modifier le prospect." };
  }

  const { data: selectedSegments, error: selectedSegmentsError } = await supabase
    .from("segments")
    .select("id, code")
    .in("code", selectedSegmentCodes);

  if (!selectedSegmentsError) {
    await supabase.from("prospect_segments").delete().eq("prospect_id", prospectId.data);
    await supabase.from("prospect_segments").insert(
      (selectedSegments ?? []).map((item: { id: string }) => ({
        prospect_id: prospectId.data,
        segment_id: item.id
      }))
    );
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

function getSelectedSegmentCodes(formData: FormData) {
  return formData
    .getAll("segment_codes")
    .map((value) => String(value))
    .filter((value): value is SegmentCode => segmentCodes.includes(value as SegmentCode));
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
