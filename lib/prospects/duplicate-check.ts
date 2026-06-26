export const duplicateProspectMessage =
  "Un prospect existe deja avec le meme nom d'entreprise et le meme code postal.";

export function normalizeProspectDuplicateKey(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export async function findDuplicateProspect(
  supabase: any,
  companyName: string,
  postalCode: string | null,
  excludedProspectId?: string
) {
  const normalizedCompany = normalizeProspectDuplicateKey(companyName);
  const normalizedPostalCode = normalizeProspectDuplicateKey(postalCode);

  if (!normalizedCompany) {
    return null;
  }

  const { data, error } = await supabase
    .from("prospects")
    .select("id, company_name, postal_code")
    .limit(5000);

  if (error) {
    return null;
  }

  return ((data ?? []) as { id: string; company_name: string; postal_code: string | null }[]).find(
    (prospect) =>
      prospect.id !== excludedProspectId &&
      normalizeProspectDuplicateKey(prospect.company_name) === normalizedCompany &&
      normalizeProspectDuplicateKey(prospect.postal_code) === normalizedPostalCode
  ) ?? null;
}

export function isDuplicateProspectError(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(
    error?.code === "23505" &&
      (error.message?.includes("prospects_unique_company_postal_idx") ||
        error.message?.includes("duplicate key"))
  );
}
