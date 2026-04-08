"use client";

import { CheckCircleOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Card, Result, Typography } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const { Paragraph, Text } = Typography;

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const mode = searchParams.get("mode");

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
          icon={<MailOutlined style={{ color: "#175bcf" }} />}
          title={mode === "confirmed" ? "Email confirmed" : "Check your email"}
          subTitle={
            mode === "confirmed"
              ? "Your email verification completed. Sign in to continue."
              : email
                ? `We sent a confirmation link to ${email}.`
                : "We sent a confirmation link to your email address."
          }
        />

        <div style={{ padding: "0 24px" }}>
          <Paragraph>
            <CheckCircleOutlined style={{ marginRight: 8, color: "#52c41a" }} />
            {mode === "confirmed"
              ? "Your account is ready for the standard login flow."
              : "Click the link in the email to verify your account."}
          </Paragraph>
          <Paragraph>
            <Text type="secondary">
              {mode === "confirmed"
                ? "This dashboard signs users in through the CIRS API login endpoint after verification completes."
                : "If you don&apos;t see the email, check your spam folder. Verification resend must be handled by the active registration flow."}
            </Text>
          </Paragraph>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <Button type="primary">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
