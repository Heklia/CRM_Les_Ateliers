"use server";

import {
  normalizeOptionalWebsite,
  optionalEmail,
  optionalNonNegativeNumber,
  optionalScaleNumber
} from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

type ImportProspectsState = {
  error?: string;
  success?: string;
  details?: string[];
};

type CsvRow = Record<string, string>;

const segmentCodes = [
  "agencements_decoratifs",
  "structures_mobilier",
  "usinage_3d_prototypage_rotomoulage"
] as const;

const projectTimelines = ["immediat", "moins_3_mois", "moins_6_mois", "plus_6_mois", "inconnu"] as const;

const headerAliases = {
  company_name: ["company_name", "entreprise", "nom_entreprise", "societe"],
  segment_code: ["segment_code", "segment", "segment_marche"],
  sub_segment: ["sub_segment", "sous_segment", "sous-segment"],
  address: ["address", "adresse"],
  city: ["city", "ville"],
  postal_code: ["postal_code", "code_postal", "cp"],
  website: ["website", "site_web", "site"],
  contact_name: ["contact_name", "contact", "nom_contact", "nom_du_contact"],
  contact_job_title: ["contact_job_title", "fonction_contact", "fonction"],
  phone: ["phone", "telephone", "tel"],
  email: ["email", "mail"],
  estimated_potential: ["estimated_potential", "potentiel_estime", "potentiel"],
  notes: ["notes", "commentaire", "commentaires"],
  project_timeline: ["project_timeline", "delai_projet", "delai"],
  capacity_fit: ["capacity_fit", "adequation_capacites", "adequation"],
  recurrence_potential: ["recurrence_potential", "recurrence_potentielle", "recurrence"],
  need_maturity: ["need_maturity", "maturite_besoin", "maturite"]
} as const;

export async function importProspects(
  _previousState: ImportProspectsState,
  formData: FormData
): Promise<ImportProspectsState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Ajoutez un fichier CSV a importer." };
  }

  if (file.size > 1024 * 1024) {
    return { error: "Le fichier est trop volumineux. Limite conseillee : 1 Mo." };
  }

  const content = await file.text();
  const parsed = parseCsv(content);

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  if (parsed.rows.length === 0) {
    return { error: "Le fichier ne contient aucune ligne a importer." };
  }

  if (parsed.rows.length > 300) {
    return { error: "Import limite a 300 prospects par fichier pour ce MVP." };
  }

  const supabase = createClient() as any;
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Utilisateur non connecte." };
  }

  const profile = await ensureUserProfile(user);

  if (!profile.ok) {
    return { error: profile.error };
  }

  const { data: segments, error: segmentError } = await supabase
    .from("segments")
    .select("id, code");

  if (segmentError || !segments) {
    return { error: "Impossible de lire les segments dans Supabase." };
  }

  const segmentByCode = new Map(
    (segments as { id: string; code: string }[]).map((segment) => [segment.code, segment.id])
  );

  let imported = 0;
  const details: string[] = [];

  for (const [index, row] of parsed.rows.entries()) {
    const line = index + 2;
    const validated = validateRow(row, line, segmentByCode);

    if (!validated.ok) {
      details.push(validated.error);
      continue;
    }

    const { firstName, lastName } = splitContactName(validated.data.contactName);
    const { error } = await supabase.rpc("create_prospect_with_contact", {
      prospect_payload: {
        commercial_id: user.id,
        segment_id: validated.data.segmentId,
        company_name: validated.data.companyName,
        sub_segment: validated.data.subSegment,
        address_line1: validated.data.address,
        city: validated.data.city,
        postal_code: validated.data.postalCode,
        website: validated.data.website,
        estimated_potential: validated.data.estimatedPotential,
        project_timeline: validated.data.projectTimeline,
        capacity_fit: validated.data.capacityFit,
        recurrence_potential: validated.data.recurrencePotential,
        need_maturity: validated.data.needMaturity,
        notes: validated.data.notes,
        source: "autre",
        status: "nouveau"
      },
      contact_payload: {
        commercial_id: user.id,
        first_name: firstName,
        last_name: lastName,
        job_title: validated.data.contactJobTitle,
        phone: validated.data.phone,
        email: validated.data.email,
        is_primary: true
      }
    });

    if (error) {
      details.push(`Ligne ${line} : import impossible (${error.message}).`);
      continue;
    }

    imported += 1;
  }

  if (imported === 0) {
    return {
      error: "Aucun prospect importe.",
      details: details.slice(0, 10)
    };
  }

  return {
    success: `${imported} prospect(s) importe(s).`,
    details: details.slice(0, 10)
  };
}

function parseCsv(content: string) {
  const rows = parseCsvLines(content.replace(/^\uFEFF/, "").trim());

  if (rows.length < 2) {
    return { ok: false as const, error: "Le CSV doit contenir une ligne d'en-tetes et au moins une ligne de donnees." };
  }

  const headers = rows[0].map((header) => normalizeHeader(header));

  if (!headers.includes("company_name") || !headers.includes("segment_code") || !headers.includes("contact_name")) {
    return {
      ok: false as const,
      error: "En-tetes obligatoires manquants : entreprise, segment et contact."
    };
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim().length > 0));

  return {
    ok: true as const,
    rows: dataRows.map((row) => {
      return headers.reduce<CsvRow>((acc, header, index) => {
        acc[header] = row[index]?.trim() ?? "";
        return acc;
      }, {});
    })
  };
}

