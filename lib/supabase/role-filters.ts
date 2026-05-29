import { canSeeTeamData, type CurrentProfile } from "@/lib/auth/roles";

type CommercialScopedQuery<T> = T & {
  eq(column: "commercial_id", value: string): T;
};

export function scopeByCommercial<T>(
  query: CommercialScopedQuery<T>,
  profile: CurrentProfile
) {
  if (canSeeTeamData(profile)) {
    return query;
  }

  return query.eq("commercial_id", profile.id);
}
