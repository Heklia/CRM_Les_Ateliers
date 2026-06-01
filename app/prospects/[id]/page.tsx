import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarPlus, Pencil } from "lucide-react";
import { ProspectContactsTabs } from "@/components/prospects/prospect-contacts-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getCurrentProfile } from "@/lib/auth/roles";
import { segmentLabels, statusLabels } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ProspectStatus, SegmentCode } from "@/lib/types";

type ProspectRow = {
  id: string;
  segment_id: string;
  company_name: string;
  city: string | null;
  status: string;
  interest_level: number | null;
  notes: string | null;
};

type SegmentRow = {
  id: string;
  code: string;
};

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
};

type VisitRow = {
  id: string;
  visite_date: string;
  type: string;
  resume: string;
};

export default async function ProspectDetailPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const [{ data: prospect }, { data: segments }, { data: contacts }, { data: visits }] =
    await Promise.all([
      supabase
        .from("prospects")
        .select("id, segment_id, company_name, city, status, interest_level, notes")
        .eq("id", params.id)
        .single(),
      supabase.from("segments").select("id, code"),
      supabase
        .from("contacts")
        .select("id, first_name, last_name, job_title, phone, email, is_primary")
        .eq("prospect_id", params.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("visites")
        .select("id, visite_date, type, resume")
        .eq("prospect_id", params.id)
        .order("visite_date", { ascending: false })
    ]);

  if (!prospect) {
    notFound();
  }

  const prospectRow = prospect as ProspectRow;
  const segmentRows = (segments ?? []) as SegmentRow[];
  const contactRows = (contacts ?? []) as ContactRow[];
  const visitRows = (visits ?? []) as VisitRow[];
  const segment = segmentRows.find((item) => item.id === prospectRow.segment_id);
  const segmentCode = (segment?.code ?? "agencements_decoratifs") as SegmentCode;
  const contactItems = contactRows.map((contact) => ({
    id: contact.id,
    name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Contact non renseigne",
    jobTitle: contact.job_title,
    phone: contact.phone,
    email: contact.email
  }));

  return (
    <main>
      <PageHeader
        title={prospectRow.company_name}
        description={`${segmentLabels[segmentCode]} - ${prospectRow.city ?? "Ville non renseignee"}`}
        action={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
            href={`/prospects/${prospectRow.id}/edit`}
          >
            <Pencil size={16} />
            Modifier
          </Link>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-semibold">Informations</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Statut</dt>
              <dd>
                <StatusPill>{statusLabels[prospectRow.status as ProspectStatus]}</StatusPill>
              </dd>
            </div>
            <InfoRow
              label="Interet"
              value={prospectRow.interest_level ? `${prospectRow.interest_level}/5` : "Non renseigne"}
            />
            <InfoRow label="Commentaire" value={prospectRow.notes ?? "Aucun commentaire"} />
          </dl>
        </div>

        <ProspectContactsTabs contacts={contactItems} prospectId={prospectRow.id} />

        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Historique des visites</h2>
            <Link
              className="inline-flex size-9 items-center justify-center rounded-md border border-border"
              href="/visites/new"
            >
              <CalendarPlus size={17} />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {visitRows.length ? (
              visitRows.map((visit) => (
                <article className="rounded-md border border-border p-4" key={visit.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{visit.type}</p>
                    <span className="text-sm text-muted">{formatDate(visit.visite_date)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{visit.resume}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted">Aucune visite enregistree.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
