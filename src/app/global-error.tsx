"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportRuntimeError } from "@/lib/monitoring/report-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportRuntimeError(error, {
      scope: "global-route-boundary",
      metadata: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Dashboard Unavailable</h1>
          <p style={copyStyle}>
            A fatal application error interrupted the dashboard bootstrap. Retry
            once, then return to sign-in if the problem persists.
          </p>
          <div style={actionsStyle}>
            <button onClick={() => reset()} style={buttonStyle}>
              Retry bootstrap
            </button>
            <Link href="/login" style={linkStyle}>
              Return to sign in
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "#f3ede2",
  fontFamily: "system-ui, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "640px",
  padding: "32px",
  borderRadius: "24px",
  background: "#ffffff",
  boxShadow: "0 16px 48px rgba(37, 28, 18, 0.12)",
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
  background: "#1e3a5f",
  color: "#fff",
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "12px 18px",
  color: "#1e3a5f",
  textDecoration: "none",
  border: "1px solid rgba(30, 58, 95, 0.2)",
};
