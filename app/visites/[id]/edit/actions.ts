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

type UpdateVisitState = {
  error?: string;
};

const interestMap = {
  froid: 1,
  tiede: 3,
  chaud: 5
} as const;
const contactTypes = ["appel", "email", "visite_terrain", "salon", "autre"] as const;
const nextActionTypes = ["appel", "email", "visite_terrain", "salon", "devis", "autre"] as const;
const interestLevels = ["froid", "tiede", "chaud"] as const;
const prospectStatuses = ["en_cours", "qualifie", "client", "perdu"] as const;

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
  const need = optionalText(formData, "besoins");
  const interest = requiredEnum(formData, "niveau_interet", "Niveau d'interet", interestLevels);
  const prospectStatus = requiredEnum(formData, "prospect_status", "Statut du prospect", prospectStatuses);
  const nextActions =
    prospectStatus.ok && prospectStatus.data === "perdu"
      ? ({ ok: true as const, data: null } as const)
      : requiredEnum(formData, "prochaine_etape", "Prochaine action", nextActionTypes);
  const budget = optionalNonNegativeNumber(formData, "budget_estime", "Budget estime");
  const followUpDate = optionalDateTime(formData, "prochaine_relance_at", "Date de relance");

  if (!visitId.ok) return { error: visitId.error };
  if (!prospectId.ok) return { error: prospectId.error };
  if (!visitDate.ok) return { error: visitDate.error };
  if (!contactType.ok) return { error: contactType.error };
  if (!nextActions.ok) return { error: nextActions.error };
  if (!interest.ok) return { error: interest.error };
  if (!prospectStatus.ok) return { error: prospectStatus.error };
  if (!budget.ok) return { error: budget.error };
  if (!followUpDate.ok) return { error: followUpDate.error };

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, commercial_id, segment_id")
    .eq("id", prospectId.data)
    .single();

  if (prospectError || !prospect) {
    return { error: "Prospect introuvable." };
  }

  if (!(await canAccessProspect(supabase, profile, prospectId.data, prospect.commercial_id))) {
    return { error: "Ce prospect n'est pas rattache au commercial connecte." };
  }

  const { data: visit, error: visitReadError } = await supabase
    .from("visites")
    .select("id, prospect_id, commercial_id")
    .eq("id", visitId.data)
    .single();

  if (
    visitReadError ||
    !visit ||
    !(await canAccessVisit(supabase, profile, visit.id, visit.prospect_id, visit.commercial_id))
  ) {
    return { error: "Visite introuvable ou non autorisee." };
  }

  const contact = await resolveActionContact(supabase, formData, {
    commercialId: prospect.commercial_id,
    prospectId: prospectId.data
  });

  if (!contact.ok) {
    return { error: contact.error };
  }

  const opportunity = await resolveActionOpportunity(supabase, formData, {
    commercialId: prospect.commercial_id,
    prospectId: prospectId.data,
    segmentId: prospect.segment_id,
    stage: prospectStatus.data === "perdu" ? "refuse" : "opportunite_detectee",
    need,
    budget: budget.data === null ? null : budget.data * 1000,
    projectDate: optionalText(formData, "delai_projet"),
    interest: interest.data
  });

  if (!opportunity.ok) {
    return { error: opportunity.error };
  }

  const { error: updateError } = await supabase
    .from("visites")
    .update({
      prospect_id: prospectId.data,
      opportunite_id: opportunity.opportunityId,
      contact_id: contact.contactId,
      commercial_id: prospect.commercial_id,
      visite_date: visitDate.data,
      type: contactType.data,
      personnes_rencontrees: optionalText(formData, "personnes_rencontrees"),
      resume: buildSummary(formData),
      besoins: need,
      freins: optionalText(formData, "freins"),
      application_envisagee: null,
      matiere_procede: optionalText(formData, "matiere_procede"),
      budget_estime: budget.data === null ? null : budget.data * 1000,
      delai_projet: optionalText(formData, "delai_projet"),
      niveau_interet: interestMap[interest.data],
      prochaine_etape: prospectStatus.data === "perdu" ? null : nextActions.data,
      prochaine_relance_at: prospectStatus.data === "perdu" ? null : followUpDate.data,
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
      interest_level: interestMap[interest.data],
      status: prospectStatus.data,
      ...(prospectStatus.data === "perdu" ? { pipeline_stage: "refuse" } : {})
    })
    .eq("id", prospectId.data);

  await supabase
    .from("actions_suivantes")
    .delete()
    .eq(prospectStatus.data === "perdu" ? "prospect_id" : "visite_id", prospectStatus.data === "perdu" ? prospectId.data : visitId.data)
    .eq("status", "a_faire");

  if (prospectStatus.data !== "perdu") {
    if (!nextActions.data) {
      return { error: "Prochaine action obligatoire." };
    }

    const { error: actionError } = await supabase.from("actions_suivantes").insert({
      prospect_id: prospectId.data,
      opportunite_id: opportunity.opportunityId,
      visite_id: visitId.data,
      commercial_id: prospect.commercial_id,
      type: toFollowUpType(nextActions.data),
      title: getContactTypeLabel(nextActions.data),
      description: optionalText(formData, "commentaire"),
      due_at: followUpDate.data ?? getDefaultFollowUpDate(visitDate.data),
      status: "a_faire",
      priority: interest.data === "chaud" ? "haute" : "normale"
    });

    if (actionError) {
      return {
        error: "La visite est modifiee, mais l'action a realiser n'a pas pu etre creee."
      };
    }
  }

  redirect("/visites");
}

