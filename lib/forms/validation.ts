export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function requiredText(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return { ok: false as const, error: `${label} est obligatoire.` };
  }

  return { ok: true as const, data: value };
}

export function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export function optionalEmail(formData: FormData, key: string, label: string) {
  const value = optionalText(formData, key);

  if (!value) {
    return { ok: true as const, data: null };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ok: false as const, error: `${label} est invalide.` };
  }

  return { ok: true as const, data: value };
}

export function optionalNonNegativeNumber(formData: FormData, key: string, label: string) {
  const value = optionalText(formData, key);

  if (!value) {
    return { ok: true as const, data: null };
  }

  const parsed = Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return { ok: false as const, error: `${label} doit etre un nombre positif.` };
  }

  return { ok: true as const, data: parsed };
}

export function optionalScaleNumber(formData: FormData, key: string, label: string) {
  const value = optionalText(formData, key);

  if (!value) {
    return { ok: true as const, data: null };
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return { ok: false as const, error: `${label} doit etre compris entre 1 et 5.` };
  }

  return { ok: true as const, data: parsed };
}

export function requiredEnum<const T extends readonly string[]>(
  formData: FormData,
  key: string,
  label: string,
  values: T
) {
  const value = String(formData.get(key) ?? "").trim();

  if (!values.includes(value)) {
    return { ok: false as const, error: `${label} est invalide.` };
  }

  return { ok: true as const, data: value as T[number] };
}

export function optionalDateTime(formData: FormData, key: string, label: string) {
  const value = optionalText(formData, key);

  if (!value) {
    return { ok: true as const, data: null };
  }

  return parseDateTime(value, label);
}

export function requiredDateTime(formData: FormData, key: string, label: string) {
  const value = requiredText(formData, key, label);

  if (!value.ok) {
    return value;
  }

  return parseDateTime(value.data, label);
}

export function normalizeOptionalWebsite(formData: FormData, key: string) {
  const value = optionalText(formData, key);

  if (!value) {
    return { ok: true as const, data: null };
  }

  const normalized =
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;

  try {
    return { ok: true as const, data: new URL(normalized).toString() };
  } catch {
    return { ok: false as const, error: "Site web invalide." };
  }
}

function parseDateTime(value: string, label: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { ok: false as const, error: `${label} est invalide.` };
  }

  return { ok: true as const, data: date.toISOString() };
}
