"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportRuntimeError } from "@/lib/monitoring/report-error";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportRuntimeError(error, {
      scope: "protected-route-boundary",
      metadata: { digest: error.digest },
    });
  }, [error]);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Protected Workspace Error</h1>
        <p style={copyStyle}>
          The authenticated dashboard workspace failed while rendering or
          loading data. Retry the current screen, or step back to the main
          dashboard shell.
        </p>
        <div style={actionsStyle}>
          <button onClick={() => reset()} style={buttonStyle}>
            Retry screen
          </button>
          <Link href="/dashboard" style={linkStyle}>
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: "70vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "720px",
  padding: "32px",
  borderRadius: "24px",
  background: "#fffaf3",
  boxShadow: "0 16px 40px rgba(63, 43, 20, 0.12)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "2rem",
};

const copyStyle: React.CSSProperties = {
  marginTop: "12px",
  lineHeight: 1.6,
};

const actionsStyle: React.CSSProperties = {
  marginTop: "20px",
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: "999px",
  padding: "12px 18px",
  background: "#183a37",
  color: "#fff",
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "12px 18px",
  color: "#183a37",
  textDecoration: "none",
  border: "1px solid rgba(24, 58, 55, 0.2)",
};
