"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Flame, Save, Snowflake, ThermometerSun } from "lucide-react";
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

type VisitValue = {
  id: string;
  prospectId: string;
  opportunityId: string | null;
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

const interestOptions = [
  { icon: Snowflake, label: "Froid", value: "froid" },
  { icon: ThermometerSun, label: "Tiede", value: "tiede" },
  { icon: Flame, label: "Chaud", value: "chaud" }
] as const;

const nextActionValues = ["appel", "email", "visite_terrain", "salon", "autre"] as const;

export function EditVisitReportForm({
  contacts,
  opportunities,
  prospects,
  visit
}: {
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
  prospects: ProspectOption[];
  visit: VisitValue;
}) {
  const [state, formAction] = useFormState(updateVisitReport, initialState);
  const [selectedProspectId, setSelectedProspectId] = useState(visit.prospectId);
  const [selectedContactId, setSelectedContactId] = useState(visit.contactId ?? "");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(visit.opportunityId ?? "");
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
            setSelectedOpportunityId("");
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

      <label className="block text-sm font-medium">
        Opportunite liee
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          name="opportunite_id"
          onChange={(event) => setSelectedOpportunityId(event.target.value)}
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

      <details className="rounded-md border border-border p-3 lg:col-span-2" open>
        <summary className="cursor-pointer text-sm font-semibold">Detail du projet</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field
            defaultValue={visit.need}
            label="Besoin identifie"
            name="besoins"
            required
          />
          <Field
            defaultValue={visit.budget ?? ""}
            label="k€ estime"
            min="0"
            name="budget_estime"
            step="1"
            type="number"
          />
          <Field
            defaultValue={visit.pain ?? ""}
            label="Douleur principale"
            name="freins"
          />
          <Field
            defaultValue={visit.material ?? ""}
            label="Matiere ou procede concerne"
            name="matiere_procede"
          />
          <Field
            defaultValue={visit.timeline ?? ""}
            label="Delai du projet"
            name="delai_projet"
            type="date"
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
                      className="sr-only"
                      defaultChecked={option.value === visit.interest}
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
        </div>
      </details>

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

      <label className="block text-sm font-medium">
        Prochaine action
        <select
          className="mt-1 h-12 w-full rounded-md border border-border bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:h-10 sm:text-sm"
          defaultValue={getNextActionValue(visit.nextStep)}
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

      <Field
        defaultValue={visit.followUpAt ? toDate(visit.followUpAt) : ""}
        label="Date prochaine action"
        name="prochaine_relance_at"
        type="date"
      />

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

function toDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function getNextActionValue(value: string) {
  return nextActionValues.includes(value as (typeof nextActionValues)[number])
    ? value
    : "appel";
}
