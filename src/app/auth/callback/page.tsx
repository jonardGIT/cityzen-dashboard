"use client";

import { Alert, Card, Spin, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const { Text, Title } = Typography;

type CallbackType =
  | "email_confirm"
  | "recovery"
  | "magiclink"
  | "invite"
  | "signup"
  | "oauth"
  | "unknown";

const CALLBACK_LABELS: Record<CallbackType, string> = {
  email_confirm: "Confirming your email…",
  recovery: "Processing password recovery…",
  magiclink: "Verifying magic link…",
  invite: "Accepting invitation…",
  signup: "Completing registration…",
  oauth: "Completing sign-in…",
  unknown: "Processing authentication…",
};

function resolveCallbackType(params: URLSearchParams): CallbackType {
  const type = params.get("type");
  if (type && type in CALLBACK_LABELS) {
    return type as CallbackType;
  }

  if (params.has("token_hash") || params.has("access_token")) {
    return "email_confirm";
  }

  return "unknown";
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  const callbackType = resolveCallbackType(searchParams);
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    if (errorParam) {
      setError(errorDescription ?? errorParam);
      return;
    }

    const recoveryToken =
      searchParams.get("token") ??
      searchParams.get("token_hash") ??
      searchParams.get("access_token") ??
      "";

    if (callbackType === "recovery") {
      router.replace(
        `/reset-password${recoveryToken ? `?token=${encodeURIComponent(recoveryToken)}` : ""}`,
      );
      return;
    }

    switch (callbackType) {
      case "email_confirm":
      case "invite":
      case "signup":
        router.replace("/auth/confirm-email?mode=confirmed");
        break;
      case "magiclink":
      case "oauth":
        setError(
          "This dashboard authenticates against the CIRS API login flow. Complete sign-in from the login page.",
        );
        break;
      default:
        router.replace("/login");
    }
  }, [callbackType, errorParam, errorDescription, searchParams, router]);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 16,
        }}
      >
        <Card style={{ width: "100%", maxWidth: 480 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            Authentication failed
          </Title>
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            title="Callback error"
            description={error}
          />
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <a href="/login">Return to sign in</a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        <Spin size="large" />
        <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
          {CALLBACK_LABELS[callbackType]}
        </Title>
        <Text type="secondary">
          You will be redirected automatically. Do not close this tab.
        </Text>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
