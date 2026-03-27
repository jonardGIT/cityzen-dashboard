import { CrudRequestError } from "@/features/dynamic-crud/api-client";
import type { ListFilter } from "@/lib/api/list-query-params";
import type { ApiErrorPayload } from "@/types/api";

export interface ListQueryValidationState {
  message: string;
  generalErrors: string[];
  filterErrorsByField: Record<string, string[]>;
  sortErrorsByField: Record<string, string[]>;
}

function appendFieldError(
  target: Record<string, string[]>,
  field: string,
  message: string,
) {
  target[field] = [...(target[field] ?? []), message];
}

export function extractListQueryValidation(
  error: unknown,
  filters: ListFilter[],
  sortBy: string,
): ListQueryValidationState | null {
  if (!(error instanceof CrudRequestError) || error.status !== 422) {
    return null;
  }

  const payload = error.details as ApiErrorPayload | undefined;
  const issues = Array.isArray(payload?.errors) ? payload.errors : [];
  const generalErrors: string[] = [];
  const filterErrorsByField: Record<string, string[]> = {};
  const sortErrorsByField: Record<string, string[]> = {};
  const fallbackMessage = payload?.message ?? error.message ?? "Invalid query parameters.";

  for (const issue of issues) {
    const message = issue.message ?? fallbackMessage;
    const issueField = issue.field ?? "";
    const filterIndexMatch = issueField.match(/^filters\[(\d+)\]\.(field|operator|value)$/);

    if (filterIndexMatch) {
      const filterIndex = Number(filterIndexMatch[1]);
      const filterField = filters[filterIndex]?.field;
      if (filterField) {
        appendFieldError(filterErrorsByField, filterField, message);
        continue;
      }
    }

    if (issueField === "filters") {
      generalErrors.push(message);
      continue;
    }

    if (issueField === "sortBy" || issueField === "sortOrder") {
      appendFieldError(sortErrorsByField, sortBy, message);
      continue;
    }

    if (filters.some((filter) => filter.field === issueField)) {
      appendFieldError(filterErrorsByField, issueField, message);
      continue;
    }

    generalErrors.push(message);
  }

  if (generalErrors.length === 0 && Object.keys(filterErrorsByField).length === 0 && Object.keys(sortErrorsByField).length === 0) {
    generalErrors.push(fallbackMessage);
  }

  return {
    message: fallbackMessage,
    generalErrors,
    filterErrorsByField,
    sortErrorsByField,
  };
}