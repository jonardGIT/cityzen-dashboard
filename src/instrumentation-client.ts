import { reportRuntimeError } from "@/lib/monitoring/report-error";

declare global {
  interface Window {
    __xypesDashboardRuntimeHandlersRegistered?: boolean;
  }
}

if (
  typeof window !== "undefined" &&
  !window.__xypesDashboardRuntimeHandlersRegistered
) {
  window.__xypesDashboardRuntimeHandlersRegistered = true;

  window.addEventListener("error", (event) => {
    reportRuntimeError(event.error ?? event.message, {
      scope: "client-window-error",
      metadata: {
        fileName: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportRuntimeError(event.reason, {
      scope: "client-unhandled-rejection",
    });
  });
}
