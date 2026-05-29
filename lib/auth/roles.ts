export type AppRole = "admin" | "manager" | "commercial";

export type CurrentProfile = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
};

type SupabaseProfileClient = {
  auth: {
    getUser: () => Promise<{
      data: {
        user: {
          id: string;
          email?: string;
          user_metadata?: { full_name?: string; name?: string };
        } | null;
      };
      error: unknown;
    }>;
  };
  from: (table: "users") => {
    select: (columns: string) => {
      eq: (column: "id", value: string) => {
        single: () => Promise<{
          data: {
            id: string;
            email: string;
            full_name: string;
            role: AppRole;
          } | null;
        }>;
      };
    };
  };
};

export async function getCurrentProfile(supabase: SupabaseProfileClient): Promise<CurrentProfile | null> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? "",
      full_name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "Commercial",
      role: "commercial"
    };
  }

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role
  };
}

export function canAccessCommercialData(profile: CurrentProfile, commercialId: string) {
  return profile.role === "admin" || profile.role === "manager" || profile.id === commercialId;
}

export function canSeeTeamData(profile: CurrentProfile) {
  return profile.role === "admin" || profile.role === "manager";
}
