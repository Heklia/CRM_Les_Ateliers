import { notFound } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { prospects, visits } from "@/lib/mock-data";
import { segmentLabels, statusLabels } from "@/lib/constants";

export default function ProspectDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { id } = params;
  const prospect = prospects.find((item) => item.id === id);

  if (!prospect) {
    notFound();
  }

  return (
    <main>
      <PageHeader
        title={prospect.company}
        description={`${segmentLabels[prospect.segment]} - ${prospect.city}`}
      />

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-semibold">Informations</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Contact</dt><dd className="font-medium">{prospect.contact}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Statut</dt><dd><StatusPill>{statusLabels[prospect.status]}</StatusPill></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Interet</dt><dd className="font-medium">{prospect.interest}/5</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Action suivante</dt><dd className="font-medium">{prospect.nextAction}</dd></div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Historique des visites</h2>
            <button className="inline-flex size-9 items-center justify-center rounded-md border border-border">
              <CalendarPlus size={17} />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {visits.map((visit) => (
              <article className="rounded-md border border-border p-4" key={visit.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{visit.type}</p>
                  <span className="text-sm text-muted">{visit.date}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{visit.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
