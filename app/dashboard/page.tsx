import { redirect } from "next/navigation";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import { getCurrentProfile } from "@/lib/auth/roles";
import { getReportingData } from "@/lib/reporting-data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const data = await getReportingData(supabase);

  return <DashboardScreen profile={profile} {...data} />;
}
