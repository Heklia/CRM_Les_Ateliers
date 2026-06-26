"use client";

import { useFormState, useFormStatus } from "react-dom";
import { FileDown, Upload } from "lucide-react";
import { importQuotes } from "@/app/pipeline/import/actions";
import { Button } from "@/components/ui/button";

const initialState: {
  error?: string;
  success?: string;
  details?: string[];
} = {};

const csvTemplate = [
  "Code_Représentant;Code Devis;Date;Date de relance à réaliser;Etat;Taux de concrétisation;Entreprise(ou nom_client);Sujet;Temps total;déboursé total;total HT Net;Date de concrétisation;Téléphone",
  "REP01;D-2026-001;26/06/2026;03/07/2026;Devis envoyé;70;Exemple Paysage;Cuisine exterieure sur mesure;4;1200;25000;;0600000000"
].join("\n");

export function ImportQuotesForm() {
  const [state, formAction] = useFormState(importQuotes, initialState);

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-soft">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-base font-semibold">Fichier CSV devis</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Les devis importes alimentent directement les opportunites du pipeline. Le code representant rattache le devis au bon utilisateur.
          </p>

          <a
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-background"
            download="modele-import-devis.csv"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`}
          >
            <FileDown size={16} />
            Telecharger un modele
          </a>
        </div>

        <form action={formAction} className="grid gap-4">
          {state.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <p className="font-semibold">{state.error}</p>
              {state.details?.length ? <Details items={state.details} /> : null}
            </div>
          ) : null}

          {state.success ? (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <p className="font-semibold">{state.success}</p>
              {state.details?.length ? <Details items={state.details} /> : null}
            </div>
          ) : null}

          <label className="block text-sm font-medium">
            Fichier a importer
            <input
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-md border border-border bg-white p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              name="file"
              required
              type="file"
            />
          </label>

          <div className="rounded-md border border-border bg-background p-4 text-sm text-muted">
            <p className="font-medium text-foreground">Colonnes reconnues</p>
            <p className="mt-2">Obligatoires : Entreprise(ou nom_client), Code Devis ou Sujet, total HT Net.</p>
            <p>Le Code_Représentant doit correspondre au code saisi sur la fiche utilisateur.</p>
          </div>

          <SubmitButton />
        </form>
      </div>
    </section>
  );
}

function Details({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-inside list-disc space-y-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full md:w-auto md:justify-self-start" disabled={pending} type="submit">
      <Upload size={16} />
      {pending ? "Import en cours..." : "Importer les devis"}
    </Button>
  );
}
