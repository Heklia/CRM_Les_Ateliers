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

type UserRow = {
  id: string;
  full_name: string;
  representative_code: string | null;
};

const headerAliases = {
  representative_code: ["code_representant", "code_représentant", "representant"],
  quote_code: ["code_devis", "devis"],
  quote_date: ["date"],
  follow_up_date: ["date_de_relance_a_realiser", "date_de_relance_à_réaliser", "relance"],
  state: ["etat", "état", "statut"],
  probability: ["taux_de_concretisation", "taux_de_concrétisation", "probabilite"],
  company_name: ["entreprise_ou_nom_client", "entreprise", "nom_client", "company_name", "societe"],
  title: ["sujet", "opportunite", "titre", "title"],
  total_time: ["temps_total"],
  total_cost: ["debourse_total", "déboursé_total"],
  estimated_value: ["total_ht_net", "total_ht", "montant", "montant_eur", "estimated_value"],
  concretized_at: ["date_de_concretisation", "date_de_concrétisation"],
  phone: ["telephone", "téléphone", "phone"],
  postal_code: ["code_postal", "postal_code", "cp"],
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

  const [
    { data: prospects, error: prospectError },
    { data: segments, error: segmentError },
    usersResult
  ] =
    await Promise.all([
      supabase.from("prospects").select("id, company_name, postal_code, commercial_id, segment_id"),
      supabase.from("segments").select("id, code"),
      fetchUsersWithRepresentativeCodes(supabase)
    ]);

  if (prospectError || !prospects) {
    return { error: "Impossible de lire les prospects dans Supabase." };
  }

  if (segmentError || !segments) {
    return { error: "Impossible de lire les segments dans Supabase." };
  }

  if (usersResult.error) {
    return { error: usersResult.error };
  }

  const prospectRows = (prospects ?? []) as ProspectRow[];
  const prospectByKey = new Map(
    prospectRows.map((prospect) => [
      buildProspectKey(prospect.company_name, prospect.postal_code),
      prospect
    ])
  );
  const prospectsByCompany = groupProspectsByCompany(prospectRows);
  const segmentByCode = new Map(
    ((segments ?? []) as SegmentRow[]).map((segment) => [segment.code, segment.id])
  );
  const userByRepresentativeCode = new Map(
    usersResult.data
      .filter((user) => user.representative_code)
      .map((user) => [normalizeRepresentativeCode(user.representative_code), user])
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

    const representative = validated.data.representativeCode
      ? userByRepresentativeCode.get(normalizeRepresentativeCode(validated.data.representativeCode))
      : null;
    const prospectMatch = findProspectForQuote(
      prospectByKey,
      prospectsByCompany,
      validated.data.companyName,
      validated.data.postalCode
    );

    if (validated.data.representativeCode && !representative) {
      details.push(`Ligne ${line} : code representant inconnu (${validated.data.representativeCode}).`);
      continue;
    }

    if (!prospectMatch.ok) {
      details.push(`Ligne ${line} : ${prospectMatch.error}`);
      continue;
    }

    const prospect = prospectMatch.prospect;
    const segmentId = validated.data.segmentCode
      ? segmentByCode.get(validated.data.segmentCode) ?? prospect.segment_id
      : prospect.segment_id;
    const existing = await findExistingOpportunity(supabase, prospect.id, validated.data.title);
    const commercialId = representative?.id ?? prospect.commercial_id;
    const payload = {
      prospect_id: prospect.id,
      commercial_id: commercialId,
      segment_id: segmentId,
      title: validated.data.title,
      description: validated.data.description,
      stage: validated.data.stage,
      estimated_value: validated.data.estimatedValue,
      probability: validated.data.probability,
      expected_close_date: toDateColumn(validated.data.expectedCloseDate),
      won_at: validated.data.stage === "gagne" ? validated.data.concretizedAt ?? new Date().toISOString() : null,
      lost_at: validated.data.stage === "perdu" ? new Date().toISOString() : null,
      loss_reason: validated.data.stage === "perdu" ? "Import devis" : null
    };

    const saveResult = existing
      ? await supabase.from("opportunites").update(payload).eq("id", existing.id).select("id").single()
      : await supabase.from("opportunites").insert(payload).select("id").single();

    if (saveResult.error) {
      details.push(`Ligne ${line} : import impossible (${saveResult.error.message}).`);
      continue;
    }

    const opportunityId = (saveResult.data as { id: string } | null)?.id ?? existing?.id ?? null;

    const prospectUpdate: Record<string, string> = {
      pipeline_stage: validated.data.stage,
      status: prospectStatusByStage(validated.data.stage),
      commercial_id: commercialId
    };

    if (validated.data.quoteDate) {
      prospectUpdate.last_interaction_at = validated.data.quoteDate;
    }

    await supabase
      .from("prospects")
      .update(prospectUpdate)
      .eq("id", prospect.id);

    if (validated.data.followUpDate) {
      await createFollowUpThread(supabase, {
        commercialId,
        dueAt: validated.data.followUpDate,
        opportunityId,
        prospectId: prospect.id,
        title: validated.data.title
      });
    }

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

function groupProspectsByCompany(prospects: ProspectRow[]) {
  const grouped = new Map<string, ProspectRow[]>();

  prospects.forEach((prospect) => {
    const key = normalizeProspectDuplicateKey(prospect.company_name);
    grouped.set(key, [...(grouped.get(key) ?? []), prospect]);
  });

  return grouped;
}

function findProspectForQuote(
  prospectByKey: Map<string, ProspectRow>,
  prospectsByCompany: Map<string, ProspectRow[]>,
  companyName: string,
  postalCode: string | null
) {
  if (postalCode) {
    const prospect = prospectByKey.get(buildProspectKey(companyName, postalCode));

    return prospect
      ? { ok: true as const, prospect }
      : {
          ok: false as const,
          error: `prospect introuvable pour ${companyName} / ${postalCode}.`
        };
  }

  const matches = prospectsByCompany.get(normalizeProspectDuplicateKey(companyName)) ?? [];

  if (matches.length === 1) {
    return { ok: true as const, prospect: matches[0] };
  }

  if (matches.length > 1) {
    return {
      ok: false as const,
      error: `plusieurs prospects nommes ${companyName}. Ajoutez une colonne code_postal au CSV pour choisir le bon.`
    };
  }

  return {
    ok: false as const,
    error: `prospect introuvable pour ${companyName}.`
  };
}

async function fetchUsersWithRepresentativeCodes(supabase: any) {
  const result = await supabase
    .from("users")
    .select("id, full_name, representative_code");

  if (!isMissingRepresentativeCodeError(result.error)) {
    return {
      data: ((result.data ?? []) as UserRow[]),
      error: null
    };
  }

  const fallback = await supabase
    .from("users")
    .select("id, full_name");

  if (fallback.error) {
    return {
      data: [] as UserRow[],
      error: `Impossible de lire les utilisateurs : ${fallback.error.message}`
    };
  }

  return {
    data: ((fallback.data ?? []) as Omit<UserRow, "representative_code">[]).map((user) => ({
      ...user,
      representative_code: null
    })),
    error: null
  };
}

async function createFollowUpThread(
  supabase: any,
  followUp: {
    commercialId: string;
    dueAt: string;
    opportunityId: string | null;
    prospectId: string;
    title: string;
  }
) {
  const { error } = await supabase.from("commercial_action_threads").insert({
    prospect_id: followUp.prospectId,
    contact_id: null,
    owner_user_id: followUp.commercialId,
    current_action_type: "devis",
    current_due_date: followUp.dueAt,
    current_priority: "normale",
    current_status: "active",
    prospect_status: "relance_a_faire",
    current_comment: `Relance devis : ${followUp.title}`
  });

  if (!error || error.code === "23505") {
    return;
  }

  await supabase.from("actions_suivantes").insert({
    prospect_id: followUp.prospectId,
    opportunite_id: followUp.opportunityId,
    commercial_id: followUp.commercialId,
    type: "devis",
    title: `Relance devis : ${followUp.title}`,
    due_at: followUp.dueAt,
    status: "a_faire",
    priority: "normale"
  });
}

function validateQuoteRow(row: CsvRow, line: number) {
  const companyName = row.company_name?.trim();
  const quoteCode = row.quote_code?.trim();
  const subject = row.title?.trim();
  const title = [quoteCode, subject].filter(Boolean).join(" - ") || quoteCode || subject;
  const stage = normalizeStage(row.state);
  const probability = parsePercent(row.probability);
  const estimatedValue = parseAmount(row.estimated_value);
  const quoteDate = normalizeDate(row.quote_date);
  const followUpDate = normalizeDate(row.follow_up_date);
  const concretizedAt = normalizeDate(row.concretized_at);
  const segmentCode = normalizeSegmentCode(row.segment_code);

  if (!companyName) return { ok: false as const, error: `Ligne ${line} : entreprise obligatoire.` };
  if (!quoteCode && !subject) return { ok: false as const, error: `Ligne ${line} : code devis ou sujet obligatoire.` };
  if (!stage) return { ok: false as const, error: `Ligne ${line} : statut pipeline invalide.` };
  if (probability === null) return { ok: false as const, error: `Ligne ${line} : probabilite invalide.` };
  if (estimatedValue === null) return { ok: false as const, error: `Ligne ${line} : montant invalide.` };
  if (quoteDate === false) return { ok: false as const, error: `Ligne ${line} : date invalide.` };
  if (followUpDate === false) return { ok: false as const, error: `Ligne ${line} : date de relance invalide.` };
  if (concretizedAt === false) return { ok: false as const, error: `Ligne ${line} : date de concretisation invalide.` };
  if (segmentCode === false) return { ok: false as const, error: `Ligne ${line} : segment invalide.` };

  return {
    ok: true as const,
    data: {
      companyName,
      postalCode: optionalString(row.postal_code),
      title,
      estimatedValue,
      probability,
      expectedCloseDate: stage === "gagne"
        ? concretizedAt ?? followUpDate ?? quoteDate
        : followUpDate ?? quoteDate ?? concretizedAt,
      quoteDate,
      followUpDate,
      concretizedAt,
      stage,
      segmentCode,
      representativeCode: optionalString(row.representative_code),
      description: buildDescription(row, quoteCode, subject)
    }
  };
}

function parseCsv(content: string) {
  const rows = parseCsvLines(content.replace(/^\uFEFF/, "").trim());

  if (rows.length < 2) {
    return { ok: false as const, error: "Le CSV doit contenir une ligne d'en-tetes et au moins une ligne de donnees." };
  }

  const headers = rows[0].map((header) => normalizeHeader(header));

  if (!headers.includes("company_name") || (!headers.includes("quote_code") && !headers.includes("title"))) {
    return {
      ok: false as const,
      error: "En-tetes obligatoires manquants : entreprise et code devis ou sujet."
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
  const normalized = normalizeValue(value)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

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
  return normalized.includes("T") ? new Date(normalized).toISOString() : `${normalized.slice(0, 10)}T00:00:00.000Z`;
}

function toDateColumn(value: string | null) {
  return value ? value.slice(0, 10) : null;
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

function normalizeRepresentativeCode(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function buildDescription(row: CsvRow, quoteCode?: string, subject?: string) {
  const items = [
    optionalString(row.description),
    quoteCode ? `Code devis : ${quoteCode}` : null,
    subject ? `Sujet : ${subject}` : null,
    optionalString(row.quote_date) ? `Date devis : ${row.quote_date}` : null,
    optionalString(row.total_time) ? `Temps total : ${row.total_time}` : null,
    optionalString(row.total_cost) ? `Debourse total : ${row.total_cost}` : null,
    optionalString(row.phone) ? `Telephone : ${row.phone}` : null
  ].filter(Boolean);

  return items.length ? items.join("\n") : null;
}

function isMissingRepresentativeCodeError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";
  return code === "42703" || message.includes("representative_code");
}

function prospectStatusByStage(stage: OpportunityStage) {
  if (stage === "gagne") return "client";
  if (stage === "perdu") return "perdu";
  if (stage === "opportunite_detectee") return "qualifie";
  if (stage === "contact_etabli") return "contacte";
  return "en_cours";
}
