import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { requestPasswordReset } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export default function ForgotPasswordPage({
  searchParams
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { error, success } = searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Mot de passe oublie</h1>
            <p className="text-sm text-muted">Recevoir un lien de reinitialisation</p>
          </div>
        </div>

        {success ? (
          <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Email de reinitialisation envoye si cette adresse existe.
          </p>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Impossible d'envoyer l'email. Verifiez l'adresse saisie.
          </p>
        ) : null}

        <form action={requestPasswordReset} className="space-y-4">
          <Field label="Email" name="email" required type="email" placeholder="prenom@entreprise.fr" />
          <Button className="w-full" type="submit">
            <Mail size={16} />
            Envoyer le lien
          </Button>
        </form>

        <Link
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground"
          href="/login"
        >
          <ArrowLeft size={16} />
          Retour a la connexion
        </Link>
      </div>
    </main>
  );
}
