type ListContainerKey = "data" | "items" | "results" | "value";

type ObjectContainerKey = "data" | "item" | "result" | "value";

const LIST_KEYS: ListContainerKey[] = ["data", "items", "results", "value"];
const OBJECT_KEYS: ObjectContainerKey[] = ["data", "item", "result", "value"];

export function unwrapListResponse<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of LIST_KEYS) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }
  }

  return [];
}

export function unwrapEntityResponse<T>(payload: unknown): T {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of OBJECT_KEYS) {
      const candidate = record[key];
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        return candidate as T;
      }
    }
  }

  return payload as T;
}
