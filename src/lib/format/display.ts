import { formatDateLikeString } from "@/lib/format/date-time";

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
    const fullName = [record.firstName, record.lastName]
      .filter(
        (part): part is string => typeof part === "string" && part.length > 0,
      )
      .join(" ");

    if (typeof record.name === "string" && record.name.length > 0) {
      return record.name;
    }

    if (fullName.length > 0) {
      return fullName;
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
