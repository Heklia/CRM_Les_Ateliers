"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/roles";
import { opportunityStages, segmentLabels } from "@/lib/constants";
import { normalizeProspectDuplicateKey } from "@/lib/prospects/duplicate-check";
import { createClient } from "@/lib/supabase/server";
import type { OpportunityStage, SegmentCode } from "@/lib/types";

type ImportQuotesState = {
  error?: string;
  success?: string;
  details?: string[];
};

type CsvRow = Record<string, string>;

type ProspectRow = {
  id: string;
  company_name: string;
  postal_code: string | null;
  commercial_id: string;
  segment_id: string;
};

type SegmentRow = {
  id: string;
  code: string;
};

const headerAliases = {
  company_name: ["entreprise", "company_name", "nom_entreprise", "societe"],
  postal_code: ["code_postal", "postal_code", "cp"],
  title: ["devis", "opportunite", "titre", "title", "nom_devis"],
  estimated_value: ["montant", "montant_eur", "estimated_value", "valeur", "ca"],
  probability: ["probabilite", "probability", "interet", "pourcentage"],
  expected_close_date: ["date_projet", "date_prevue", "expected_close_date", "echeance"],
  stage: ["statut", "stage", "pipeline", "etape"],
  segment_code: ["segment", "segment_code", "segment_marche"],
  description: ["description", "commentaire", "details"]
} as const;

export async function importQuotes(
  _previousState: ImportQuotesState,
  formData: FormData
): Promise<ImportQuotesState> {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    return { error: "Seul un admin peut importer des devis." };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Ajoutez un fichier CSV a importer." };
  }

  if (file.size > 1024 * 1024) {
    return { error: "Le fichier est trop volumineux. Limite conseillee : 1 Mo." };
  }

  const parsed = parseCsv(await file.text());

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  if (parsed.rows.length > 500) {
    return { error: "Import limite a 500 devis par fichier pour ce MVP." };
  }

  const [{ data: prospects, error: prospectError }, { data: segments, error: segmentError }] =
    await Promise.all([
      supabase.from("prospects").select("id, company_name, postal_code, commercial_id, segment_id"),
      supabase.from("segments").select("id, code")
    ]);

  if (prospectError || !prospects) {
    return { error: "Impossible de lire les prospects dans Supabase." };
  }

  if (segmentError || !segments) {
    return { error: "Impossible de lire les segments dans Supabase." };
  }

  const prospectByKey = new Map(
    ((prospects ?? []) as ProspectRow[]).map((prospect) => [
      buildProspectKey(prospect.company_name, prospect.postal_code),
      prospect
    ])
  );
  const segmentByCode = new Map(
    ((segments ?? []) as SegmentRow[]).map((segment) => [segment.code, segment.id])
  );

  let created = 0;
  let updated = 0;
  const details: string[] = [];

  for (const [index, row] of parsed.rows.entries()) {
    const line = index + 2;
    const validated = validateQuoteRow(row, line);

    if (!validated.ok) {
      details.push(validated.error);
      continue;
    }

    const prospect = prospectByKey.get(
      buildProspectKey(validated.data.companyName, validated.data.postalCode)
    );

    if (!prospect) {
      details.push(`Ligne ${line} : prospect introuvable pour ${validated.data.companyName} / ${validated.data.postalCode ?? "sans code postal"}.`);
      continue;
    }

    const segmentId = validated.data.segmentCode
      ? segmentByCode.get(validated.data.segmentCode) ?? prospect.segment_id
      : prospect.segment_id;
    const existing = await findExistingOpportunity(supabase, prospect.id, validated.data.title);
    const payload = {
      prospect_id: prospect.id,
      commercial_id: prospect.commercial_id,
      segment_id: segmentId,
      title: validated.data.title,
      description: validated.data.description,
      stage: validated.data.stage,
      estimated_value: validated.data.estimatedValue,
      probability: validated.data.probability,
      expected_close_date: validated.data.expectedCloseDate,
      won_at: validated.data.stage === "gagne" ? new Date().toISOString() : null,
      lost_at: validated.data.stage === "perdu" ? new Date().toISOString() : null,
      loss_reason: validated.data.stage === "perdu" ? "Import devis" : null
    };

    const { error } = existing
      ? await supabase.from("opportunites").update(payload).eq("id", existing.id)
      : await supabase.from("opportunites").insert(payload);

    if (error) {
      details.push(`Ligne ${line} : import impossible (${error.message}).`);
      continue;
    }

    await supabase
      .from("prospects")
      .update({
        pipeline_stage: validated.data.stage,
        status: prospectStatusByStage(validated.data.stage)
      })
      .eq("id", prospect.id);

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  if (created + updated === 0) {
    return {
      error: "Aucun devis importe.",
      details: details.slice(0, 12)
    };
  }

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/exports");

  return {
    success: `${created} devis cree(s), ${updated} devis mis a jour.`,
    details: details.slice(0, 12)
  };
}

