"use server";

import { redirect } from "next/navigation";
import { canAccessCommercialData, getCurrentProfile } from "@/lib/auth/roles";
import {
  optionalDateTime,
  optionalEmail,
  optionalNonNegativeNumber,
  optionalText,
  requiredDateTime,
  requiredEnum,
  requiredText
} from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

type CreateVisitState = {
  error?: string;
};

const interestMap = {
  froid: 1,
  tiede: 3,
  chaud: 5
} as const;
const contactTypes = ["appel", "email", "visite_terrain", "salon", "autre"] as const;
const interestLevels = ["froid", "tiede", "chaud"] as const;
const prospectStatuses = ["en_cours", "qualifie", "client", "perdu"] as const;

export async function createVisitReport(
  _previousState: CreateVisitState,
  formData: FormData
): Promise<CreateVisitState> {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const visitDate = requiredDateTime(formData, "visite_date", "Date de visite");
  const contactType = requiredEnum(formData, "type", "Type de contact", contactTypes);
  const need = requiredText(formData, "besoins", "Besoin identifie");
  const nextActions = requiredEnum(formData, "prochaine_etape", "Prochaine action", contactTypes);
  const interest = requiredEnum(formData, "niveau_interet", "Niveau d'interet", interestLevels);
  const prospectStatus = requiredEnum(formData, "prospect_status", "Statut du prospect", prospectStatuses);
  const budget = optionalNonNegativeNumber(formData, "budget_estime", "Budget estime");
  const followUpDate = optionalDateTime(formData, "prochaine_relance_at", "Date de relance");

  if (!prospectId.ok) return { error: prospectId.error };
  if (!visitDate.ok) return { error: visitDate.error };
  if (!contactType.ok) return { error: contactType.error };
  if (!need.ok) return { error: need.error };
  if (!nextActions.ok) return { error: nextActions.error };
  if (!interest.ok) return { error: interest.error };
  if (!prospectStatus.ok) return { error: prospectStatus.error };
  if (!budget.ok) return { error: budget.error };
  if (!followUpDate.ok) return { error: followUpDate.error };

  const validatedProspectId = prospectId.data;
  const validatedVisitDate = visitDate.data;
  const validatedContactType = contactType.data;
  const validatedNeed = need.data;
  const validatedNextActions = nextActions.data;
  const validatedInterest = interest.data;
  const validatedProspectStatus = prospectStatus.data;
  const validatedBudget = budget.data === null ? null : budget.data * 1000;
  const validatedFollowUpDate = followUpDate.data;

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, commercial_id, segment_id")
    .eq("id", validatedProspectId)
    .single();

  if (prospectError || !prospect) {
    return { error: "Prospect introuvable." };
  }

  if (!canAccessCommercialData(profile, prospect.commercial_id)) {
    return { error: "Ce prospect n'est pas rattache au commercial connecte." };
  }

  const contact = await resolveActionContact(supabase, formData, {
    commercialId: prospect.commercial_id,
    prospectId: validatedProspectId
  });

  if (!contact.ok) {
    return { error: contact.error };
  }

  const opportunity = await resolveActionOpportunity(supabase, formData, {
    commercialId: prospect.commercial_id,
    prospectId: validatedProspectId,
    segmentId: prospect.segment_id,
    stage: validatedProspectStatus === "perdu" ? "perdu" : "opportunite_detectee",
    need: validatedNeed,
    budget: validatedBudget,
    projectDate: optionalText(formData, "delai_projet"),
    interest: validatedInterest
  });

  if (!opportunity.ok) {
    return { error: opportunity.error };
  }

  const { data: visit, error: visitError } = await supabase.from("visites").insert({
    prospect_id: validatedProspectId,
    opportunite_id: opportunity.opportunityId,
    contact_id: contact.contactId,
    commercial_id: prospect.commercial_id,
    visite_date: validatedVisitDate,
    type: validatedContactType,
    statut: "realisee",
    personnes_rencontrees: optionalText(formData, "personnes_rencontrees"),
    resume: buildSummary(formData),
    besoins: validatedNeed,
    freins: optionalText(formData, "freins"),
    application_envisagee: null,
    matiere_procede: optionalText(formData, "matiere_procede"),
    budget_estime: validatedBudget,
    delai_projet: optionalText(formData, "delai_projet"),
    niveau_interet: interestMap[validatedInterest],
    prochaine_etape: validatedNextActions,
    prochaine_relance_at: validatedFollowUpDate,
    commentaire: optionalText(formData, "commentaire")
  }).select("id").single();

  if (visitError) {
    return { error: "Impossible d'enregistrer le compte-rendu de visite." };
  }

  const prospectUpdate = {
    last_interaction_at: validatedVisitDate,
    interest_level: interestMap[validatedInterest],
    status: validatedProspectStatus,
    ...(validatedProspectStatus === "perdu" ? { pipeline_stage: "perdu" } : {})
  };

  const { error: updateError } = await supabase
    .from("prospects")
    .update(prospectUpdate)
    .eq("id", validatedProspectId);

  if (updateError) {
    return {
      error: "La visite est enregistree, mais la derniere interaction du prospect n'a pas ete mise a jour."
    };
  }

  if (validatedProspectStatus !== "perdu") {
    const { error: actionError } = await supabase.from("actions_suivantes").insert({
      prospect_id: validatedProspectId,
      opportunite_id: opportunity.opportunityId,
      visite_id: visit.id,
      commercial_id: prospect.commercial_id,
      type: toFollowUpType(validatedNextActions),
      title: getContactTypeLabel(validatedNextActions),
      description: optionalText(formData, "commentaire"),
      due_at: validatedFollowUpDate ?? getDefaultFollowUpDate(validatedVisitDate),
      status: "a_faire",
      priority: validatedInterest === "chaud" ? "haute" : "normale"
    });

    if (actionError) {
      return {
        error: "L'action est enregistree, mais l'action a realiser n'a pas pu etre creee."
      };
    }
  }

  redirect("/visites");
}

