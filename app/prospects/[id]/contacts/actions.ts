"use server";

import { redirect } from "next/navigation";
import { optionalEmail, optionalText, requiredText } from "@/lib/forms/validation";
import { createClient } from "@/lib/supabase/server";

type CreateContactState = {
  error?: string;
};

export async function createProspectContact(
  _previousState: CreateContactState,
  formData: FormData
): Promise<CreateContactState> {
  const supabase = createClient() as any;
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const prospectId = requiredText(formData, "prospect_id", "Prospect");
  const contactName = requiredText(formData, "contact_name", "Nom du contact");
  const email = optionalEmail(formData, "email", "Email");

  if (!prospectId.ok) return { error: prospectId.error };
  if (!contactName.ok) return { error: contactName.error };
  if (!email.ok) return { error: email.error };

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id, commercial_id")
    .eq("id", prospectId.data)
    .single();

  if (prospectError || !prospect) {
    return { error: "Prospect introuvable ou non autorise." };
  }

  const { firstName, lastName } = splitContactName(contactName.data);
  const { error } = await supabase.from("contacts").insert({
    prospect_id: prospectId.data,
    commercial_id: prospect.commercial_id,
    first_name: firstName,
    last_name: lastName,
    job_title: optionalText(formData, "contact_job_title"),
    phone: optionalText(formData, "phone"),
    email: email.data,
    notes: optionalText(formData, "contact_notes"),
    is_primary: false
  });

  if (error) {
    return { error: "Impossible de creer le contact." };
  }

  redirect(`/prospects/${prospectId.data}`);
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
