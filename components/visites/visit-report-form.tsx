"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Flame, History, Save, Snowflake, ThermometerSun } from "lucide-react";
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

type OpportunityOption = {
  id: string;
  prospect_id: string;
  title: string;
  stage: string;
  description: string | null;
  estimated_value: number | null;
  expected_close_date: string | null;
  probability: number;
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

const interestOptions = [
  { icon: Snowflake, label: "Froid", value: "froid" },
  { icon: ThermometerSun, label: "Tiede", value: "tiede" },
  { icon: Flame, label: "Chaud", value: "chaud" }
] as const;

export function VisitReportForm({
  contacts,
  initialOpportunityId = "",
  initialProspectId = "",
  opportunities,
  previousAction,
  prospects
}: {
  contacts: ContactOption[];
  initialOpportunityId?: string;
  initialProspectId?: string;
  opportunities: OpportunityOption[];
  previousAction?: PreviousAction | null;
  prospects: ProspectOption[];
}) {
  const [state, formAction] = useFormState(createVisitReport, initialState);
  const [selectedProspectId, setSelectedProspectId] = useState(initialProspectId);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(initialOpportunityId);
  const initialOpportunity = opportunities.find((item) => item.id === initialOpportunityId);
  const [need, setNeed] = useState(initialOpportunity?.title ?? "");
  const [pain, setPain] = useState(initialOpportunity?.description ?? "");
  const [budget, setBudget] = useState(
    initialOpportunity?.estimated_value === null || initialOpportunity?.estimated_value === undefined
      ? ""
      : String(initialOpportunity.estimated_value / 1000)
  );
  const [timeline, setTimeline] = useState(initialOpportunity?.expected_close_date ?? "");
  const [interest, setInterest] = useState(toInterestValue(initialOpportunity?.probability));
  const prospectContacts = useMemo(
    () => contacts.filter((contact) => contact.prospect_id === selectedProspectId),
    [contacts, selectedProspectId]
  );
  const prospectOpportunities = useMemo(
    () => opportunities.filter((opportunity) => opportunity.prospect_id === selectedProspectId),
    [opportunities, selectedProspectId]
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

      <label className="block text-sm font-medium">
        Prospect
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="prospect_id"
          onChange={(event) => {
            setSelectedProspectId(event.target.value);
            setSelectedContactId("");
            setSelectedOpportunityId("");
            setNeed("");
            setPain("");
            setBudget("");
            setTimeline("");
            setInterest("tiede");
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

      <label className="block text-sm font-medium">
        Opportunite liee
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="opportunite_id"
          onChange={(event) => {
            const opportunity = opportunities.find((item) => item.id === event.target.value);
            setSelectedOpportunityId(event.target.value);
            if (opportunity) {
              setNeed(opportunity.title);
              setPain(opportunity.description ?? "");
              setBudget(opportunity.estimated_value === null ? "" : String(opportunity.estimated_value / 1000));
              setTimeline(opportunity.expected_close_date ?? "");
              setInterest(toInterestValue(opportunity.probability));
            }
          }}
          value={selectedOpportunityId}
        >
          <option value="">Aucune opportunite</option>
          {prospectOpportunities.map((opportunity) => (
            <option key={opportunity.id} value={opportunity.id}>
              {opportunity.title}
            </option>
          ))}
        </select>
      </label>

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

      <details className="rounded-md border border-border p-3 lg:col-span-2">
        <summary className="cursor-pointer text-sm font-semibold">Detail du projet</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field
            label="Besoin identifie"
            name="besoins"
            onChange={(event) => setNeed(event.target.value)}
            placeholder="Besoin exprime ou observe"
            value={need}
          />
          <Field
            label="k€ estime"
            min="0"
            name="budget_estime"
            onChange={(event) => setBudget(event.target.value)}
            placeholder="15"
            step="1"
            type="number"
            value={budget}
          />
          <Field
            label="Douleur principale"
            name="freins"
            onChange={(event) => setPain(event.target.value)}
            placeholder="Probleme, contrainte, frein actuel"
            value={pain}
          />
          <Field
            label="Matiere ou procede concerne"
            name="matiere_procede"
            placeholder="Usinage 3D, rotomoulage, mineral, composite..."
          />
          <Field
            label="Delai du projet"
            name="delai_projet"
            onChange={(event) => setTimeline(event.target.value)}
            type="date"
            value={timeline}
          />
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
                      checked={option.value === interest}
                      className="sr-only"
                      name="niveau_interet"
                      onChange={() => setInterest(option.value)}
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

function toInterestValue(probability?: number | null) {
  if ((probability ?? 0) >= 70) return "chaud";
  if ((probability ?? 0) >= 35) return "tiede";
  return "froid";
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
