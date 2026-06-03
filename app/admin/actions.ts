"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, type AppRole } from "@/lib/auth/roles";
import { optionalText, requiredEnum, requiredText } from "@/lib/forms/validation";

type AdminUserState = {
  error?: string;
  success?: string;
};

const roles = ["lecteur", "modification", "admin"] as const;

export async function createUser(
  _previousState: AdminUserState,
  formData: FormData
): Promise<AdminUserState> {
  const access = await ensureAdminAccess();
  if (!access.ok) return { error: access.error };

  const email = requiredText(formData, "email", "Email");
  const fullName = requiredText(formData, "full_name", "Nom");
  const password = requiredText(formData, "password", "Mot de passe temporaire");
  const role = requiredEnum(formData, "role", "Role", roles);

  if (!email.ok) return { error: email.error };
  if (!fullName.ok) return { error: fullName.error };
  if (!password.ok) return { error: password.error };
  if (!role.ok) return { error: role.error };

  const admin = createAdminClient();
  if (!admin) return missingServiceRoleError();

  const { data, error } = await admin.auth.admin.createUser({
    email: email.data,
    password: password.data,
    email_confirm: true,
    user_metadata: { full_name: fullName.data }
  });

  if (error || !data.user) {
    const existingUser = error?.message.toLowerCase().includes("already been registered")
      ? await findAuthUserByEmail(admin, email.data)
      : null;

    if (!existingUser) {
      return { error: `Impossible de creer l'utilisateur Auth : ${error?.message ?? "erreur inconnue"}` };
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
      password: password.data,
      email_confirm: true,
      user_metadata: { full_name: fullName.data }
    });

    if (updateError) {
      return { error: `Compte Auth existant, mais mise a jour impossible : ${updateError.message}` };
    }

    const repairedProfile = await upsertUserProfile(admin, {
      id: existingUser.id,
      email: email.data,
      fullName: fullName.data,
      role: role.data,
      phone: optionalText(formData, "phone")
    });

    if (repairedProfile.error) {
      return { error: repairedProfile.error };
    }

    revalidatePath("/admin");
    return { success: "Utilisateur Auth existant rattache a l'application." };
  }

  const profile = await upsertUserProfile(admin, {
    id: data.user.id,
    email: email.data,
    fullName: fullName.data,
    role: role.data,
    phone: optionalText(formData, "phone")
  });

  if (profile.error) {
    return { error: profile.error };
  }

  revalidatePath("/admin");
  return { success: "Utilisateur cree." };
}

export async function updateUser(
  _previousState: AdminUserState,
  formData: FormData
): Promise<AdminUserState> {
  const access = await ensureAdminAccess();
  if (!access.ok) return { error: access.error };

  const userId = requiredText(formData, "user_id", "Utilisateur");
  const email = requiredText(formData, "email", "Email");
  const fullName = requiredText(formData, "full_name", "Nom");
  const role = requiredEnum(formData, "role", "Role", roles);

  if (!userId.ok) return { error: userId.error };
  if (!email.ok) return { error: email.error };
  if (!fullName.ok) return { error: fullName.error };
  if (!role.ok) return { error: role.error };

  const admin = createAdminClient();
  if (!admin) return missingServiceRoleError();

  const isActive = formData.get("is_active") === "on";
  const { error: authError } = await admin.auth.admin.updateUserById(userId.data, {
    email: email.data,
    user_metadata: { full_name: fullName.data }
  });

  if (authError) {
    return { error: `Impossible de mettre a jour Auth : ${authError.message}` };
  }

  const usersTable = admin.from("users") as any;
  const { error } = await usersTable
    .update({
      email: email.data,
      full_name: fullName.data,
      role: role.data as AppRole,
      phone: optionalText(formData, "phone"),
      is_active: isActive
    })
    .eq("id", userId.data);

  if (error) {
    return { error: `Impossible de mettre a jour le profil : ${error.message}` };
  }

  revalidatePath("/admin");
  return { success: "Utilisateur mis a jour." };
}