function parseCsvLines(content: string) {
  const delimiter = detectDelimiter(content);
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  rows.push(row);
  return rows;
}

function detectDelimiter(content: string) {
  const firstLine = content.split(/\r?\n/)[0] ?? "";
  return firstLine.includes(";") ? ";" : ",";
}

function normalizeHeader(value: string) {
  const normalized = normalizeValue(value).replace(/[^a-z0-9_]+/g, "_");

  for (const [key, aliases] of Object.entries(headerAliases)) {
    if ((aliases as readonly string[]).includes(normalized)) {
      return key;
    }
  }

  return normalized;
}

function validateRow(row: CsvRow, line: number, segmentByCode: Map<string, string>) {
  const companyName = row.company_name?.trim();
  const contactName = row.contact_name?.trim();
  const segmentCode = normalizeSegmentCode(row.segment_code ?? "");

  if (!companyName) {
    return { ok: false as const, error: `Ligne ${line} : entreprise obligatoire.` };
  }

  if (!contactName) {
    return { ok: false as const, error: `Ligne ${line} : contact obligatoire.` };
  }

  if (!segmentCode || !segmentCodes.includes(segmentCode)) {
    return { ok: false as const, error: `Ligne ${line} : segment invalide.` };
  }

  const segmentId = segmentByCode.get(segmentCode);

  if (!segmentId) {
    return { ok: false as const, error: `Ligne ${line} : segment absent de Supabase.` };
  }

  const formData = rowToFormData(row);
  const website = normalizeOptionalWebsite(formData, "website");
  const email = optionalEmail(formData, "email", "Email");
  const estimatedPotential = optionalNonNegativeNumber(formData, "estimated_potential", "Potentiel estime");
  const capacityFit = optionalScaleNumber(formData, "capacity_fit", "Adequation capacites");
  const recurrencePotential = optionalScaleNumber(formData, "recurrence_potential", "Recurrence potentielle");
  const needMaturity = optionalScaleNumber(formData, "need_maturity", "Maturite du besoin");
  const projectTimeline = normalizeProjectTimeline(row.project_timeline);

  if (!website.ok) return { ok: false as const, error: `Ligne ${line} : ${website.error}` };
  if (!email.ok) return { ok: false as const, error: `Ligne ${line} : ${email.error}` };
  if (!estimatedPotential.ok) return { ok: false as const, error: `Ligne ${line} : ${estimatedPotential.error}` };
  if (!capacityFit.ok) return { ok: false as const, error: `Ligne ${line} : ${capacityFit.error}` };
  if (!recurrencePotential.ok) return { ok: false as const, error: `Ligne ${line} : ${recurrencePotential.error}` };
  if (!needMaturity.ok) return { ok: false as const, error: `Ligne ${line} : ${needMaturity.error}` };
  if (!projectTimeline) return { ok: false as const, error: `Ligne ${line} : delai projet invalide.` };

  return {
    ok: true as const,
    data: {
      companyName,
      segmentId,
      contactName,
      website: website.data,
      email: email.data,
      estimatedPotential: estimatedPotential.data,
      capacityFit: capacityFit.data,
      recurrencePotential: recurrencePotential.data,
      needMaturity: needMaturity.data,
      projectTimeline,
      subSegment: optionalString(row.sub_segment),
      address: optionalString(row.address),
      city: optionalString(row.city),
      postalCode: optionalString(row.postal_code),
      contactJobTitle: optionalString(row.contact_job_title),
      phone: optionalString(row.phone),
      notes: optionalString(row.notes)
    }
  };
}

function rowToFormData(row: CsvRow) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(row)) {
    formData.set(key, value);
  }

  return formData;
}

function normalizeSegmentCode(value: string) {
  const normalized = normalizeValue(value);

  if (normalized === "1" || normalized.includes("agencement") || normalized.includes("decoratif")) {
    return "agencements_decoratifs";
  }

  if (normalized === "2" || normalized.includes("structure") || normalized.includes("mobilier")) {
    return "structures_mobilier";
  }

  if (normalized === "3" || normalized.includes("usinage") || normalized.includes("prototypage") || normalized.includes("rotomoulage")) {
    return "usinage_3d_prototypage_rotomoulage";
  }

  if (segmentCodes.includes(normalized as (typeof segmentCodes)[number])) {
    return normalized as (typeof segmentCodes)[number];
  }

  return null;
}

function normalizeProjectTimeline(value?: string) {
  const normalized = normalizeValue(value ?? "");

  if (!normalized) return "inconnu";
  if (projectTimelines.includes(normalized as (typeof projectTimelines)[number])) {
    return normalized;
  }
  if (normalized.includes("immediat")) return "immediat";
  if (normalized.includes("3")) return "moins_3_mois";
  if (normalized.includes("6")) return "moins_6_mois";
  if (normalized.includes("plus")) return "plus_6_mois";
  if (normalized.includes("inconnu")) return "inconnu";

  return null;
}

function normalizeValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function optionalString(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureUserProfile(user: {
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
    return { ok: false as const, error: "Impossible de verifier le profil utilisateur." };
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

  const { error } = await supabase.from("users").insert({
    id: user.id,
    email,
    full_name: fullName,
    role: "commercial",
    is_active: true
  });

  if (error) {
    return { ok: false as const, error: "Impossible de rattacher l'utilisateur connecte." };
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
