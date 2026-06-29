"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { updateProspect } from "@/app/prospects/[id]/edit/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { segmentLabels } from "@/lib/constants";
import type { SegmentCode } from "@/lib/types";

type EditProspectFormProps = {
  prospect: {
    id: string;
    companyName: string;
    segmentCode: SegmentCode;
    segmentCodes: SegmentCode[];
    subSegment: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    website: string | null;
    notes: string | null;
  };
  contact: {
    id: string | null;
    name: string;
    jobTitle: string | null;
    phone: string | null;
    email: string | null;
  };
};

const initialState: { error?: string } = {};

export function EditProspectForm({ prospect, contact }: EditProspectFormProps) {
  const [state, formAction] = useFormState(updateProspect, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-6 rounded-lg border border-border bg-surface p-5 shadow-soft lg:grid-cols-2"
    >
      <input name="prospect_id" type="hidden" value={prospect.id} />
      <input name="contact_id" type="hidden" value={contact.id ?? ""} />

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 lg:col-span-2">
          {state.error}
        </p>
      ) : null}

      <Field
        defaultValue={prospect.companyName}
        label="Nom entreprise"
        name="company_name"
        required
      />

      <div className="lg:col-span-2">
        <span className="block text-sm font-medium">Segments marche</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(segmentLabels).map(([code, label]) => (
            <label
              className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold"
              key={code}
            >
              <input
                defaultChecked={prospect.segmentCodes.includes(code as SegmentCode)}
                name="segment_codes"
                type="checkbox"
                value={code}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <Field
        defaultValue={prospect.subSegment ?? ""}
        label="Precision sur l'activite"
        name="sub_segment"
      />
      <Field defaultValue={prospect.address ?? ""} label="Adresse" name="address" />
      <Field defaultValue={prospect.city ?? ""} label="Ville" name="city" />
      <Field defaultValue={prospect.postalCode ?? ""} label="Code postal" name="postal_code" />
      <Field defaultValue={prospect.website ?? ""} label="Site web" name="website" />
      <Field
        defaultValue={contact.name}
        label="Nom du contact"
        name="contact_name"
        required
      />
      <Field
        defaultValue={contact.jobTitle ?? ""}
        label="Fonction du contact"
        name="contact_job_title"
      />
      <Field defaultValue={contact.phone ?? ""} label="Telephone" name="phone" />
      <Field defaultValue={contact.email ?? ""} label="Email" name="email" type="email" />
      <div className="lg:col-span-2">
        <Field
          defaultValue={prospect.notes ?? ""}
          label="Commentaire libre"
          name="notes"
          textarea
        />
      </div>

      <div className="sticky bottom-20 z-20 flex items-center justify-end gap-3 bg-surface/95 py-2 backdrop-blur md:static md:bg-transparent md:py-0 lg:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full md:w-auto" disabled={pending} type="submit">
      <Save size={16} />
      {pending ? "Enregistrement..." : "Enregistrer les modifications"}
    </Button>
  );
}
