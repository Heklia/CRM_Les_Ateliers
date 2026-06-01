"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { createProspect } from "@/app/prospects/new/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { segmentLabels } from "@/lib/constants";

const initialState: { error?: string } = {
  error: undefined
};

export function NewProspectForm() {
  const [state, formAction] = useFormState(createProspect, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-6 rounded-lg border border-border bg-surface p-5 shadow-soft lg:grid-cols-2"
    >
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 lg:col-span-2">
          {state.error}
        </p>
      ) : null}

      <Field
        label="Nom entreprise"
        name="company_name"
        placeholder="Nom de l'entreprise"
        required
      />

      <div className="lg:col-span-2">
        <span className="block text-sm font-medium">Segments marche</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(segmentLabels).map(([code, label], index) => (
            <label
              className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold"
              key={code}
            >
              <input
                defaultChecked={index === 0}
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
        label="Sous-segment"
        name="sub_segment"
        placeholder="Architecte, paysagiste, cuisiniste, industriel..."
      />

      <Field label="Adresse" name="address" placeholder="Adresse" />
      <Field label="Ville" name="city" placeholder="Ville" />
      <Field label="Code postal" name="postal_code" placeholder="44000" />
      <Field label="Site web" name="website" placeholder="www.entreprise.fr" />
      <Field
        label="Nom du contact"
        name="contact_name"
        placeholder="Prenom Nom"
        required
      />
      <Field
        label="Fonction du contact"
        name="contact_job_title"
        placeholder="Dirigeant, responsable bureau d'etudes..."
      />
      <Field label="Telephone" name="phone" placeholder="+33..." />
      <Field
        label="Email"
        name="email"
        type="email"
        placeholder="contact@entreprise.fr"
      />
      <div className="lg:col-span-2">
        <Field
          label="Commentaire libre"
          name="notes"
          placeholder="Contexte, besoin pressenti, informations terrain..."
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
      {pending ? "Enregistrement..." : "Enregistrer le prospect"}
    </Button>
  );
}
