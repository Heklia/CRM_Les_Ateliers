import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EditProspectForm } from "@/components/prospects/edit-prospect-form";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { SegmentCode } from "@/lib/types";

type ProspectRow = {
  id: string;
  segment_id: string;
  company_name: string;
  sub_segment: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  website: string | null;
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

export default async function EditProspectPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const [{ data: prospect }, { data: segments }, { data: contacts }] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, segment_id, company_name, sub_segment, address_line1, city, postal_code, website, notes")
      .eq("id", params.id)
      .single(),
    supabase.from("segments").select("id, code"),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, job_title, phone, email, is_primary")
      .eq("prospect_id", params.id)
      .order("is_primary", { ascending: false })
      .limit(1)
  ]);

  if (!prospect) {
    notFound();
  }

  const prospectRow = prospect as ProspectRow;
  const segmentRows = (segments ?? []) as SegmentRow[];
  const contact = ((contacts ?? []) as ContactRow[])[0];
  const segment = segmentRows.find((item) => item.id === prospectRow.segment_id);

  return (
    <main>
      <PageHeader
        title="Modifier le prospect"
        description={prospectRow.company_name}
        action={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-background"
            href={`/prospects/${prospectRow.id}`}
          >
            <ArrowLeft size={16} />
            Retour
          </Link>
        }
      />

      <EditProspectForm
        contact={{
          id: contact?.id ?? null,
          name: [contact?.first_name, contact?.last_name].filter(Boolean).join(" "),
          jobTitle: contact?.job_title ?? null,
          phone: contact?.phone ?? null,
          email: contact?.email ?? null
        }}
        prospect={{
          id: prospectRow.id,
          companyName: prospectRow.company_name,
          segmentCode: (segment?.code ?? "agencements_decoratifs") as SegmentCode,
          subSegment: prospectRow.sub_segment,
          address: prospectRow.address_line1,
          city: prospectRow.city,
          postalCode: prospectRow.postal_code,
          website: prospectRow.website,
          notes: prospectRow.notes
        }}
      />
    </main>
  );
}
