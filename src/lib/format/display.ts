import { formatDateLikeString } from "@/lib/format/date-time";

function normalizeNamePart(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getPreferredDisplayName(
  value:
    | {
        firstName?: unknown;
        middleName?: unknown;
        lastName?: unknown;
        suffix?: unknown;
      }
    | null
    | undefined,
): string {
  const splitName = [
    normalizeNamePart(value?.firstName),
    normalizeNamePart(value?.middleName),
    normalizeNamePart(value?.lastName),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  const suffix = normalizeNamePart(value?.suffix);
  const displayName = [splitName, suffix]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return displayName.length > 0 ? displayName : "N/A";
}

export function humanizeKey(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/\bId\b/i, "ID")
    .trim();
}

export function isDateLikeFieldName(key: string): boolean {
  return /(^date|date$|At$|_at$|timestamp|time$)/i.test(key);
}

export function formatDisplayValue(
  value: unknown,
  optionLabels?: Map<string, string>,
): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatDisplayValue(item, optionLabels))
      .filter((item) => item !== "N/A");
    return items.length > 0 ? items.join(", ") : "N/A";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredDisplayName = getPreferredDisplayName(record);

    if (preferredDisplayName !== "N/A") {
      return preferredDisplayName;
    }

    if (typeof record.name === "string" && record.name.length > 0) {
      return record.name;
    }

    if (typeof record.label === "string" && record.label.length > 0) {
      return record.label;
    }

    if (
      typeof record.description === "string" &&
      record.description.length > 0
    ) {
      return record.description;
    }

    if (typeof record.email === "string" && record.email.length > 0) {
      return record.email;
    }

    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    if (optionLabels?.has(value)) {
      return optionLabels.get(value) ?? value;
    }

    return formatDateLikeString(value) ?? value;
  }

  if (typeof value === "number" && optionLabels?.has(String(value))) {
    return optionLabels.get(String(value)) ?? String(value);
  }

  return String(value);
}
