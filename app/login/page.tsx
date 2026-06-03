import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { signIn } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export default function LoginPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const { error } = searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Connexion</h1>
            <p className="text-sm text-muted">Acces equipe commerciale</p>
          </div>
        </div>
        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Identifiants invalides.
          </p>
        ) : null}
        <form action={signIn} className="space-y-4">
          <Field label="Email" name="email" type="email" placeholder="prenom@entreprise.fr" />
          <Field label="Mot de passe" name="password" type="password" placeholder="********" />
          <div className="text-right">
            <Link className="text-sm font-medium text-primary hover:underline" href="/forgot-password">
              Mot de passe oublie ?
            </Link>
          </div>
          <Button className="w-full" type="submit">
            <Mail size={16} />
            Se connecter
          </Button>
        </form>
      </div>
    </main>
  );
}
