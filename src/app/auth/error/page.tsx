"use client";

import { Button, Card, Result } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ERROR_TITLES: Record<string, string> = {
  access_denied: "Access denied",
  unauthorized_client: "Unauthorized client",
  server_error: "Server error",
  invalid_request: "Invalid request",
  expired_token: "Token expired",
  otp_expired: "Verification code expired",
  otp_disabled: "Verification is disabled",
  user_banned: "Account suspended",
  validation_failed: "Validation failed",
};

function resolveErrorTitle(code: string | null): string {
  if (!code) return "Authentication error";
  return ERROR_TITLES[code] ?? "Authentication error";
}

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error") ?? searchParams.get("code");
  const errorDescription =
    searchParams.get("error_description") ?? searchParams.get("message");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 520 }}>
        <Result
          status="error"
          title={resolveErrorTitle(errorCode)}
          subTitle={
            errorDescription ??
            "Something went wrong during authentication. Please try again or contact support."
          }
          extra={[
            <Button type="primary" key="login">
              <Link href="/login">Sign in</Link>
            </Button>,
            <Button key="reset">
              <Link href="/forgot-password">Reset password</Link>
            </Button>,
          ]}
        />
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  );
}
