import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarPlus, Pencil } from "lucide-react";
import { deleteProspect } from "@/app/prospects/[id]/actions";
import { ResourceAssignmentsForm } from "@/components/admin/resource-assignments-form";
import { ProspectContactsTabs } from "@/components/prospects/prospect-contacts-tabs";
import { ProspectCategoryForm } from "@/components/prospects/prospect-category-form";
import { ProspectImagesPanel } from "@/components/prospects/prospect-images-panel";
import { ProspectOpportunitiesPanel } from "@/components/prospects/prospect-opportunities-panel";
import { ProspectStatusForm } from "@/components/prospects/prospect-status-form";
import { DeleteSubmitButton } from "@/components/ui/delete-submit-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { canModifyData, getCurrentProfile } from "@/lib/auth/roles";
import { opportunityStages, segmentLabels, statusLabels } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { OpportunityStage, ProspectCategory, ProspectStatus, SegmentCode } from "@/lib/types";

type ProspectRow = {
  id: string;
  commercial_id: string;
  segment_id: string;
  company_name: string;
  city: string | null;
  status: string;
  category: string;
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

type OpportunityRow = {
  id: string;
  prospect_id: string;
  title: string;
  description: string | null;
  stage: string;
  estimated_value: number | null;
  probability: number;
  expected_close_date: string | null;
  updated_at: string;
};

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
};

type ProspectAssignmentRow = {
  user_id: string;
};