export async function deleteUser(
  _previousState: AdminUserState,
  formData: FormData
): Promise<AdminUserState> {
  const access = await ensureAdminAccess();
  if (!access.ok) return { error: access.error };

  const userId = requiredText(formData, "user_id", "Utilisateur");
  if (!userId.ok) return { error: userId.error };

  if (access.profile.id === userId.data) {
    return { error: "Vous ne pouvez pas supprimer votre propre compte admin." };
  }

  const admin = createAdminClient();
  if (!admin) return missingServiceRoleError();

  const { error } = await admin.auth.admin.deleteUser(userId.data);

  if (error) {
    return { error: `Impossible de supprimer l'utilisateur : ${error.message}` };
  }

  revalidatePath("/admin");
  return { success: "Utilisateur supprime." };
}

export async function sendPasswordReset(
  _previousState: AdminUserState,
  formData: FormData
): Promise<AdminUserState> {
  const access = await ensureAdminAccess();
  if (!access.ok) return { error: access.error };

  const email = requiredText(formData, "email", "Email");
  if (!email.ok) return { error: email.error };

  const supabase = createClient() as any;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  const redirectTo = siteUrl
    ? `${siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`}/login`
    : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo
  });

  if (error) {
    return { error: `Impossible d'envoyer l'email : ${error.message}` };
  }

  return { success: "Email de reinitialisation envoye." };
}

export async function updateProspectAssignments(
  _previousState: AdminUserState,
  formData: FormData
): Promise<AdminUserState> {
  const access = await ensureAdminAccess();
  if (!access.ok) return { error: access.error };

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  if (!prospectId.ok) return { error: prospectId.error };

  const admin = createAdminClient();
  if (!admin) return missingServiceRoleError();

  const userIds = uniqueIds(formData.getAll("user_ids"));
  const assignmentsTable = admin.from("prospect_assignments") as any;

  const { error: deleteError } = await assignmentsTable
    .delete()
    .eq("prospect_id", prospectId.data);

  if (deleteError) {
    return { error: `Impossible de remplacer les affectations : ${deleteError.message}` };
  }

  if (userIds.length > 0) {
    const { error: insertError } = await assignmentsTable.insert(
      userIds.map((userId) => ({
        prospect_id: prospectId.data,
        user_id: userId,
        assigned_by: access.profile.id
      }))
    );

    if (insertError) {
      return { error: `Impossible d'enregistrer les affectations : ${insertError.message}` };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${prospectId.data}`);
  return { success: "Affectations prospect mises a jour." };
}

export async function updateVisitAssignments(
  _previousState: AdminUserState,
  formData: FormData
): Promise<AdminUserState> {
  const access = await ensureAdminAccess();
  if (!access.ok) return { error: access.error };

  const visitId = requiredText(formData, "visit_id", "Action");
  if (!visitId.ok) return { error: visitId.error };

  const admin = createAdminClient();
  if (!admin) return missingServiceRoleError();

  const userIds = uniqueIds(formData.getAll("user_ids"));
  const assignmentsTable = admin.from("visite_assignments") as any;

  const { error: deleteError } = await assignmentsTable
    .delete()
    .eq("visite_id", visitId.data);

  if (deleteError) {
    return { error: `Impossible de remplacer les affectations : ${deleteError.message}` };
  }

  if (userIds.length > 0) {
    const { error: insertError } = await assignmentsTable.insert(
      userIds.map((userId) => ({
        visite_id: visitId.data,
        user_id: userId,
        assigned_by: access.profile.id
      }))
    );

    if (insertError) {
      return { error: `Impossible d'enregistrer les affectations : ${insertError.message}` };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/visites");
  revalidatePath(`/visites/${visitId.data}/edit`);
  return { success: "Affectations action mises a jour." };
}

async function ensureAdminAccess() {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    return { ok: false as const, error: "Acces reserve aux admins." };
  }

  return { ok: true as const, profile };
}

function uniqueIds(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function missingServiceRoleError(): AdminUserState {
  return {
    error:
      "La variable SUPABASE_SERVICE_ROLE_KEY manque cote serveur. Ajoutez-la dans Vercel > Environment Variables."
  };
}

async function findAuthUserByEmail(admin: NonNullable<ReturnType<typeof createAdminClient>>, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;

    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }

  return null;
}

async function upsertUserProfile(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  user: {
    id: string;
    email: string;
    fullName: string;
    role: AppRole;
    phone: string | null;
  }
): Promise<AdminUserState> {
  const usersTable = admin.from("users") as any;
  const { error } = await usersTable.upsert({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    phone: user.phone,
    is_active: true
  });

  if (error) {
    return { error: `Profil applicatif impossible a creer : ${error.message}` };
  }

  return {};
}
