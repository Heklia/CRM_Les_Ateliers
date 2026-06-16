"use client";

import type { ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Edit3, Save, XCircle } from "lucide-react";
import { closeCommercialActionAsLost, completeCommercialActionThread, updateCurrentCommercialAction } from "@/app/actions-a-realiser/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import {
  commercialActionPriorityLabels,
  commercialActionThreadStatusLabels,
  commercialActionTypeLabels,
  commercialProspectStatusLabels
} from "@/lib/constants";
import type { CurrentProfile } from "@/lib/auth/roles";
import type { CommercialActionPriority, CommercialActionThreadStatus, CommercialActionType, CommercialProspectStatus } from "@/lib/types";

type DetailProps = {
  contact: {
    id: string;
    name: string;
    jobTitle: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  events: {
    id: string;
    completedAt: string;
    actionType: string;
    result: string | null;
    report: string | null;
    prospectStatusAfterAction: string;
    nextActionType: string | null;
    nextDueDate: string | null;
    priorityAfterAction: string | null;
    createdBy: string;
  }[];
  ownerName: string;
  profile: CurrentProfile;
  prospect: {
    id: string;
    companyName: string;
    city: string | null;
    website: string | null;
  };
  thread: {
    id: string;
    currentActionType: string;
    currentDueDate: string;
    currentPriority: string;
    currentStatus: string;
    prospectStatus: string;
    currentComment: string | null;
    lastCompletedActionAt: string | null;
    closedAt: string | null;
    closedReason: string | null;
  };
};

const initialState: { error?: string; success?: string } = {};

export function CommercialActionThreadDetail({
  contact,
  events,
  ownerName,
  profile,
  prospect,
  thread
}: DetailProps) {
  const canModify = profile.role !== "lecteur" && thread.currentStatus === "active";

  return (
    <>
      <PageHeader
        title={`${prospect.companyName} - ${contact?.name ?? "Contact non renseigne"}`}
        description="Fiche action continue avec historique du couple client/contact."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoBlock title="Client">
          <InfoRow label="Entreprise" value={prospect.companyName} />
          <InfoRow label="Ville" value={prospect.city ?? "Non renseignee"} />
          <InfoRow label="Site" value={prospect.website ?? "Non renseigne"} />
        </InfoBlock>

        <InfoBlock title="Contact">
          <InfoRow label="Nom" value={contact?.name ?? "Non renseigne"} />
          <InfoRow label="Fonction" value={contact?.jobTitle ?? "Non renseignee"} />
          <InfoRow label="Telephone" value={contact?.phone ?? "Non renseigne"} />
          <InfoRow label="Email" value={contact?.email ?? "Non renseigne"} />
        </InfoBlock>

        <InfoBlock title="Action en cours">
          <InfoRow label="Commercial" value={ownerName} />
          <InfoRow label="Action" value={commercialActionTypeLabels[thread.currentActionType as CommercialActionType]} />
          <InfoRow label="Echeance" value={formatDateTime(thread.currentDueDate)} />
          <InfoRow label="Priorite" value={commercialActionPriorityLabels[thread.currentPriority as CommercialActionPriority]} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Statut fiche</span>
            <StatusPill tone={thread.currentStatus === "active" ? "success" : "neutral"}>
              {commercialActionThreadStatusLabels[thread.currentStatus as CommercialActionThreadStatus]}
            </StatusPill>
          </div>
          <InfoRow
            label="Statut prospect"
            value={commercialProspectStatusLabels[thread.prospectStatus as CommercialProspectStatus]}
          />
        </InfoBlock>
      </section>

      {canModify ? (
        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <CompleteActionForm thread={thread} />
          <UpdateCurrentActionForm thread={thread} />
          <CloseLostForm threadId={thread.id} />
        </section>
      ) : null}

      <section className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-base font-semibold">Timeline historique</h2>
        <div className="mt-5 space-y-4">
          {events.length ? (
            events.map((event) => (
              <article className="rounded-md border border-border p-4" key={event.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {commercialActionTypeLabels[event.actionType as CommercialActionType]} - {formatDateTime(event.completedAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted">{event.createdBy}</p>
                  </div>
                  <StatusPill>
                    {commercialProspectStatusLabels[event.prospectStatusAfterAction as CommercialProspectStatus]}
                  </StatusPill>
                </div>
                {event.result ? <p className="mt-3 text-sm"><span className="font-semibold">Resultat : </span>{event.result}</p> : null}
                {event.report ? <p className="mt-2 text-sm text-muted">{event.report}</p> : null}
                {event.nextActionType ? (
                  <p className="mt-2 text-xs text-muted">
                    Prochaine action prevue a l'epoque : {commercialActionTypeLabels[event.nextActionType as CommercialActionType]}
                    {event.nextDueDate ? ` le ${formatDateTime(event.nextDueDate)}` : ""}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-sm text-muted">Aucune action realisee pour ce couple client/contact.</p>
          )}
        </div>
      </section>
    </>
  );
}

function CompleteActionForm({ thread }: { thread: DetailProps["thread"] }) {
  const [state, action] = useFormState(completeCommercialActionThread, initialState);

  return (
    <form action={action} className="rounded-lg border border-border bg-surface p-5 shadow-soft" id="realiser">
      <input name="thread_id" type="hidden" value={thread.id} />
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <CheckCircle2 size={18} />
        Realiser l'action
      </h2>
      <FormMessage state={state} />
      <div className="mt-4 grid gap-4">
        <Field defaultValue={getCurrentDateTimeLocal()} label="Date de realisation" name="completed_at" required type="datetime-local" />
        <ActionTypeSelect defaultValue={thread.currentActionType} label="Type d'action realisee" name="action_type" />
        <Field label="Resultat" name="result" placeholder="Ex : contact interesse, devis demande..." />
        <Field label="Compte-rendu" name="report" textarea />
        <ProspectStatusSelect name="prospect_status_after_action" />
        <ActionTypeSelect label="Prochaine action" name="next_action_type" />
        <Field label="Nouvelle date d'echeance" name="next_due_date" type="datetime-local" />
        <PrioritySelect defaultValue={thread.currentPriority} name="priority_after_action" />
        <Field label="Commentaire prochain suivi" name="current_comment" textarea />
        <SubmitButton label="Valider l'action" />
      </div>
    </form>
  );
}

function UpdateCurrentActionForm({ thread }: { thread: DetailProps["thread"] }) {
  const [state, action] = useFormState(updateCurrentCommercialAction, initialState);

  return (
    <form action={action} className="rounded-lg border border-border bg-surface p-5 shadow-soft">
      <input name="thread_id" type="hidden" value={thread.id} />
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Edit3 size={18} />
        Modifier la prochaine action
      </h2>
      <FormMessage state={state} />
      <div className="mt-4 grid gap-4">
        <ActionTypeSelect defaultValue={thread.currentActionType} label="Action a mener" name="current_action_type" />
        <Field defaultValue={toDateTimeLocal(thread.currentDueDate)} label="Date d'echeance" name="current_due_date" required type="datetime-local" />
        <PrioritySelect defaultValue={thread.currentPriority} name="current_priority" />
        <ProspectStatusSelect defaultValue={thread.prospectStatus} name="prospect_status" />
        <Field defaultValue={thread.currentComment ?? ""} label="Commentaire" name="current_comment" textarea />
        <SubmitButton label="Modifier" />
      </div>
    </form>
  );
}

function CloseLostForm({ threadId }: { threadId: string }) {
  const [state, action] = useFormState(closeCommercialActionAsLost, initialState);

  return (
    <form action={action} className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-soft xl:col-span-2">
      <input name="thread_id" type="hidden" value={threadId} />
      <h2 className="flex items-center gap-2 text-base font-semibold text-red-900">
        <XCircle size={18} />
        Cloturer comme perdu
      </h2>
      <FormMessage state={state} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        <Field label="Date de cloture" name="completed_at" type="datetime-local" />
        <Field label="Raison" name="closed_reason" placeholder="Motif de cloture" />
        <div className="flex items-end">
          <SubmitButton label="Cloturer perdu" />
        </div>
      </div>
    </form>
  );
}

function InfoBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 space-y-3 text-sm">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ActionTypeSelect({
  defaultValue,
  label,
  name
}: {
  defaultValue?: string;
  label: string;
  name: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        defaultValue={defaultValue}
        name={name}
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

function PrioritySelect({ defaultValue = "normale", name }: { defaultValue?: string; name: string }) {
  return (
    <label className="block text-sm font-medium">
      Priorite
      <select
        className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        defaultValue={defaultValue}
        name={name}
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

function ProspectStatusSelect({ defaultValue = "relance_a_faire", name }: { defaultValue?: string; name: string }) {
  return (
    <label className="block text-sm font-medium">
      Statut prospect apres action
      <select
        className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        defaultValue={defaultValue}
        name={name}
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
      className={`mt-3 rounded-md border px-3 py-2 text-sm ${
        state.error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

function getCurrentDateTimeLocal() {
  return toDateTimeLocal(new Date().toISOString());
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
