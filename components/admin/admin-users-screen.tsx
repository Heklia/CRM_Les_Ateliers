"use client";

import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, Save, UserPlus } from "lucide-react";
import { createUser, sendPasswordReset, updateUser } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { AppRole } from "@/lib/auth/roles";

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  phone: string | null;
  isActive: boolean;
};

const initialState: { error?: string; success?: string } = {};
const roleOptions: { label: string; value: AppRole }[] = [
  { label: "Lecteur", value: "lecteur" },
  { label: "Modification", value: "modification" },
  { label: "Admin", value: "admin" }
];

export function AdminUsersScreen({ users }: { users: AdminUser[] }) {
  const [createState, createAction] = useFormState(createUser, initialState);

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-base font-semibold">Creer un utilisateur</h2>
        <form action={createAction} className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormMessage state={createState} />
          <Field label="Email" name="email" required type="email" />
          <Field label="Nom complet" name="full_name" required />
          <Field label="Telephone" name="phone" />
          <Field label="Mot de passe temporaire" minLength={8} name="password" required type="password" />
          <RoleSelect />
          <div className="flex items-end justify-end lg:col-span-2">
            <SubmitButton icon="create" label="Creer l'utilisateur" />
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-base font-semibold">Utilisateurs</h2>
        <div className="mt-4 grid gap-4">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>
      </section>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const [updateState, updateAction] = useFormState(updateUser, initialState);
  const [resetState, resetAction] = useFormState(sendPasswordReset, initialState);

  return (
    <article className="rounded-md border border-border p-4">
      <form action={updateAction} className="grid gap-4 lg:grid-cols-5">
        <input name="user_id" type="hidden" value={user.id} />
        <FormMessage state={updateState} />
        <Field defaultValue={user.email} label="Email" name="email" required type="email" />
        <Field defaultValue={user.fullName} label="Nom" name="full_name" required />
        <Field defaultValue={user.phone ?? ""} label="Telephone" name="phone" />
        <RoleSelect defaultValue={user.role} />
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input defaultChecked={user.isActive} name="is_active" type="checkbox" />
          Actif
        </label>
        <div className="flex flex-wrap justify-end gap-2 lg:col-span-5">
          <SubmitButton icon="save" label="Enregistrer" />
        </div>
      </form>

      <form action={resetAction} className="mt-3 flex justify-end">
        <input name="email" type="hidden" value={user.email} />
        <ResetMessage state={resetState} />
        <Button type="submit" variant="secondary">
          <KeyRound size={16} />
          Envoyer reset mot de passe
        </Button>
      </form>
    </article>
  );
}

function RoleSelect({ defaultValue = "modification" }: { defaultValue?: AppRole }) {
  return (
    <label className="block text-sm font-medium">
      Role
      <select
        className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        defaultValue={defaultValue}
        name="role"
      >
        {roleOptions.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({ icon, label }: { icon: "create" | "save"; label: string }) {
  const { pending } = useFormStatus();
  const Icon = icon === "create" ? UserPlus : Save;

  return (
    <Button disabled={pending} type="submit">
      <Icon size={16} />
      {pending ? "Enregistrement..." : label}
    </Button>
  );
}

function FormMessage({ state }: { state: { error?: string; success?: string } }) {
  if (!state.error && !state.success) return null;

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm lg:col-span-5 ${
        state.error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

function ResetMessage({ state }: { state: { error?: string; success?: string } }) {
  if (!state.error && !state.success) return null;

  return (
    <p className={`mr-3 self-center text-sm ${state.error ? "text-red-700" : "text-emerald-700"}`}>
      {state.error ?? state.success}
    </p>
  );
}
