"use client";

import { useFormStatus } from "react-dom";
import { updateProspectStatus } from "@/app/prospects/[id]/actions";
import { statusLabels } from "@/lib/constants";
import type { ProspectStatus } from "@/lib/types";

const editableStatuses = ["en_cours", "qualifie", "client", "perdu"] as const;

export function ProspectStatusForm({
  prospectId,
  status
}: {
  prospectId: string;
  status: ProspectStatus;
}) {
  return (
    <form action={updateProspectStatus}>
      <input name="prospect_id" type="hidden" value={prospectId} />
      <div className="flex items-center gap-2">
        <select
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          defaultValue={status}
          name="status"
        >
          {editableStatuses.map((item) => (
            <option key={item} value={item}>
              {statusLabels[item]}
            </option>
          ))}
        </select>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "..." : "OK"}
    </button>
  );
}
