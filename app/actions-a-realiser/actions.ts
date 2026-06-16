"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canModifyData, getCurrentProfile } from "@/lib/auth/roles";
import { optionalDateTime, optionalText, requiredDateTime, requiredEnum, requiredText } from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

const actionTypes = ["appel", "email", "visite_terrain", "salon", "devis", "autre"] as const;
const priorities = ["basse", "normale", "haute"] as const;
const commercialProspectStatuses = [
  "a_qualifier",
  "interesse",
  "projet_identifie",
  "devis_a_faire",
  "devis_envoye",
  "relance_a_faire",
  "commande_gagnee",
  "perdu",
  "sans_suite_temporaire"
] as const;

type ActionState = {
  error?: string;
  success?: string;
};

export async function createCommercialActionThread(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) redirect("/login");
  if (!canModifyData(profile)) return { error: "Votre role ne permet pas de creer une fiche action." };

  const prospectId = requiredText(formData, "prospect_id", "Client");
  const contactId = requiredText(formData, "contact_id", "Contact");
  const ownerUserId = requiredText(formData, "owner_user_id", "Commercial responsable");
  const actionType = requiredEnum(formData, "current_action_type", "Action a mener", actionTypes);
  const dueDate = requiredDateTime(formData, "current_due_date", "Date d'echeance");
  const priority = requiredEnum(formData, "current_priority", "Priorite", priorities);
  const prospectStatus = requiredEnum(formData, "prospect_status", "Statut prospect", commercialProspectStatuses);

  if (!prospectId.ok) return { error: prospectId.error };
  if (!contactId.ok) return { error: contactId.error };
  if (!ownerUserId.ok) return { error: ownerUserId.error };
  if (!actionType.ok) return { error: actionType.error };
  if (!dueDate.ok) return { error: dueDate.error };
  if (!priority.ok) return { error: priority.error };
  if (!prospectStatus.ok) return { error: prospectStatus.error };

  const { error } = await supabase.from("commercial_action_threads").insert({
    prospect_id: prospectId.data,
    contact_id: contactId.data,
    owner_user_id: ownerUserId.data,
    current_action_type: actionType.data,
    current_due_date: dueDate.data,
    current_priority: priority.data,
    prospect_status: prospectStatus.data,
    current_comment: optionalText(formData, "current_comment"),
    current_status: "active"
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Une fiche action active existe deja pour ce client et ce contact." };
    }

    return { error: `Impossible de creer la fiche action : ${error.message}` };
  }

  revalidateCommercialActions();
  return { success: "Fiche action creee." };
}

export async function completeCommercialActionThread(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) redirect("/login");
  if (!canModifyData(profile)) return { error: "Votre role ne permet pas de realiser une action." };

  const threadId = requiredText(formData, "thread_id", "Fiche action");
  const completedAt = requiredDateTime(formData, "completed_at", "Date de realisation");
  const actionType = requiredEnum(formData, "action_type", "Type d'action realisee", actionTypes);
  const prospectStatus = requiredEnum(
    formData,
    "prospect_status_after_action",
    "Statut prospect apres action",
    commercialProspectStatuses
  );
  const priority = requiredEnum(formData, "priority_after_action", "Priorite", priorities);
  const nextActionType =
    prospectStatus.ok && ["perdu", "commande_gagnee"].includes(prospectStatus.data)
      ? ({ ok: true as const, data: null } as const)
      : requiredEnum(formData, "next_action_type", "Prochaine action", actionTypes);
  const nextDueDate =
    prospectStatus.ok && ["perdu", "commande_gagnee"].includes(prospectStatus.data)
      ? ({ ok: true as const, data: null } as const)
      : requiredDateTime(formData, "next_due_date", "Nouvelle echeance");

  if (!threadId.ok) return { error: threadId.error };
  if (!completedAt.ok) return { error: completedAt.error };
  if (!actionType.ok) return { error: actionType.error };
  if (!prospectStatus.ok) return { error: prospectStatus.error };
  if (!priority.ok) return { error: priority.error };
  if (!nextActionType.ok) return { error: nextActionType.error };
  if (!nextDueDate.ok) return { error: nextDueDate.error };

  const { error } = await supabase.rpc("complete_commercial_action_thread", {
    target_thread_id: threadId.data,
    completed_at_value: completedAt.data,
    action_type_value: actionType.data,
    result_value: optionalText(formData, "result"),
    report_value: optionalText(formData, "report"),
    prospect_status_after_action_value: prospectStatus.data,
    next_action_type_value: nextActionType.data,
    next_due_date_value: nextDueDate.data,
    priority_after_action_value: priority.data,
    comment_value: optionalText(formData, "current_comment")
  });

  if (error) {
    return { error: `Impossible de realiser l'action : ${error.message}` };
  }

  revalidateCommercialActions(threadId.data);
  return { success: "Action realisee et fiche mise a jour." };
}

