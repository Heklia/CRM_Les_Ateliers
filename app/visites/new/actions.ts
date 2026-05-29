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
  const budget = optionalNonNegativeNumber(formData, "budget_estime", "Budget estime");
  const followUpDate = optionalDateTime(formData, "prochaine_relance_at", "Date de relance");

  if (!prospectId.ok) return { error: prospectId.error };
  if (!visitDate.ok) return { error: visitDate.error };
  if (!contactType.ok) return { error: contactType.error };
  if (!need.ok) return { error: need.error };
  if (!nextActions.ok) return { error: nextActions.error };
  if (!interest.ok) return { error: interest.error };
  if (!budget.ok) return { error: budget.error };
  if (!followUpDate.ok) return { error: followUpDate.error };

  const validatedProspectId = prospectId.data;
  const validatedVisitDate = visitDate.data;
  const validatedContactType = contactType.data;
  const validatedNeed = need.data;
  const validatedNextActions = nextActions.data;
  const validatedInterest = interest.data;
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

  const { error: visitError } = await supabase.from("visites").insert({
    prospect_id: validatedProspectId,
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
  });

  if (visitError) {
    return { error: "Impossible d'enregistrer le compte-rendu de visite." };
  }

  const { error: updateError } = await supabase
    .from("prospects")
    .update({
      last_interaction_at: validatedVisitDate,
      interest_level: interestMap[validatedInterest]
    })
    .eq("id", validatedProspectId);

  if (updateError) {
    return {
      error: "La visite est enregistree, mais la derniere interaction du prospect n'a pas ete mise a jour."
    };
  }

  redirect("/visites");
}

function buildSummary(formData: FormData) {
  const application = optionalText(formData, "application_envisagee");
  const matter = optionalText(formData, "matiere_procede");
  const need = String(formData.get("besoins") ?? "").trim();

  return [need, application, matter].filter(Boolean).join(" | ");
}
