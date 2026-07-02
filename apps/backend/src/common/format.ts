export function parseMetricValue(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = value
    .replace(/,/g, ".")
    .replace(/\s+/g, "")
    .replace(/[^0-9.-]/g, "");

  if (!normalized || normalized === "." || normalized === "-" || normalized === "-.") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toIsoString(
  value: Date | string | number | null | undefined,
  numericUnit: "milliseconds" | "seconds" = "milliseconds"
): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    const timestamp = numericUnit === "seconds" ? value * 1000 : value;
    return new Date(timestamp).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
