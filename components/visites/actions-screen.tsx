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

      <section className="rounded-lg border border-border bg-surface shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm text-muted">
          <span>{filteredActions.length} action(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Prospect</th>
                <th>Segment</th>
                <th>Type</th>
                <th>Personne</th>
                <th>Resume</th>
                <th>Personnes affectees</th>
                <th>Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.map((action) => (
                <tr
                  className="border-b border-border last:border-0 hover:bg-background"
                  key={action.id}
                >
                  <td className="px-4 py-3 font-semibold">{action.prospect}</td>
                  <td>
                    {action.segment ? (
                      <StatusPill>{segmentLabels[action.segment]}</StatusPill>
                    ) : (
                      <span className="text-muted">Non renseigne</span>
                    )}
                  </td>
                  <td>
                    <StatusPill>{action.type}</StatusPill>
                  </td>
                  <td className="text-muted">{action.contact}</td>
                  <td className="max-w-[280px] truncate text-muted" title={action.summary}>
                    {action.summary}
                  </td>
                  <td>
                    <AssignedUsers names={action.assignedUsers} />
                  </td>
                  <td className="text-muted">{formatDate(action.date)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {filteredActions.length === 0 ? (
        <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Aucune action ne correspond aux filtres selectionnes.
        </div>
      ) : null}
    </main>
  );
}

function AssignedUsers({ names }: { names: string[] }) {
  if (!names.length) {
    return <span className="text-muted">Non affecte</span>;
  }

  return (
    <div className="flex max-w-[220px] flex-wrap gap-1">
      {names.map((name) => (
        <span className="rounded-md bg-background px-2 py-1 text-xs font-medium" key={name}>
          {name}
        </span>
      ))}
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
