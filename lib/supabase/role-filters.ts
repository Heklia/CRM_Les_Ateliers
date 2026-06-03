import type { CurrentProfile } from "@/lib/auth/roles";

type CommercialScopedQuery<T> = T & {
  eq(column: "commercial_id", value: string): T;
};

export function scopeByCommercial<T>(
  query: CommercialScopedQuery<T>,
  profile: CurrentProfile
) {
  void profile;
  return query;
}
