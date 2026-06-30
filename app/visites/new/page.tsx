import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { VisitReportForm } from "@/components/visites/visit-report-form";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";

export default async function NewVisitPage({
  searchParams
}: {
  searchParams?: { follow_up_id?: string; opportunite_id?: string; prospect_id?: string };
}) {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const prospectsQuery = supabase
    .from("prospects")
    .select("id, company_name, city, status")
    .order("company_name", { ascending: true });
  const contactsQuery = supabase
    .from("contacts")
    .select("id, prospect_id, first_name, last_name, job_title, is_primary")
    .order("is_primary", { ascending: false });
  const [{ data: prospects }, { data: contacts }] = await Promise.all([
    scopeByCommercial(prospectsQuery, profile),
    scopeByCommercial(contactsQuery, profile)
  ]);
  const followUpReminder = searchParams?.follow_up_id
    ? await getFollowUpReminder(supabase, searchParams.follow_up_id)
    : null;
  const initialProspectId = followUpReminder?.prospectId ?? searchParams?.prospect_id ?? "";
  const initialOpportunityId = followUpReminder?.opportunityId ?? searchParams?.opportunite_id ?? "";

  return (
    <main>
      <PageHeader
        title="Nouvelle action"
        description="Saisie rapide terrain : prospect, personne concernee, compte-rendu et prochaine action."
      />

      <VisitReportForm
        contacts={contacts ?? []}
        followUpId={searchParams?.follow_up_id ?? ""}
        initialOpportunityId={initialOpportunityId}
        initialProspectId={initialProspectId}
        previousAction={followUpReminder?.previousAction ?? null}
        prospects={prospects ?? []}
      />
    </main>
  );
}

async function getFollowUpReminder(supabase: any, followUpId: string) {
  const { data: followUp, error } = await supabase
    .from("actions_suivantes")
    .select("id, prospect_id, opportunite_id, visite_id, title, description, due_at")
    .eq("id", followUpId)
    .single();

  if (error || !followUp) {
    return null;
  }

  if (!followUp.visite_id) {
    return {
      prospectId: followUp.prospect_id as string,
      opportunityId: (followUp.opportunite_id as string | null) ?? null,
      previousAction: {
        title: followUp.title as string,
        date: followUp.due_at as string,
        type: "Action a realiser",
        summary: followUp.description as string | null,
        comment: null,
        contact: null
      }
    };
  }

  const { data: visit } = await supabase
    .from("visites")
    .select("id, contact_id, visite_date, type, resume, besoins, freins, commentaire")
    .eq("id", followUp.visite_id)
    .single();

  const contact = visit?.contact_id
    ? await getContactName(supabase, visit.contact_id)
    : null;

  return {
    prospectId: followUp.prospect_id as string,
    opportunityId: (followUp.opportunite_id as string | null) ?? null,
    previousAction: {
      title: followUp.title as string,
      date: (visit?.visite_date ?? followUp.due_at) as string,
      type: (visit?.type ?? "Action") as string,
      summary: (visit?.resume ?? visit?.besoins ?? followUp.description) as string | null,
      comment: (visit?.commentaire ?? visit?.freins ?? null) as string | null,
      contact
    }
  };
}

async function getContactName(supabase: any, contactId: string) {
  const { data: contact } = await supabase
    .from("contacts")
    .select("first_name, last_name, job_title")
    .eq("id", contactId)
    .single();

  if (!contact) {
    return null;
  }

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  return [name || "Contact", contact.job_title].filter(Boolean).join(" - ");
}