async function canAccessProspect(
  supabase: any,
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  prospectId: string,
  commercialId: string
) {
  if (canAccessCommercialData(profile, commercialId)) {
    return true;
  }

  const { data } = await supabase
    .from("prospect_assignments")
    .select("prospect_id")
    .eq("prospect_id", prospectId)
    .eq("user_id", profile.id)
    .maybeSingle();

  return Boolean(data);
}

async function canAccessVisit(
  supabase: any,
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>,
  visitId: string,
  prospectId: string,
  commercialId: string
) {
  if (await canAccessProspect(supabase, profile, prospectId, commercialId)) {
    return true;
  }

  const { data } = await supabase
    .from("visite_assignments")
    .select("visite_id")
    .eq("visite_id", visitId)
    .eq("user_id", profile.id)
    .maybeSingle();

  return Boolean(data);
}

function buildSummary(formData: FormData) {
  const matter = optionalText(formData, "matiere_procede");
  const need = String(formData.get("besoins") ?? "").trim();

  return [need, matter].filter(Boolean).join(" | ") || "Action commerciale";
}

function getDefaultFollowUpDate(visitDate: string) {
  const date = new Date(visitDate);
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

function toFollowUpType(type: (typeof nextActionTypes)[number]) {
  if (type === "visite_terrain") return "visite";
  if (type === "salon") return "autre";
  return type;
}

function getContactTypeLabel(type: (typeof nextActionTypes)[number]) {
  const labels = {
    appel: "Appel",
    email: "Email",
    visite_terrain: "Visite terrain",
    salon: "Salon",
    devis: "Devis",
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
    need: string | null;
    projectDate: string | null;
    prospectId: string;
    segmentId: string;
    stage: string;
  }
) {
  const opportunityId = optionalText(formData, "opportunite_id");
  const description = optionalText(formData, "freins");
  const material = optionalText(formData, "matiere_procede");
  const hasProjectDetail = Boolean(
    context.need ||
      description ||
      material ||
      context.budget !== null ||
      context.projectDate
  );
  const payload = {
    title: context.need ?? "Projet a qualifier",
    description,
    estimated_value: context.budget,
    expected_close_date: context.projectDate,
    probability: interestMap[context.interest] * 20,
    stage: context.stage,
    won_at: null,
    lost_at: context.stage === "refuse" ? new Date().toISOString() : null,
    loss_reason: context.stage === "refuse" ? "Refuse apres action" : null
  };

  if (!opportunityId) {
    if (!hasProjectDetail) {
      return { ok: true as const, opportunityId: null };
    }

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
    .select("id, title")
    .eq("id", opportunityId)
    .eq("prospect_id", context.prospectId)
    .single();

  if (error || !opportunity) {
    return { ok: false as const, error: "L'opportunite selectionnee n'appartient pas au prospect." };
  }

  if (!hasProjectDetail) {
    return { ok: true as const, opportunityId: opportunity.id };
  }

  const { error: updateError } = await supabase
    .from("opportunites")
    .update({
      ...payload,
      title: context.need ?? opportunity.title
    })
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
