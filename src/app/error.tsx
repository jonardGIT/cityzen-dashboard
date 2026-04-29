"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportRuntimeError } from "@/lib/monitoring/report-error";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportRuntimeError(error, {
      scope: "root-route-boundary",
      metadata: { digest: error.digest },
    });
  }, [error]);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Dashboard Error</h1>
        <p style={copyStyle}>
          The dashboard hit an unexpected problem. Retry this route, or return
          to the main workspace if the issue continues.
        </p>
        <div style={actionsStyle}>
          <button onClick={() => reset()} style={buttonStyle}>
            Retry
          </button>
          <Link href="/dashboard" style={linkStyle}>
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "linear-gradient(180deg, #f5f1e8 0%, #ece4d6 100%)",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "640px",
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
