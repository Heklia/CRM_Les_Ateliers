import { redirect } from "next/navigation";
import { FollowUpsScreen } from "@/components/actions-a-realiser/follow-ups-screen";
import { getCurrentProfile } from "@/lib/auth/roles";
import { getReportingData } from "@/lib/reporting-data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ActionsARealiserPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/login");
  }

  const { followUps } = await getReportingData(supabase);

  return <FollowUpsScreen followUps={followUps} />;
}
