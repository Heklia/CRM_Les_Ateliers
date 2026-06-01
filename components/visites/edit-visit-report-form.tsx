"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { updateVisitReport } from "@/app/visites/[id]/edit/actions";
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

type VisitValue = {
  id: string;
  prospectId: string;
  contactId: string | null;
  visitDate: string;
  type: string;
  peopleMet: string | null;
  need: string;
  pain: string | null;
  application: string | null;
  material: string | null;
  budget: number | null;
  timeline: string | null;
  interest: "froid" | "tiede" | "chaud";
  prospectStatus: string;
  nextStep: string;
  followUpAt: string | null;
  comment: string | null;
};

const initialState: { error?: string } = {};

export function EditVisitReportForm({
  contacts,
  prospects,
  visit
}: {
  contacts: ContactOption[];
  prospects: ProspectOption[];
  visit: VisitValue;
}) {
  const [state, formAction] = useFormState(updateVisitReport, initialState);
  const [selectedProspectId, setSelectedProspectId] = useState(visit.prospectId);
  const [selectedContactId, setSelectedContactId] = useState(visit.contactId ?? "");
  const prospectContacts = useMemo(
    () => contacts.filter((contact) => contact.prospect_id === selectedProspectId),
    [contacts, selectedProspectId]
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-soft sm:p-5 lg:grid-cols-2"
    >
      <input name="visit_id" type="hidden" value={visit.id} />

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

      <Field
        defaultValue={toDateTimeLocal(visit.visitDate)}
        label="Date de visite"
        name="visite_date"
        required
        type="datetime-local"
      />

      <label className="block text-sm font-medium">
        Type de contact
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          defaultValue={visit.type}
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

      <label className="block text-sm font-medium">
        Statut du prospect apres action
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          defaultValue={visit.prospectStatus}
          name="prospect_status"
          required
        >
          <option value="en_cours">En cours</option>
          <option value="qualifie">Qualifie</option>
          <option value="client">Client</option>
          <option value="perdu">Perdu</option>
        </select>
      </label>

      <Field
        defaultValue={visit.need}
        label="Besoin identifie"
        name="besoins"
        required
      />
      <Field
        defaultValue={visit.nextStep}
        label="Prochaines actions"
        name="prochaine_etape"
        required
      />

      <label className="block text-sm font-medium">
        Niveau d'interet
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          defaultValue={visit.interest}
          name="niveau_interet"
          required
        >
          <option value="froid">Froid</option>
          <option value="tiede">Tiede</option>
          <option value="chaud">Chaud</option>
        </select>
      </label>

      <Field
        defaultValue={visit.followUpAt ? toDateTimeLocal(visit.followUpAt) : ""}
        label="Date de l'action a realiser"
        name="prochaine_relance_at"
        type="datetime-local"
      />

      <details className="rounded-md border border-border p-3 lg:col-span-2" open>
        <summary className="cursor-pointer text-sm font-semibold">Details projet</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field
            defaultValue={visit.peopleMet ?? ""}
            label="Personnes rencontrees"
            name="personnes_rencontrees"
          />
          <Field
            defaultValue={visit.pain ?? ""}
            label="Douleur principale"
            name="freins"
          />
          <Field
            defaultValue={visit.application ?? ""}
            label="Application envisagee"
            name="application_envisagee"
          />
          <Field
            defaultValue={visit.material ?? ""}
            label="Matiere ou procede concerne"
            name="matiere_procede"
          />
          <Field
            defaultValue={visit.budget ?? ""}
            label="Budget estime"
            min="0"
            name="budget_estime"
            step="100"
            type="number"
          />
          <Field
            defaultValue={visit.timeline ?? ""}
            label="Delai projet"
            name="delai_projet"
          />
        </div>
      </details>

      <div className="lg:col-span-2">
        <Field
          defaultValue={visit.comment ?? ""}
          label="Commentaire libre"
          name="commentaire"
          textarea
        />
      </div>

      <div className="sticky bottom-20 z-20 flex justify-end bg-surface/95 py-2 backdrop-blur md:static md:bg-transparent md:py-0 lg:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function formatContact(contact: ContactOption) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  return [name || "Contact", contact.job_title].filter(Boolean).join(" - ");
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

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
