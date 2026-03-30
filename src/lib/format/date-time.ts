const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function parseDateValue(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDisplayDateTime(value: unknown): string {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return typeof value === "string" && value.trim().length > 0 ? value : "N/A";
  }

  return DATE_TIME_FORMATTER.format(parsed);
}

export function formatDisplayRelativeTime(value: unknown): string | null {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return null;
  }

  const diffMs = parsed.getTime() - Date.now();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMs) < hourMs) {
    return formatter.format(Math.round(diffMs / minuteMs), "minute");
  }

  if (Math.abs(diffMs) < dayMs) {
    return formatter.format(Math.round(diffMs / hourMs), "hour");
  }

  return formatter.format(Math.round(diffMs / dayMs), "day");
}

export function formatDateLikeString(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isDateLike =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(
      trimmed,
    );

  if (!isDateLike) {
    return null;
  }

  return formatDisplayDateTime(trimmed);
}