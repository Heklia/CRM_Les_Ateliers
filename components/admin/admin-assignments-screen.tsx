"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import {
  updateProspectAssignments,
  updateVisitAssignments
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
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
  const activeUsers = users.filter((user) => user.isActive);

  return (
    <div className="grid gap-6">
      <AssignmentSection
        emptyLabel="Aucun prospect disponible."
        formIdName="prospect_id"
        items={prospects}
        title="Affecter les prospects"
        type="prospect"
        users={activeUsers}
      />
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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      <Save size={16} />
      {pending ? "Enregistrement..." : "Enregistrer"}
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
