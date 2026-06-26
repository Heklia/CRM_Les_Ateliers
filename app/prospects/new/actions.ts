"use server";

import { redirect } from "next/navigation";
import {
  normalizeOptionalWebsite,
  optionalEmail,
  optionalText,
  requiredText
} from "@/lib/forms/validation";
import { segmentLabels } from "@/lib/constants";
import {
  duplicateProspectMessage,
  findDuplicateProspect,
  isDuplicateProspectError
} from "@/lib/prospects/duplicate-check";
import { createClient } from "@/lib/supabase/server";
import type { SegmentCode } from "@/lib/types";

type CreateProspectState = {
  error?: string;
};
const segmentCodes = Object.keys(segmentLabels) as SegmentCode[];

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
  const selectedSegmentCodes = getSelectedSegmentCodes(formData);
  const contactName = requiredText(formData, "contact_name", "Nom du contact");
  const website = normalizeOptionalWebsite(formData, "website");
  const email = optionalEmail(formData, "email", "Email");

  if (!companyName.ok) return { error: companyName.error };
  if (!selectedSegmentCodes.length) return { error: "Selectionnez au moins un segment marche." };
  if (!contactName.ok) return { error: contactName.error };
  if (!website.ok) return { error: website.error };
  if (!email.ok) return { error: email.error };

  const validatedCompanyName = companyName.data;
  const validatedContactName = contactName.data;
  const validatedWebsite = website.data;
  const validatedEmail = email.data;
  const postalCode = optionalText(formData, "postal_code");

  const profile = await ensureCommercialProfile(user);

  if (!profile.ok) {
    return { error: profile.error };
  }

  const selectedSegmentsResult = await getSupabaseSegments(supabase, selectedSegmentCodes);

  if (!selectedSegmentsResult.ok) {
    return { error: selectedSegmentsResult.error };
  }

  const primarySegment = selectedSegmentsResult.segments[0];
  const { firstName, lastName } = splitContactName(validatedContactName);
  const duplicateProspect = await findDuplicateProspect(supabase, validatedCompanyName, postalCode);

  if (duplicateProspect) {
    return { error: duplicateProspectMessage };
  }

  const { data: createdProspectId, error: createError } = await supabase.rpc("create_prospect_with_contact", {
    prospect_payload: {
      commercial_id: user.id,
      segment_id: primarySegment.id,
      company_name: validatedCompanyName,
      sub_segment: optionalText(formData, "sub_segment"),
      address_line1: optionalText(formData, "address"),
      city: optionalText(formData, "city"),
      postal_code: postalCode,
      website: validatedWebsite,
      estimated_potential: null,
      project_timeline: "inconnu",
      capacity_fit: null,
      recurrence_potential: null,
      need_maturity: null,
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
    if (isDuplicateProspectError(createError)) {
      return { error: duplicateProspectMessage };
    }

    return { error: "Impossible de creer le prospect et son contact." };
  }

  if (createdProspectId) {
    await Promise.all([
      supabase.from("prospect_segments").insert(
        selectedSegmentsResult.segments.map((item) => ({
          prospect_id: createdProspectId,
          segment_id: item.id
        }))
      ),
      supabase.from("prospect_assignments").insert({
        prospect_id: createdProspectId,
        user_id: user.id,
        assigned_by: user.id
      })
    ]);
  }

  redirect("/prospects");
}

async function getSupabaseSegments(supabase: any, selectedSegmentCodes: SegmentCode[]) {
  const { data, error } = await supabase
    .from("segments")
    .select("id, code")
    .in("code", selectedSegmentCodes);

  if (error) {
    return { ok: false as const, error: `Impossible de lire les segments Supabase : ${error.message}` };
  }

  const rows = (data ?? []) as { id: string; code: string }[];
  const foundCodes = new Set(rows.map((segment) => segment.code));
  const missingCodes = selectedSegmentCodes.filter((code) => !foundCodes.has(code));

  if (missingCodes.length) {
    return {
      ok: false as const,
      error: `Segment introuvable ou non visible dans Supabase : ${missingCodes.join(", ")}. Relancez la migration 009 mise a jour.`
    };
  }

  return { ok: true as const, segments: rows };
}

function getSelectedSegmentCodes(formData: FormData) {
  return formData
    .getAll("segment_codes")
    .map((value) => String(value))
    .filter((value): value is SegmentCode => segmentCodes.includes(value as SegmentCode));
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
      role: "modification",
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