function buildSummary(formData: FormData) {
  const matter = optionalText(formData, "matiere_procede");
  const need = String(formData.get("besoins") ?? "").trim();

  return [need, matter].filter(Boolean).join(" | ");
}

function getDefaultFollowUpDate(visitDate: string) {
  const date = new Date(visitDate);
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

function toFollowUpType(type: (typeof contactTypes)[number]) {
  if (type === "visite_terrain") return "visite";
  if (type === "salon") return "autre";
  return type;
}

function getContactTypeLabel(type: (typeof contactTypes)[number]) {
  const labels = {
    appel: "Appel",
    email: "Email",
    visite_terrain: "Visite terrain",
    salon: "Salon",
    autre: "Autre"
  };

  return labels[type];
}

async function resolveActionOpportunity(
  supabase: any,
  formData: FormData,
  context: {
    budget: number | null;
    commercialId: string;
    interest: keyof typeof interestMap;
    need: string;
    projectDate: string | null;
    prospectId: string;
    segmentId: string;
    stage: string;
  }
) {
  const opportunityId = optionalText(formData, "opportunite_id");
  const payload = {
    title: context.need,
    description: optionalText(formData, "freins"),
    estimated_value: context.budget,
    expected_close_date: context.projectDate,
    probability: interestMap[context.interest] * 20,
    stage: context.stage,
    won_at: null,
    lost_at: context.stage === "perdu" ? new Date().toISOString() : null,
    loss_reason: context.stage === "perdu" ? "Perdu apres action" : null
  };

  if (!opportunityId) {
    const { data: opportunity, error } = await supabase
      .from("opportunites")
      .insert({
        prospect_id: context.prospectId,
        commercial_id: context.commercialId,
        segment_id: context.segmentId,
        ...payload
      })
      .select("id")
      .single();

    if (error || !opportunity) {
      return { ok: false as const, error: "Impossible de creer l'opportunite depuis le detail du projet." };
    }

    return { ok: true as const, opportunityId: opportunity.id };
  }

  const { data: opportunity, error } = await supabase
    .from("opportunites")
    .select("id")
    .eq("id", opportunityId)
    .eq("prospect_id", context.prospectId)
    .single();

  if (error || !opportunity) {
    return { ok: false as const, error: "L'opportunite selectionnee n'appartient pas au prospect." };
  }

  const { error: updateError } = await supabase
    .from("opportunites")
    .update(payload)
    .eq("id", opportunity.id);

  if (updateError) {
    return { ok: false as const, error: "Impossible de mettre a jour l'opportunite liee." };
  }

  return { ok: true as const, opportunityId: opportunity.id };
}

async function resolveActionContact(
  supabase: any,
  formData: FormData,
  context: { commercialId: string; prospectId: string }
) {
  const rawContactId = optionalText(formData, "contact_id");

  if (!rawContactId) {
    return { ok: true as const, contactId: null };
  }

  if (rawContactId !== "__new__") {
    const { data: contact, error } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", rawContactId)
      .eq("prospect_id", context.prospectId)
      .single();

    if (error || !contact) {
      return { ok: false as const, error: "La personne concernee n'appartient pas au prospect selectionne." };
    }

    return { ok: true as const, contactId: contact.id };
  }

  const contactName = requiredText(formData, "new_contact_name", "Nom du nouveau contact");
  const contactEmail = optionalEmail(formData, "new_contact_email", "Email du nouveau contact");

  if (!contactName.ok) return { ok: false as const, error: contactName.error };
  if (!contactEmail.ok) return { ok: false as const, error: contactEmail.error };

  const { firstName, lastName } = splitContactName(contactName.data);
  const { data: createdContact, error } = await supabase
    .from("contacts")
    .insert({
      prospect_id: context.prospectId,
      commercial_id: context.commercialId,
      first_name: firstName,
      last_name: lastName,
      job_title: optionalText(formData, "new_contact_job_title"),
      phone: optionalText(formData, "new_contact_phone"),
      email: contactEmail.data,
      is_primary: false
    })
    .select("id")
    .single();

  if (error || !createdContact) {
    return { ok: false as const, error: "Impossible de creer le nouveau contact." };
  }

  return { ok: true as const, contactId: createdContact.id };
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
