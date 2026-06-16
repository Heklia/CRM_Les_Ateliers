"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Eye, History, Plus, Save } from "lucide-react";
import { createCommercialActionThread } from "@/app/actions-a-realiser/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import {
  commercialActionPriorityLabels,
  commercialActionTypeLabels,
  commercialProspectStatusLabels
} from "@/lib/constants";
import type { CurrentProfile } from "@/lib/auth/roles";
import type { CommercialActionPriority, CommercialActionType, CommercialProspectStatus } from "@/lib/types";

export type ActionThreadListItem = {
  id: string;
  prospectId: string;
  contactId: string | null;
  company: string;
  city: string | null;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  ownerName: string;
  currentActionType: string;
  currentDueDate: string;
  currentPriority: string;
  prospectStatus: string;
  currentComment: string | null;
  lastCompletedActionAt: string | null;
  lastAction: string;
};

export type ActionThreadOption = {
  prospects: { id: string; label: string }[];
  contacts: { id: string; prospectId: string; label: string }[];
  users: { id: string; label: string }[];
};

const initialState: { error?: string; success?: string } = {};

export function CommercialActionThreadsScreen({
  items,
  options,
  profile
}: {
  items: ActionThreadListItem[];
  options: ActionThreadOption;
  profile: CurrentProfile;
}) {
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState("");
  const canCreate = profile.role !== "lecteur";

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesQuery =
        normalized.length === 0 ||
        item.company.toLowerCase().includes(normalized) ||
        item.contactName.toLowerCase().includes(normalized);
      const matchesOwner = owner === "" || item.ownerName === owner;
      const matchesPriority = priority === "" || item.currentPriority === priority;

      return matchesQuery && matchesOwner && matchesPriority;
    });
  }, [items, owner, priority, query]);

  const owners = useMemo(
    () => Array.from(new Set(items.map((item) => item.ownerName))).sort(),
    [items]
  );

  return (
    <main>
      <PageHeader
        title="Actions a mener"
        description="Fiches actions actives uniques par couple client/contact, avec historique continu."
      />

      {canCreate ? <CreateThreadForm options={options} profile={profile} /> : null}

      <section className="mt-6 rounded-lg border border-border bg-surface shadow-soft">
        <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-3">
          <Field
            label="Recherche"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Client ou contact"
            value={query}
          />
          <label className="block text-sm font-medium">
            Commercial
            <select
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              onChange={(event) => setOwner(event.target.value)}
              value={owner}
            >
              <option value="">Tous</option>
              {owners.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Priorite
            <select
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              onChange={(event) => setPriority(event.target.value)}
              value={priority}
            >
              <option value="">Toutes</option>
              {Object.entries(commercialActionPriorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Client</th>
                <th>Contact</th>
                <th>Telephone</th>
                <th>Email</th>
                <th>Commercial</th>
                <th>Action</th>
                <th>Echeance</th>
                <th>Retard</th>
                <th>Priorite</th>
                <th>Statut prospect</th>
                <th>Derniere action</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr className="border-b border-border last:border-0 hover:bg-background" key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{item.company}</p>
                    {item.city ? <p className="text-xs text-muted">{item.city}</p> : null}
                  </td>
                  <td>{item.contactName}</td>
                  <td>{item.contactPhone ?? <span className="text-muted">Non renseigne</span>}</td>
                  <td>{item.contactEmail ?? <span className="text-muted">Non renseigne</span>}</td>
                  <td>{item.ownerName}</td>
                  <td>{commercialActionTypeLabels[item.currentActionType as CommercialActionType]}</td>
                  <td className={isOverdue(item.currentDueDate) ? "font-semibold text-amber-700" : "text-muted"}>
                    {formatDate(item.currentDueDate)}
                  </td>
                  <td>
                    <StatusPill tone={isOverdue(item.currentDueDate) ? "warning" : "success"}>
                      {isOverdue(item.currentDueDate) ? "Oui" : "Non"}
                    </StatusPill>
                  </td>
                  <td>{commercialActionPriorityLabels[item.currentPriority as CommercialActionPriority]}</td>
                  <td>{commercialProspectStatusLabels[item.prospectStatus as CommercialProspectStatus]}</td>
                  <td>{item.lastAction}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold hover:bg-background"
                        href={`/actions-a-realiser/${item.id}`}
                      >
                        <History size={16} />
                        Historique
                      </Link>
                      <Link
                        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white"
                        href={`/actions-a-realiser/${item.id}#realiser`}
                      >
                        <Eye size={16} />
                        Realiser
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            Aucune fiche action active ne correspond aux filtres.
          </div>
        ) : null}
      </section>
    </main>
  );
}

function CreateThreadForm({
  options,
  profile
}: {
  options: ActionThreadOption;
  profile: CurrentProfile;
}) {
  const [state, formAction] = useFormState(createCommercialActionThread, initialState);
  const [prospectId, setProspectId] = useState("");
  const contacts = options.contacts.filter((contact) => contact.prospectId === prospectId);

  return (
    <details className="rounded-lg border border-border bg-surface p-5 shadow-soft">
      <summary className="flex cursor-pointer items-center gap-2 text-base font-semibold">
        <Plus size={18} />
        Creer une premiere fiche action
      </summary>
      <form action={formAction} className="mt-4 grid gap-4 lg:grid-cols-3">
        <FormMessage state={state} />
        <label className="block text-sm font-medium">
          Client
          <select
            className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            name="prospect_id"
            onChange={(event) => setProspectId(event.target.value)}
            required
            value={prospectId}
          >
            <option value="">Selectionner</option>
            {options.prospects.map((prospect) => (
              <option key={prospect.id} value={prospect.id}>
                {prospect.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Contact
          <select
            className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            name="contact_id"
            required
          >
            <option value="">Selectionner</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Commercial responsable
          <select
            className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            defaultValue={profile.id}
            name="owner_user_id"
            required
          >
            {options.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </label>
        <ActionTypeSelect label="Action a mener" name="current_action_type" />
        <Field label="Date d'echeance" name="current_due_date" required type="datetime-local" />
        <PrioritySelect name="current_priority" />
        <ProspectStatusSelect name="prospect_status" />
        <div className="lg:col-span-2">
          <Field label="Commentaire" name="current_comment" textarea />
        </div>
        <div className="flex items-end justify-end lg:col-span-3">
          <SubmitButton label="Creer la fiche" />
        </div>
      </form>
    </details>
  );
}

function ActionTypeSelect({ label, name }: { label: string; name: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        name={name}
        required
      >
        {Object.entries(commercialActionTypeLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PrioritySelect({ name }: { name: string }) {
  return (
    <label className="block text-sm font-medium">
      Priorite
      <select
        className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        defaultValue="normale"
        name={name}
        required
      >
        {Object.entries(commercialActionPriorityLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProspectStatusSelect({ name }: { name: string }) {
  return (
    <label className="block text-sm font-medium">
      Statut prospect
      <select
        className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        defaultValue="a_qualifier"
        name={name}
        required
      >
        {Object.entries(commercialProspectStatusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      <Save size={16} />
      {pending ? "Enregistrement..." : label}
    </Button>
  );
}

function FormMessage({ state }: { state: { error?: string; success?: string } }) {
  if (!state.error && !state.success) return null;

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm lg:col-span-3 ${
        state.error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

function isOverdue(value: string) {
  return getDateKey(value) < getDateKey(new Date().toISOString());
}

function getDateKey(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
