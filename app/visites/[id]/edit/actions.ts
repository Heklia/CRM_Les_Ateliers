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

type UpdateVisitState = {
  error?: string;
};

const interestMap = {
  froid: 1,
  tiede: 3,
  chaud: 5
} as const;
const contactTypes = ["appel", "email", "visite_terrain", "salon", "autre"] as const;
const interestLevels = ["froid", "tiede", "chaud"] as const;

export async function updateVisitReport(
  _previousState: UpdateVisitState,
  formData: FormData
): Promise<UpdateVisitState> {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const visitId = requiredText(formData, "visit_id", "Visite");
  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const visitDate = requiredDateTime(formData, "visite_date", "Date de visite");
  const contactType = requiredEnum(formData, "type", "Type de contact", contactTypes);
  const need = requiredText(formData, "besoins", "Besoin identifie");
  const nextActions = requiredText(formData, "prochaine_etape", "Prochaines actions");
  const interest = requiredEnum(formData, "niveau_interet", "Niveau d'interet", interestLevels);
  const budget = optionalNonNegativeNumber(formData, "budget_estime", "Budget estime");
  const followUpDate = optionalDateTime(formData, "prochaine_relance_at", "Date de relance");

  if (!visitId.ok) return { error: visitId.error };
  if (!prospectId.ok) return { error: prospectId.error };
  if (!visitDate.ok) return { error: visitDate.error };
  if (!contactType.ok) return { error: contactType.error };
  if (!need.ok) return { error: need.error };
  if (!nextActions.ok) return { error: nextActions.error };
  if (!interest.ok) return { error: interest.error };
  if (!budget.ok) return { error: budget.error };
  if (!followUpDate.ok) return { error: followUpDate.error };

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

  const { data: visit, error: visitReadError } = await supabase
    .from("visites")
    .select("id, commercial_id")
    .eq("id", visitId.data)
    .single();

  if (visitReadError || !visit || !canAccessCommercialData(profile, visit.commercial_id)) {
    return { error: "Visite introuvable ou non autorisee." };
  }

  const { error: updateError } = await supabase
    .from("visites")
    .update({
      prospect_id: prospectId.data,
      commercial_id: prospect.commercial_id,
      visite_date: visitDate.data,
      type: contactType.data,
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
    })
    .eq("id", visitId.data);

  if (updateError) {
    return { error: "Impossible de modifier le compte-rendu de visite." };
  }

  await supabase
    .from("prospects")
    .update({
      last_interaction_at: visitDate.data,
      interest_level: interestMap[interest.data]
    })
    .eq("id", prospectId.data);

  redirect("/visites");
}

function buildSummary(formData: FormData) {
  const application = optionalText(formData, "application_envisagee");
  const matter = optionalText(formData, "matiere_procede");
  const need = String(formData.get("besoins") ?? "").trim();

  return [need, application, matter].filter(Boolean).join(" | ");
}