type ProspectImageRow = {
  id: string;
  storage_path: string;
  file_name: string;
  original_file_name: string | null;
  notes: string | null;
  created_at: string;
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

  const [
    prospectResult,
    { data: segments },
    { data: contacts },
    { data: visits },
    { data: opportunities },
    imagesResult,
    { data: users },
    { data: assignments }
  ] =
    await Promise.all([
      fetchProspect(supabase, params.id),
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
        .order("visite_date", { ascending: false }),
      supabase
        .from("opportunites")
        .select("id, prospect_id, title, description, stage, estimated_value, probability, expected_close_date, updated_at")
        .eq("prospect_id", params.id)
        .order("updated_at", { ascending: false }),
      fetchProspectImages(supabase, params.id),
      profile.role === "admin"
        ? supabase
            .from("users")
            .select("id, email, full_name, is_active")
            .order("full_name", { ascending: true })
        : Promise.resolve({ data: [] }),
      profile.role === "admin"
        ? supabase
            .from("prospect_assignments")
            .select("user_id")
            .eq("prospect_id", params.id)
        : Promise.resolve({ data: [] })
    ]);

  const prospect = prospectResult.data;

  if (!prospect) {
    notFound();
  }

  const prospectRow = prospect as ProspectRow;
  const segmentRows = (segments ?? []) as SegmentRow[];
  const contactRows = (contacts ?? []) as ContactRow[];
  const visitRows = (visits ?? []) as VisitRow[];
  const opportunityRows = (opportunities ?? []) as OpportunityRow[];
  const imageRows = (imagesResult.data ?? []) as ProspectImageRow[];
  const userRows = (users ?? []) as UserRow[];
  const assignmentRows = (assignments ?? []) as ProspectAssignmentRow[];
  const segment = segmentRows.find((item) => item.id === prospectRow.segment_id);
  const segmentCode = (segment?.code ?? "autres_agencements") as SegmentCode;
  const contactItems = contactRows.map((contact) => ({
    id: contact.id,
    name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Contact non renseigne",
    jobTitle: contact.job_title,
    phone: contact.phone,
    email: contact.email
  }));
  const opportunityItems = opportunityRows.map((opportunity) => ({
    id: opportunity.id,
    prospectId: opportunity.prospect_id,
    title: opportunity.title,
    description: opportunity.description,
    stage: toOpportunityStage(opportunity.stage),
    estimatedValue: opportunity.estimated_value,
    probability: opportunity.probability,
    expectedCloseDate: opportunity.expected_close_date,
    updatedAt: opportunity.updated_at
  }));
  const assignedUserIds =
    assignmentRows.length > 0
      ? assignmentRows.map((assignment) => assignment.user_id)
      : [prospectRow.commercial_id];
  const assignmentUsers = userRows.map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    isActive: user.is_active
  }));
  const imageItems = await Promise.all(
    imageRows.map(async (image) => {
      const { data } = await supabase.storage
        .from("prospect-images")
        .createSignedUrl(image.storage_path, 60 * 60);

      return {
        id: image.id,
        fileName: image.file_name,
        originalFileName: image.original_file_name,
        notes: image.notes,
        createdAt: image.created_at,
        signedUrl: data?.signedUrl ?? null
      };
    })
  );

  return (
    <main>
      <PageHeader
        title={prospectRow.company_name}
        description={`${segmentLabels[segmentCode]} - ${prospectRow.city ?? "Ville non renseignee"}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
              href={`/prospects/${prospectRow.id}/edit`}
            >
              <Pencil size={16} />
              Modifier
            </Link>
            <form action={deleteProspect}>
              <input name="prospect_id" type="hidden" value={prospectRow.id} />
              <DeleteSubmitButton
                confirmMessage={`Supprimer definitivement le prospect ${prospectRow.company_name} et ses donnees associees ?`}
              />
            </form>
          </div>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-semibold">Informations</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Statut</dt>
              <dd>
                {canModifyData(profile) ? (
                  <ProspectStatusForm
                    prospectId={prospectRow.id}
                    status={prospectRow.status as ProspectStatus}
                  />
                ) : (
                  <StatusPill>{statusLabels[prospectRow.status as ProspectStatus]}</StatusPill>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Categorie</dt>
              <dd>
                <ProspectCategoryForm
                  category={(prospectRow.category ?? "standard") as ProspectCategory}
                  disabled={!canModifyData(profile) || !prospectResult.hasCategoryColumn}
                  disabledReason={
                    prospectResult.hasCategoryColumn
                      ? "Votre role ne permet pas de modifier la categorie"
                      : "Migration Supabase 014_prospect_category.sql manquante"
                  }
                  prospectId={prospectRow.id}
                />
              </dd>
            </div>
            {!prospectResult.hasCategoryColumn ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                La categorisation sera modifiable apres execution de la migration Supabase 014.
              </p>
            ) : null}
            <InfoRow
              label="Interet"
              value={prospectRow.interest_level ? `${prospectRow.interest_level}/5` : "Non renseigne"}
            />
            <InfoRow label="Commentaire" value={prospectRow.notes ?? "Aucun commentaire"} />
          </dl>
        </div>

        {profile.role === "admin" ? (
          <ResourceAssignmentsForm
            assignedUserIds={assignedUserIds}
            resourceId={prospectRow.id}
            type="prospect"
            users={assignmentUsers}
          />
        ) : null}

        <ProspectContactsTabs contacts={contactItems} prospectId={prospectRow.id} />

        <ProspectOpportunitiesPanel
          opportunities={opportunityItems}
          prospectId={prospectRow.id}
        />

        <ProspectImagesPanel
          canModify={canModifyData(profile)}
          images={imageItems}
          prospectId={prospectRow.id}
        />

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

function toOpportunityStage(value: string): OpportunityStage {
  return opportunityStages.includes(value as OpportunityStage)
    ? (value as OpportunityStage)
    : "prospect_identifie";
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

async function fetchProspect(supabase: ReturnType<typeof createClient>, prospectId: string) {
  const prospectsTable = supabase.from("prospects") as any;
  const selectWithCategory =
    "id, commercial_id, segment_id, company_name, city, status, category, interest_level, notes";
  const selectWithoutCategory =
    "id, commercial_id, segment_id, company_name, city, status, interest_level, notes";

  const result = await prospectsTable
    .select(selectWithCategory)
    .eq("id", prospectId)
    .single();

  if (!isMissingSchemaError(result.error, "category")) {
    return {
      data: result.data
        ? ({ ...result.data, category: result.data.category ?? "standard" } as ProspectRow)
        : null,
      hasCategoryColumn: true
    };
  }

  const fallback = await prospectsTable
    .select(selectWithoutCategory)
    .eq("id", prospectId)
    .single();

  return {
    data: fallback.data
      ? ({ ...fallback.data, category: "standard" } as ProspectRow)
      : null,
    hasCategoryColumn: false
  };
}

async function fetchProspectImages(supabase: ReturnType<typeof createClient>, prospectId: string) {
  const imagesTable = supabase.from("prospect_images") as any;
  const result = await imagesTable
    .select("id, storage_path, file_name, original_file_name, notes, created_at")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });

  if (isMissingSchemaError(result.error, "prospect_images")) {
    return { data: [] as ProspectImageRow[] };
  }

  return { data: (result.data ?? []) as ProspectImageRow[] };
}

function isMissingSchemaError(error: unknown, name: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";

  return code === "42703" || code === "42P01" || message.includes(name);
}
