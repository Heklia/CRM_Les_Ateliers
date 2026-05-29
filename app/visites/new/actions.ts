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
  const supabase = createClient();
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

  for (const result of [prospectId, visitDate, contactType, need, nextActions, interest, budget, followUpDate]) {
    if (!result.ok) {
      return { error: result.error };
    }
  }

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, commercial_id")
    .eq("id", prospectId.data)
    .single();

  if (prospectError || !prospect) {
    return { error: "Prospect introuvable." };
  }

  if (!canAccessCommercialData(profile, prospect.commercial_id)) {
    return { error: "Ce prospect n'est pas rattache au commercial connecte." };
  }

  const { error: visitError } = await supabase.from("visites").insert({
    prospect_id: prospectId.data,
    commercial_id: prospect.commercial_id,
    visite_date: visitDate.data,
    type: contactType.data,
    statut: "realisee",
    personnes_rencontrees: optionalText(formData, "personnes_rencontrees"),
    resume: buildSummary(formData),
    besoins: need.data,
    freins: optionalText(formData, "freins"),
    application_envisagee: optionalText(formData, "application_envisagee"),
    matiere_procede: optionalText(formData, "matiere_procede"),
    budget_estime: budget.data,
    delai_projet: optionalText(formData, "delai_projet"),
    niveau_interet: interestMap[interest.data],
    prochaine_etape: nextActions.data,
    prochaine_relance_at: followUpDate.data,
    commentaire: optionalText(formData, "commentaire")
  });

  if (visitError) {
    return { error: "Impossible d'enregistrer le compte-rendu de visite." };
  }

  const { error: updateError } = await supabase
    .from("prospects")
    .update({
      last_interaction_at: visitDate.data,
      interest_level: interestMap[interest.data]
    })
    .eq("id", prospectId.data);

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
