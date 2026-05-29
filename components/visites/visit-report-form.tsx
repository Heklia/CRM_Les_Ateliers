"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { createVisitReport } from "@/app/visites/new/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type ProspectOption = {
  id: string;
  company_name: string;
  city: string | null;
};

const initialState: { error?: string } = {
  error: undefined
};

export function VisitReportForm({ prospects }: { prospects: ProspectOption[] }) {
  const [state, formAction] = useFormState(createVisitReport, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-soft sm:p-5 lg:grid-cols-2"
    >
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 lg:col-span-2">
          {state.error}
        </p>
      ) : null}

      <label className="block text-sm font-medium">
        Prospect
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="prospect_id"
          required
        >
          <option value="">Selectionner un prospect</option>
          {prospects.map((prospect) => (
            <option key={prospect.id} value={prospect.id}>
              {prospect.company_name}
              {prospect.city ? ` - ${prospect.city}` : ""}
            </option>
          ))}
        </select>
      </label>

      <Field label="Date de visite" name="visite_date" required type="datetime-local" />

      <label className="block text-sm font-medium">
        Type de contact
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="type"
          required
        >
          <option value="appel">Appel</option>
          <option value="email">Email</option>
          <option value="visite_terrain">Visite terrain</option>
          <option value="salon">Salon</option>
          <option value="autre">Autre</option>
        </select>
      </label>

      <Field
        label="Besoin identifie"
        name="besoins"
        placeholder="Besoin exprime ou observe"
        required
      />
      <Field
        label="Prochaines actions"
        name="prochaine_etape"
        placeholder="Relancer, envoyer devis, organiser rendez-vous technique..."
        required
      />

      <label className="block text-sm font-medium">
        Niveau d'interet
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="niveau_interet"
          required
        >
          <option value="froid">Froid</option>
          <option value="tiede">Tiede</option>
          <option value="chaud">Chaud</option>
        </select>
      </label>

      <Field
        label="Date de relance"
        name="prochaine_relance_at"
        type="datetime-local"
      />

      <details className="rounded-md border border-border p-3 lg:col-span-2">
        <summary className="cursor-pointer text-sm font-semibold">Details projet</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field
            label="Personnes rencontrees"
            name="personnes_rencontrees"
            placeholder="Noms, roles, participants"
          />
          <Field
            label="Douleur principale"
            name="freins"
            placeholder="Probleme, contrainte, frein actuel"
          />
          <Field
            label="Application envisagee"
            name="application_envisagee"
            placeholder="Usage, produit, projet cible"
          />
          <Field
            label="Matiere ou procede concerne"
            name="matiere_procede"
            placeholder="Usinage 3D, rotomoulage, mineral, composite..."
          />
          <Field
            label="Budget estime"
            min="0"
            name="budget_estime"
            placeholder="15000"
            step="100"
            type="number"
          />
          <Field
            label="Delai projet"
            name="delai_projet"
            placeholder="Immediat, 3 mois, T4..."
          />
        </div>
      </details>

      <div className="lg:col-span-2">
        <Field
          label="Commentaire libre"
          name="commentaire"
          placeholder="Notes complementaires, contexte, signaux faibles..."
          textarea
        />
      </div>

      <div className="sticky bottom-20 z-20 flex justify-end bg-surface/95 py-2 backdrop-blur md:static md:bg-transparent md:py-0 lg:col-span-2">
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
      {pending ? "Enregistrement..." : "Enregistrer le compte-rendu"}
    </Button>
  );
}