export async function updateCurrentCommercialAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) redirect("/login");
  if (!canModifyData(profile)) return { error: "Votre role ne permet pas de modifier une fiche action." };

  const threadId = requiredText(formData, "thread_id", "Fiche action");
  const actionType = requiredEnum(formData, "current_action_type", "Action a mener", actionTypes);
  const dueDate = requiredDateTime(formData, "current_due_date", "Date d'echeance");
  const priority = requiredEnum(formData, "current_priority", "Priorite", priorities);
  const prospectStatus = requiredEnum(formData, "prospect_status", "Statut prospect", commercialProspectStatuses);

  if (!threadId.ok) return { error: threadId.error };
  if (!actionType.ok) return { error: actionType.error };
  if (!dueDate.ok) return { error: dueDate.error };
  if (!priority.ok) return { error: priority.error };
  if (!prospectStatus.ok) return { error: prospectStatus.error };

  const { error } = await supabase
    .from("commercial_action_threads")
    .update({
      current_action_type: actionType.data,
      current_due_date: dueDate.data,
      current_priority: priority.data,
      prospect_status: prospectStatus.data,
      current_comment: optionalText(formData, "current_comment")
    })
    .eq("id", threadId.data)
    .eq("current_status", "active");

  if (error) {
    return { error: `Impossible de modifier la fiche action : ${error.message}` };
  }

  revalidateCommercialActions(threadId.data);
  return { success: "Prochaine action modifiee." };
}

export async function closeCommercialActionAsLost(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) redirect("/login");
  if (!canModifyData(profile)) return { error: "Votre role ne permet pas de cloturer une fiche action." };

  const threadId = requiredText(formData, "thread_id", "Fiche action");
  const completedAt = optionalDateTime(formData, "completed_at", "Date de cloture");

  if (!threadId.ok) return { error: threadId.error };
  if (!completedAt.ok) return { error: completedAt.error };

  const closingDate = completedAt.data ?? new Date().toISOString();
  const { error } = await supabase.rpc("complete_commercial_action_thread", {
    target_thread_id: threadId.data,
    completed_at_value: closingDate,
    action_type_value: "autre",
    result_value: "Perdu",
    report_value: optionalText(formData, "closed_reason") ?? "Fiche cloturee comme perdue.",
    prospect_status_after_action_value: "perdu",
    next_action_type_value: null,
    next_due_date_value: null,
    priority_after_action_value: "normale",
    comment_value: optionalText(formData, "closed_reason")
  });

  if (error) {
    return { error: `Impossible de cloturer la fiche action : ${error.message}` };
  }

  revalidateCommercialActions(threadId.data);
  return { success: "Fiche action cloturee comme perdue." };
}

function revalidateCommercialActions(threadId?: string) {
  revalidatePath("/actions-a-realiser");
  revalidatePath("/dashboard");
  revalidatePath("/exports");

  if (threadId) {
    revalidatePath(`/actions-a-realiser/${threadId}`);
  }
}
