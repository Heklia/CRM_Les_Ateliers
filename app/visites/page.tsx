import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { deleteVisitAction } from "@/app/visites/actions";
import { DeleteSubmitButton } from "@/components/ui/delete-submit-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { scopeByCommercial } from "@/lib/supabase/role-filters";

type VisitRow = {
  id: string;
  prospect_id: string;
  contact_id: string | null;
  visite_date: string;
  type: string;
  resume: string;
  niveau_interet: number | null;
};

type ProspectRow = {
  id: string;
  company_name: string;
};

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export default async function VisitesPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const visitsQuery = supabase
    .from("visites")
    .select("id, prospect_id, contact_id, commercial_id, visite_date, type, resume, niveau_interet")
    .order("visite_date", { ascending: false });

  const [{ data: visits }, { data: prospects }, { data: contacts }] = await Promise.all([
    scopeByCommercial(visitsQuery, profile),
    scopeByCommercial(
      supabase.from("prospects").select("id, company_name, commercial_id"),
      profile
    ),
    scopeByCommercial(
      supabase.from("contacts").select("id, first_name, last_name, commercial_id"),
      profile
    )
  ]);

  const visitRows = (visits ?? []) as VisitRow[];
  const prospectRows = (prospects ?? []) as ProspectRow[];
  const contactRows = (contacts ?? []) as ContactRow[];
  const prospectById = new Map(
    prospectRows.map((prospect) => [prospect.id, prospect.company_name])
  );
  const contactById = new Map(
    contactRows.map((contact) => [
      contact.id,
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Personne non renseignee"
    ])
  );

  return (
    <main>
      <PageHeader
        title="Actions"
        description="Actions commerciales realisees : visites, appels, emails, salons et prochaines actions."
        action={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
            href="/visites/new"
          >
            <Plus size={16} />
            Nouvelle action
          </Link>
        }
      />
      <div className="grid gap-4">
        {visitRows.map((visit) => (
          <article className="rounded-lg border border-border bg-surface p-5 shadow-soft" key={visit.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold">{prospectById.get(visit.prospect_id) ?? "Prospect"}</h2>
                <p className="mt-1 text-sm text-muted">{visit.resume}</p>
                <p className="mt-1 text-xs text-muted">
                  Personne : {visit.contact_id ? contactById.get(visit.contact_id) ?? "Non renseignee" : "Non renseignee"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill>{visit.type}</StatusPill>
                <span className="text-sm text-muted">{formatDate(visit.visite_date)}</span>
                <Link
                  aria-label="Modifier la visite"
                  className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-white text-muted hover:bg-background hover:text-foreground"
                  href={`/visites/${visit.id}/edit`}
                >
                  <Pencil size={16} />
                </Link>
                <form action={deleteVisitAction}>
                  <input name="visit_id" type="hidden" value={visit.id} />
                  <DeleteSubmitButton
                    confirmMessage="Supprimer definitivement cette action ?"
                    label="Supprimer"
                  />
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
