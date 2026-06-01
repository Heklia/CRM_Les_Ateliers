"use server";

import { redirect } from "next/navigation";
import { canAccessCommercialData, getCurrentProfile } from "@/lib/auth/roles";
import {
  optionalDateTime,
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
const prospectStatuses = ["nouveau", "a_qualifier", "qualifie", "contacte", "en_cours", "client", "perdu"] as const;

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
  const nextActions = requiredText(formData, "prochaine_etape", "Prochaines actions");
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
  const validatedBudget = budget.data;
  const validatedFollowUpDate = followUpDate.data;

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, commercial_id")
    .eq("id", validatedProspectId)
    .single();

  if (prospectError || !prospect) {
    return { error: "Prospect introuvable." };
  }

  if (!canAccessCommercialData(profile, prospect.commercial_id)) {
    return { error: "Ce prospect n'est pas rattache au commercial connecte." };
  }

  const { data: visit, error: visitError } = await supabase.from("visites").insert({
    prospect_id: validatedProspectId,
    contact_id: optionalText(formData, "contact_id"),
    commercial_id: prospect.commercial_id,
    visite_date: validatedVisitDate,
    type: validatedContactType,
    statut: "realisee",
    personnes_rencontrees: optionalText(formData, "personnes_rencontrees"),
    resume: buildSummary(formData),
    besoins: validatedNeed,
    freins: optionalText(formData, "freins"),
    application_envisagee: optionalText(formData, "application_envisagee"),
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
      visite_id: visit.id,
      commercial_id: prospect.commercial_id,
      type: toFollowUpType(validatedContactType),
      title: validatedNextActions,
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
  const application = optionalText(formData, "application_envisagee");
  const matter = optionalText(formData, "matiere_procede");
  const need = String(formData.get("besoins") ?? "").trim();

  return [need, application, matter].filter(Boolean).join(" | ");
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
