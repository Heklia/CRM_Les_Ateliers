"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { deleteVisitAction } from "@/app/visites/actions";
import { DeleteSubmitButton } from "@/components/ui/delete-submit-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { segmentLabels } from "@/lib/constants";
import type { SegmentCode } from "@/lib/types";

export type ActionListItem = {
  id: string;
  prospect: string;
  contact: string;
  assignedUsers: string[];
  date: string;
  type: string;
  summary: string;
  segment: SegmentCode | null;
};

export function ActionsScreen({ actions }: { actions: ActionListItem[] }) {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("");
  const [assignedUser, setAssignedUser] = useState("");

  const assignedUsers = useMemo(
    () => Array.from(new Set(actions.flatMap((action) => action.assignedUsers))).sort(),
    [actions]
  );

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return actions.filter((action) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        action.prospect.toLowerCase().includes(normalizedQuery) ||
        action.summary.toLowerCase().includes(normalizedQuery) ||
        action.contact.toLowerCase().includes(normalizedQuery);
      const matchesSegment = segment === "" || action.segment === segment;
      const matchesAssignedUser =
        assignedUser === "" || action.assignedUsers.includes(assignedUser);

      return matchesQuery && matchesSegment && matchesAssignedUser;
    });
  }, [actions, assignedUser, query, segment]);

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

      <section className="mb-4 grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <label className="relative block">
          <span className="sr-only">Rechercher une action</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            size={16}
          />
          <input
            className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher prospect, contact ou commentaire"
            value={query}
          />
        </label>

        <label className="block">
          <span className="sr-only">Filtrer par segment</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setSegment(event.target.value)}
            value={segment}
          >
            <option value="">Tous les segments</option>
            {Object.entries(segmentLabels).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Filtrer par personne affectee</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setAssignedUser(event.target.value)}
            value={assignedUser}
          >
            <option value="">Toutes les personnes affectees</option>
            {assignedUsers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="mb-3 text-sm text-muted">{filteredActions.length} action(s)</div>

      <div className="grid gap-4">
        {filteredActions.map((action) => (
          <article className="rounded-lg border border-border bg-surface p-5 shadow-soft" key={action.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{action.prospect}</h2>
                  {action.segment ? <StatusPill>{segmentLabels[action.segment]}</StatusPill> : null}
                </div>
                <p className="mt-1 text-sm text-muted">{action.summary}</p>
                <p className="mt-1 text-xs text-muted">Personne : {action.contact}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {action.assignedUsers.length ? (
                    action.assignedUsers.map((name) => (
                      <span className="rounded-md bg-background px-2 py-1 text-xs font-medium" key={name}>
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted">Non affecte</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill>{action.type}</StatusPill>
                <span className="text-sm text-muted">{formatDate(action.date)}</span>
                <Link
                  aria-label="Modifier la visite"
                  className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-white text-muted hover:bg-background hover:text-foreground"
                  href={`/visites/${action.id}/edit`}
                >
                  <Pencil size={16} />
                </Link>
                <form action={deleteVisitAction}>
                  <input name="visit_id" type="hidden" value={action.id} />
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

      {filteredActions.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Aucune action ne correspond aux filtres selectionnes.
        </div>
      ) : null}
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
