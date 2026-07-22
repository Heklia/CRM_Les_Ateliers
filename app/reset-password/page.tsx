import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { updatePassword } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const errorMessages: Record<string, string> = {
  short_password: "Le mot de passe doit contenir au moins 8 caracteres.",
  password_mismatch: "Les deux mots de passe ne correspondent pas.",
  update_failed: "Impossible de mettre a jour le mot de passe. Redemandez un lien de reinitialisation."
};

export default function ResetPasswordPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const errorMessage = searchParams.error ? errorMessages[searchParams.error] : null;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Nouveau mot de passe</h1>
            <p className="text-sm text-muted">Choisir un mot de passe securise</p>
          </div>
        </div>

        {errorMessage ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <form action={updatePassword} className="space-y-4">
          <Field
            label="Nouveau mot de passe"
            minLength={8}
            name="password"
            required
            type="password"
            placeholder="Minimum 8 caracteres"
          />
          <Field
            label="Confirmer le mot de passe"
            minLength={8}
            name="confirm_password"
            required
            type="password"
            placeholder="Retapez le mot de passe"
          />
          <Button className="w-full" type="submit">
            <KeyRound size={16} />
            Enregistrer le mot de passe
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