async function findExistingOpportunity(supabase: any, prospectId: string, title: string) {
  const { data } = await supabase
    .from("opportunites")
    .select("id, title")
    .eq("prospect_id", prospectId);

  return ((data ?? []) as { id: string; title: string }[]).find(
    (opportunity) =>
      normalizeProspectDuplicateKey(opportunity.title) === normalizeProspectDuplicateKey(title)
  ) ?? null;
}

function validateQuoteRow(row: CsvRow, line: number) {
  const companyName = row.company_name?.trim();
  const title = row.title?.trim();
  const stage = normalizeStage(row.stage);
  const probability = parsePercent(row.probability);
  const estimatedValue = parseAmount(row.estimated_value);
  const expectedCloseDate = normalizeDate(row.expected_close_date);
  const segmentCode = normalizeSegmentCode(row.segment_code);

  if (!companyName) return { ok: false as const, error: `Ligne ${line} : entreprise obligatoire.` };
  if (!title) return { ok: false as const, error: `Ligne ${line} : nom du devis obligatoire.` };
  if (!stage) return { ok: false as const, error: `Ligne ${line} : statut pipeline invalide.` };
  if (probability === null) return { ok: false as const, error: `Ligne ${line} : probabilite invalide.` };
  if (estimatedValue === null) return { ok: false as const, error: `Ligne ${line} : montant invalide.` };
  if (expectedCloseDate === false) return { ok: false as const, error: `Ligne ${line} : date projet invalide.` };
  if (segmentCode === false) return { ok: false as const, error: `Ligne ${line} : segment invalide.` };

  return {
    ok: true as const,
    data: {
      companyName,
      postalCode: optionalString(row.postal_code),
      title,
      estimatedValue,
      probability,
      expectedCloseDate,
      stage,
      segmentCode,
      description: optionalString(row.description)
    }
  };
}

function parseCsv(content: string) {
  const rows = parseCsvLines(content.replace(/^\uFEFF/, "").trim());

  if (rows.length < 2) {
    return { ok: false as const, error: "Le CSV doit contenir une ligne d'en-tetes et au moins une ligne de donnees." };
  }

  const headers = rows[0].map((header) => normalizeHeader(header));

  if (!headers.includes("company_name") || !headers.includes("title")) {
    return {
      ok: false as const,
      error: "En-tetes obligatoires manquants : entreprise et devis."
    };
  }

  return {
    ok: true as const,
    rows: rows.slice(1)
      .filter((row) => row.some((cell) => cell.trim().length > 0))
      .map((row) =>
        headers.reduce<CsvRow>((acc, header, index) => {
          acc[header] = row[index]?.trim() ?? "";
          return acc;
        }, {})
      )
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
      if (char === "\r" && next === "\n") index += 1;
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

function normalizeStage(value?: string): OpportunityStage {
  const normalized = normalizeValue(value ?? "");

  if (!normalized) return "devis_envoye";
  if (opportunityStages.includes(normalized as OpportunityStage)) return normalized as OpportunityStage;
  if (normalized.includes("faire")) return "devis_a_faire";
  if (normalized.includes("envoye") || normalized.includes("devis")) return "devis_envoye";
  if (normalized.includes("gagne") || normalized.includes("commande")) return "gagne";
  if (normalized.includes("perdu")) return "perdu";
  if (normalized.includes("opportunite")) return "opportunite_detectee";
  if (normalized.includes("rdv")) return "rdv_realise";
  if (normalized.includes("contact")) return "contact_etabli";
  return "devis_envoye";
}

function normalizeSegmentCode(value?: string) {
  const normalized = normalizeValue(value ?? "");
  if (!normalized) return null;

  if ((Object.keys(segmentLabels) as SegmentCode[]).includes(normalized as SegmentCode)) {
    return normalized as SegmentCode;
  }

  if (normalized.includes("bardage")) return "bardage_decoratif";
  if (normalized.includes("agencement")) return "autres_agencements";
  if (normalized.includes("structure") || normalized.includes("mobilier")) return "structure_mobilier";
  if (normalized.includes("usinage")) return "usinage_3d";
  if (normalized.includes("conception")) return "co_conception";
  if (normalized.includes("nautisme")) return "nautisme";
  if (normalized.includes("industri")) return "pieces_industrielles";
  return false;
}

function normalizeDate(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const normalized = match ? `${match[3]}-${match[2]}-${match[1]}` : trimmed;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return false;
  return normalized.slice(0, 10);
}

function parseAmount(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parsePercent(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return 50;

  const parsed = Number(trimmed.replace("%", "").replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function optionalString(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function buildProspectKey(companyName: string, postalCode: string | null) {
  return `${normalizeProspectDuplicateKey(companyName)}::${normalizeProspectDuplicateKey(postalCode)}`;
}

function prospectStatusByStage(stage: OpportunityStage) {
  if (stage === "gagne") return "client";
  if (stage === "perdu") return "perdu";
  if (stage === "opportunite_detectee") return "qualifie";
  if (stage === "contact_etabli") return "contacte";
  return "en_cours";
}
