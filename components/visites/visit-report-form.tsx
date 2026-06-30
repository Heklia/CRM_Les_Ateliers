"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { History, Save } from "lucide-react";
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

type PreviousAction = {
  title: string;
  date: string;
  type: string;
  summary: string | null;
  comment: string | null;
  contact: string | null;
};

const initialState: { error?: string } = {
  error: undefined
};

export function VisitReportForm({
  contacts,
  followUpId = "",
  initialOpportunityId = "",
  initialProspectId = "",
  previousAction,
  prospects
}: {
  contacts: ContactOption[];
  followUpId?: string;
  initialOpportunityId?: string;
  initialProspectId?: string;
  previousAction?: PreviousAction | null;
  prospects: ProspectOption[];
}) {
  const [state, formAction] = useFormState(createVisitReport, initialState);
  const [selectedProspectId, setSelectedProspectId] = useState(initialProspectId);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [prospectStatus, setProspectStatus] = useState("en_cours");
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

      {previousAction ? <PreviousActionReminder previousAction={previousAction} /> : null}
      {followUpId ? <input name="follow_up_id" type="hidden" value={followUpId} /> : null}
      {initialOpportunityId ? (
        <input name="opportunite_id" type="hidden" value={initialOpportunityId} />
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

      <Field
        defaultValue={getCurrentDateTimeLocal()}
        label="Date de visite"
        name="visite_date"
        required
        type="datetime-local"
      />

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

      <div className="lg:col-span-2">
        <Field
          label="Commentaire libre"
          name="commentaire"
          placeholder="Notes complementaires, contexte, resultat de l'echange..."
          textarea
        />
      </div>

      <label className="block text-sm font-medium">
        Statut du prospect apres action
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="prospect_status"
          onChange={(event) => setProspectStatus(event.target.value)}
          required
          value={prospectStatus}
        >
          <option value="en_cours">En cours</option>
          <option value="qualifie">Qualifie</option>
          <option value="client">Client</option>
          <option value="perdu">Perdu</option>
        </select>
      </label>

      {prospectStatus !== "perdu" ? (
        <>
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
              <option value="devis">Devis</option>
              <option value="autre">Autre</option>
            </select>
          </label>

          <Field label="Date prochaine action" name="prochaine_relance_at" type="date" />
        </>
      ) : (
        <p className="rounded-md border border-border bg-background px-3 py-3 text-sm text-muted">
          Prospect perdu : aucune prochaine action ne sera creee.
        </p>
      )}

      <div className="sticky bottom-20 z-20 flex justify-end bg-surface/95 py-2 backdrop-blur md:static md:bg-transparent md:py-0 lg:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function PreviousActionReminder({ previousAction }: { previousAction: PreviousAction }) {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm lg:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-amber-700">
            <History size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-amber-950">Rappel de l'action precedente</h2>
            <p className="mt-1 text-amber-900">
              {formatActionType(previousAction.type)} - {formatDate(previousAction.date)}
            </p>
            {previousAction.contact ? (
              <p className="mt-1 text-amber-900">{previousAction.contact}</p>
            ) : null}
          </div>
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-800">
          {previousAction.title}
        </span>
      </div>

      {previousAction.summary ? (
        <p className="mt-3 rounded-md bg-white/70 p-3 text-amber-950">{previousAction.summary}</p>
      ) : null}
      {previousAction.comment ? (
        <p className="mt-2 text-amber-900">
          <span className="font-semibold">Commentaire : </span>
          {previousAction.comment}
        </p>
      ) : null}
    </section>
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

function getCurrentDateTimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatActionType(value: string) {
  const labels: Record<string, string> = {
    appel: "Appel",
    email: "Email",
    visite_terrain: "Visite terrain",
    salon: "Salon",
    autre: "Autre"
  };

  return labels[value] ?? value;
}
