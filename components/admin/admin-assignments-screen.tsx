"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Save, Search } from "lucide-react";
import {
  updateProspectAssignmentsBatch,
  updateProspectAssignments,
  updateVisitAssignments
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth/roles";

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  isActive: boolean;
};

type AssignmentItem = {
  id: string;
  label: string;
  detail: string;
  assignedUserIds: string[];
};

const initialState: { error?: string; success?: string } = {};

export function AdminAssignmentsScreen({
  users,
  prospects,
  visits
}: {
  users: AdminUser[];
  prospects: AssignmentItem[];
  visits: AssignmentItem[];
}) {
  const activeUsers = users
    .filter((user) => user.isActive)
    .sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (a.role !== "admin" && b.role === "admin") return 1;
      return a.fullName.localeCompare(b.fullName);
    });

  return (
    <div className="grid gap-6">
      <ProspectAssignmentMatrix prospects={prospects} users={activeUsers} />
      <AssignmentSection
        emptyLabel="Aucune action disponible."
        formIdName="visit_id"
        items={visits}
        title="Affecter les actions"
        type="visit"
        users={activeUsers}
      />
    </div>
  );
}

function ProspectAssignmentMatrix({
  prospects,
  users
}: {
  prospects: AssignmentItem[];
  users: AdminUser[];
}) {
  const [query, setQuery] = useState("");
  const [state, formAction] = useFormState(updateProspectAssignmentsBatch, initialState);
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const visibleProspectIds = useMemo(
    () =>
      new Set(
        prospects
          .filter((prospect) =>
            `${prospect.label} ${prospect.detail}`
              .toLocaleLowerCase("fr")
              .includes(normalizedQuery)
          )
          .map((prospect) => prospect.id)
      ),
    [normalizedQuery, prospects]
  );

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Affecter les prospects</h2>
          <p className="mt-1 text-sm text-muted">
            Cochez les utilisateurs rattaches a chaque client, puis enregistrez le tableau.
          </p>
        </div>
        <label className="block w-full text-sm font-medium sm:max-w-sm">
          Rechercher un prospect
          <span className="relative mt-1 block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="h-11 w-full rounded-md border border-border bg-white pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, ville ou responsable"
              type="search"
              value={query}
            />
          </span>
        </label>
      </div>

      <FormMessage state={state} />

      {prospects.length ? (
        <form action={formAction} className="mt-4">
          <div className="max-h-[70vh] overflow-auto rounded-md border border-border">
            <table className="w-max min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-background text-xs uppercase text-muted">
                <tr>
                  <th className="sticky left-0 z-30 min-w-64 border-b border-r border-border bg-background px-4 py-3 text-left">
                    Nom client
                  </th>
                  {users.map((user) => (
                    <th className="min-w-36 border-b border-border px-3 py-3 text-center" key={user.id}>
                      <span className="block font-semibold text-foreground">
                        {user.role === "admin" ? "Administrateur" : "Commercial"}
                      </span>
                      <span className="mt-1 block normal-case text-muted">{user.fullName}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prospects.map((prospect) => {
                  const assigned = new Set(prospect.assignedUserIds);
                  const isVisible = visibleProspectIds.has(prospect.id);

                  return (
                    <tr
                      className={`border-b border-border last:border-0 hover:bg-background ${isVisible ? "" : "hidden"}`}
                      key={prospect.id}
                    >
                      <td className="sticky left-0 z-10 border-r border-border bg-white px-4 py-3">
                        <input name="prospect_ids" type="hidden" value={prospect.id} />
                        <p className="font-semibold">{prospect.label}</p>
                        <p className="mt-1 text-xs text-muted">{prospect.detail}</p>
                      </td>
                      {users.map((user) => (
                        <td className="px-3 py-3 text-center" key={user.id}>
                          <input
                            aria-label={`Affecter ${prospect.label} a ${user.fullName}`}
                            className="size-5 accent-primary"
                            defaultChecked={assigned.has(user.id)}
                            name={`assignment_${prospect.id}`}
                            type="checkbox"
                            value={user.id}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 bg-surface">
                <tr className="border-t border-border">
                  <td className="px-4 py-3 text-sm text-muted" colSpan={users.length + 1}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{visibleProspectIds.size} prospect(s) affiche(s) sur {prospects.length}</span>
                      <SubmitButton label="Enregistrer les affectations" />
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted">Aucun prospect disponible.</p>
      )}
    </section>
  );
}

function AssignmentSection({
  emptyLabel,
  formIdName,
  items,
  title,
  type,
  users
}: {
  emptyLabel: string;
  formIdName: "prospect_id" | "visit_id";
  items: AssignmentItem[];
  title: string;
  type: "prospect" | "visit";
  users: AdminUser[];
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-soft">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <AssignmentRow
              formIdName={formIdName}
              item={item}
              key={item.id}
              type={type}
              users={users}
            />
          ))
        )}
      </div>
    </section>
  );
}

function AssignmentRow({
  formIdName,
  item,
  type,
  users
}: {
  formIdName: "prospect_id" | "visit_id";
  item: AssignmentItem;
  type: "prospect" | "visit";
  users: AdminUser[];
}) {
  const action = type === "prospect" ? updateProspectAssignments : updateVisitAssignments;
  const [state, formAction] = useFormState(action, initialState);
  const assigned = new Set(item.assignedUserIds);

  return (
    <form action={formAction} className="rounded-md border border-border p-4">
      <input name={formIdName} type="hidden" value={item.id} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-semibold">{item.label}</h3>
          <p className="mt-1 text-sm text-muted">{item.detail}</p>
          <FormMessage state={state} />
        </div>
        <SubmitButton />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <label
            className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm"
            key={user.id}
          >
            <input defaultChecked={assigned.has(user.id)} name="user_ids" type="checkbox" value={user.id} />
            <span>
              <span className="font-medium">{user.fullName}</span>
              <span className="block text-xs text-muted">{user.email}</span>
            </span>
          </label>
        ))}
      </div>
    </form>
  );
}

function SubmitButton({ label = "Enregistrer" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      <Save size={16} />
      {pending ? "Enregistrement..." : label}
    </Button>
  );
}

function FormMessage({ state }: { state: { error?: string; success?: string } }) {
  if (!state.error && !state.success) return null;

  return (
    <p className={`mt-2 text-sm ${state.error ? "text-red-700" : "text-emerald-700"}`}>
      {state.error ?? state.success}
    </p>
  );
}
