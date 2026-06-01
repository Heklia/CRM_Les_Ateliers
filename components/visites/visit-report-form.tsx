"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Flame, Save, Snowflake, ThermometerSun } from "lucide-react";
import { createVisitReport } from "@/app/visites/new/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type ProspectOption = {
  id: string;
  company_name: string;
  city: string | null;
  status: string;
};

type ContactOption = {
  id: string;
  prospect_id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
};

const initialState: { error?: string } = {
  error: undefined
};

const interestOptions = [
  { icon: Snowflake, label: "Froid", value: "froid" },
  { icon: ThermometerSun, label: "Tiede", value: "tiede" },
  { icon: Flame, label: "Chaud", value: "chaud" }
] as const;

export function VisitReportForm({
  contacts,
  prospects
}: {
  contacts: ContactOption[];
  prospects: ProspectOption[];
}) {
  const [state, formAction] = useFormState(createVisitReport, initialState);
  const [selectedProspectId, setSelectedProspectId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const prospectContacts = useMemo(
    () => contacts.filter((contact) => contact.prospect_id === selectedProspectId),
    [contacts, selectedProspectId]
  );

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
          onChange={(event) => {
            setSelectedProspectId(event.target.value);
            setSelectedContactId("");
          }}
          required
          value={selectedProspectId}
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

      <label className="block text-sm font-medium">
        Personne concernee
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="contact_id"
          onChange={(event) => setSelectedContactId(event.target.value)}
          value={selectedContactId}
        >
          <option value="">Non renseignee</option>
          {prospectContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {formatContact(contact)}
            </option>
          ))}
          {selectedProspectId ? <option value="__new__">Creer un nouveau contact</option> : null}
        </select>
      </label>

      {selectedContactId === "__new__" ? (
        <div className="grid gap-4 rounded-md border border-border bg-background p-4 lg:col-span-2 lg:grid-cols-2">
          <Field label="Nom du nouveau contact" name="new_contact_name" required />
          <Field label="Fonction" name="new_contact_job_title" />
          <Field label="Telephone" name="new_contact_phone" />
          <Field label="Email" name="new_contact_email" type="email" />
        </div>
      ) : null}

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

      <details className="rounded-md border border-border p-3 lg:col-span-2">
        <summary className="cursor-pointer text-sm font-semibold">Detail du projet</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field
            label="Besoin identifie"
            name="besoins"
            placeholder="Besoin exprime ou observe"
            required
          />
          <Field
            label="k€ estime"
            min="0"
            name="budget_estime"
            placeholder="15"
            step="1"
            type="number"
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
            label="Delai projet"
            name="delai_projet"
            placeholder="Immediat, 3 mois, T4..."
          />
        </div>
      </details>

      <label className="block text-sm font-medium">
        Statut du prospect apres action
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="prospect_status"
          required
        >
          <option value="en_cours">En cours</option>
          <option value="qualifie">Qualifie</option>
          <option value="client">Client</option>
          <option value="perdu">Perdu</option>
        </select>
      </label>

      <div className="lg:col-span-2">
        <span className="block text-sm font-medium">Niveau d'interet</span>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {interestOptions.map((option) => {
            const Icon = option.icon;

            return (
              <label
                className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold hover:bg-background has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white"
                key={option.value}
              >
                <input
                  className="sr-only"
                  defaultChecked={option.value === "tiede"}
                  name="niveau_interet"
                  required
                  type="radio"
                  value={option.value}
                />
                <Icon size={18} />
                {option.label}
              </label>
            );
          })}
        </div>
      </div>

      <label className="block text-sm font-medium">
        Prochaine action
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="prochaine_etape"
          required
        >
          <option value="appel">Appel</option>
          <option value="email">Email</option>
          <option value="visite_terrain">Visite terrain</option>
          <option value="salon">Salon</option>
          <option value="autre">Autre</option>
        </select>
      </label>

      <Field label="Date prochaine action" name="prochaine_relance_at" type="date" />

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
        {pending ? "Enregistrement..." : "Enregistrer l'action"}
      </Button>
  );
}

function formatContact(contact: ContactOption) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  return [name || "Contact", contact.job_title].filter(Boolean).join(" - ");
}
