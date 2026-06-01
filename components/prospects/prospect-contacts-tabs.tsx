"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Save } from "lucide-react";
import { createProspectContact } from "@/app/prospects/[id]/contacts/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type ContactItem = {
  id: string;
  name: string;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
};

const initialState: { error?: string } = {};

export function ProspectContactsTabs({
  contacts,
  prospectId
}: {
  contacts: ContactItem[];
  prospectId: string;
}) {
  const [activeTab, setActiveTab] = useState(contacts[0]?.id ?? "new");
  const activeContact = contacts.find((contact) => contact.id === activeTab);
  const showNewContact = activeTab === "new";

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Contacts</h2>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-3">
        {contacts.map((contact) => (
          <button
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              activeTab === contact.id
                ? "bg-primary text-white"
                : "border border-border bg-white text-muted hover:bg-background hover:text-foreground"
            }`}
            key={contact.id}
            onClick={() => setActiveTab(contact.id)}
            type="button"
          >
            {contact.name}
          </button>
        ))}
        <button
          aria-label="Creer un nouveau contact"
          className={`inline-flex size-10 items-center justify-center rounded-md ${
            showNewContact
              ? "bg-primary text-white"
              : "border border-border bg-white text-muted hover:bg-background hover:text-foreground"
          }`}
          onClick={() => setActiveTab("new")}
          type="button"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-4">
        {showNewContact ? (
          <NewContactForm prospectId={prospectId} />
        ) : activeContact ? (
          <dl className="space-y-3 text-sm">
            <InfoRow label="Nom du contact" value={activeContact.name} />
            <InfoRow label="Fonction du contact" value={activeContact.jobTitle ?? "Non renseignee"} />
            <InfoRow label="Telephone" value={activeContact.phone ?? "Non renseigne"} />
            <InfoRow label="Email" value={activeContact.email ?? "Non renseigne"} />
          </dl>
        ) : (
          <p className="text-sm text-muted">Aucun contact renseigne.</p>
        )}
      </div>
    </div>
  );
}

function NewContactForm({ prospectId }: { prospectId: string }) {
  const [state, formAction] = useFormState(createProspectContact, initialState);

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-2">
      <input name="prospect_id" type="hidden" value={prospectId} />

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 lg:col-span-2">
          {state.error}
        </p>
      ) : null}

      <Field label="Nom du contact" name="contact_name" required />
      <Field label="Fonction du contact" name="contact_job_title" />
      <Field label="Telephone" name="phone" />
      <Field label="Email" name="email" type="email" />

      <div className="flex justify-end lg:col-span-2">
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
      {pending ? "Creation..." : "Creer le contact"}
    </Button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
