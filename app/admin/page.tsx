import { redirect } from "next/navigation";
import { AdminUsersScreen } from "@/components/admin/admin-users-screen";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  phone: string | null;
  is_active: boolean;
};

export default async function AdminPage() {
  const supabase = createClient() as any;
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, role, phone, is_active")
    .order("full_name", { ascending: true });

  const items = ((users ?? []) as UserRow[]).map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    phone: user.phone,
    isActive: user.is_active
  }));

  return (
    <main>
      <PageHeader
        title="Administration"
        description="Gestion des acces utilisateurs, roles et reinitialisation de mot de passe."
      />
      <AdminUsersScreen users={items} />
    </main>
  );
}
