"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import {
  updateProspectAssignments,
  updateVisitAssignments
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

type AssignmentUser = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
};

const initialState: { error?: string; success?: string } = {};

export function ResourceAssignmentsForm({
  assignedUserIds,
  resourceId,
  type,
  users
}: {
  assignedUserIds: string[];
  resourceId: string;
  type: "prospect" | "visit";
  users: AssignmentUser[];
}) {
  const action = type === "prospect" ? updateProspectAssignments : updateVisitAssignments;
  const [state, formAction] = useFormState(action, initialState);
  const activeUsers = users.filter((user) => user.isActive);
  const assigned = new Set(assignedUserIds);

  return (
    <form action={formAction} className="rounded-lg border border-border bg-surface p-5 shadow-soft">
      <input name={type === "prospect" ? "prospect_id" : "visit_id"} type="hidden" value={resourceId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Affectations utilisateurs</h2>
          <p className="mt-1 text-sm text-muted">Selectionnez les utilisateurs rattaches a cet element.</p>
          <FormMessage state={state} />
        </div>
        <SubmitButton />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {activeUsers.map((user) => (
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
