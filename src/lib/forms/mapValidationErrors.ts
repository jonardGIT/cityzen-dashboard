import type { FormInstance } from "antd";
import type { AxiosError } from "axios";
import type { ApiErrorPayload } from "@/types/api";

export function mapValidationErrorsToForm(
  form: FormInstance,
  error: unknown,
): boolean {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const errors = axiosError?.response?.data?.errors;

  if (!Array.isArray(errors) || errors.length === 0) {
    return false;
  }

  form.setFields(
    errors
      .filter((issue) => issue.field)
      .map((issue) => ({
        name: String(issue.field),
        errors: [issue.message ?? "Invalid value"],
      })),
  );

  return true;
}
