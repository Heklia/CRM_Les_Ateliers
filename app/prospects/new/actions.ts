"use server";

import { redirect } from "next/navigation";
import {
  normalizeOptionalWebsite,
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
  const contacts = getContacts(formData);
  const website = normalizeOptionalWebsite(formData, "website");

  if (!companyName.ok) return { error: companyName.error };
  if (!selectedSegmentCodes.length) return { error: "Selectionnez au moins un segment marche." };
  if (!contacts.ok) return { error: contacts.error };
  if (!website.ok) return { error: website.error };

  const validatedCompanyName = companyName.data;
  const validatedWebsite = website.data;
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
  const duplicateProspect = await findDuplicateProspect(supabase, validatedCompanyName, postalCode);

  if (duplicateProspect) {
    return { error: duplicateProspectMessage };
  }

  const { data: createdProspectId, error: createError } = await supabase.rpc("create_prospect_with_contacts", {
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
    contacts_payload: contacts.data.map((contact) => ({
      commercial_id: user.id,
      ...contact
    }))
  });

  if (createError) {
    if (isDuplicateProspectError(createError)) {
      return { error: duplicateProspectMessage };
    }

    if (createError.message?.includes("create_prospect_with_contacts")) {
      return { error: "La migration Supabase 023_multi_contact_creation.sql doit etre appliquee." };
    }

    return { error: "Impossible de creer le prospect et ses contacts." };
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

function getContacts(formData: FormData) {
  const names = formData.getAll("contact_name").map((value) => String(value).trim());
  const jobTitles = formData.getAll("contact_job_title").map((value) => optionalValue(value));
  const phones = formData.getAll("phone").map((value) => optionalValue(value));
  const emails = formData.getAll("email").map((value) => optionalValue(value));
  const notes = formData.getAll("contact_notes").map((value) => optionalValue(value));

  if (!names.length) {
    return { ok: false as const, error: "Ajoutez au moins un contact." };
  }

  const contacts = [];

  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    const email = emails[index] ?? null;

    if (!name) {
      return { ok: false as const, error: `Le nom du contact ${index + 1} est obligatoire.` };
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false as const, error: `L'email du contact ${index + 1} est invalide.` };
    }

    const { firstName, lastName } = splitContactName(name);
    contacts.push({
      first_name: firstName,
      last_name: lastName,
      job_title: jobTitles[index] ?? null,
      phone: phones[index] ?? null,
      email,
      notes: notes[index] ?? null,
      is_primary: index === 0
    });
  }

  return { ok: true as const, data: contacts };
}

function optionalValue(value: FormDataEntryValue | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
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
