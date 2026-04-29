export interface RuntimeErrorContext {
  scope: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown runtime error",
    value: error,
  };
}

export function reportRuntimeError(
  error: unknown,
  context: RuntimeErrorContext,
): void {
  const payload = {
    scope: context.scope,
    message: context.message,
    metadata: context.metadata,
    error: serializeError(error),
    timestamp: new Date().toISOString(),
  };

  console.error("[dashboard-runtime-error]", payload);
}
