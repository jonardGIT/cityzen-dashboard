"use client";

import {
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { AxiosError } from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isMfaRequiredError } from "@/features/auth/api";
import { isCitizenSelfServiceUser } from "@/lib/auth/roles";
import type { ApiErrorPayload } from "@/types/api";
import type { LoginReason } from "@/types/auth";

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  mfaCode?: string;
}

interface PendingLoginCredentials {
  email: string;
  password: string;
}

const LOGIN_REASON_MESSAGES: Record<LoginReason, string> = {
  "signed-out": "You have been signed out.",
  "session-expired":
    "Your session is no longer active. Sign in again to continue.",
  "session-revoked": "That session was revoked. Sign in again to continue.",
  "mfa-updated":
    "Security settings changed and all active sessions were closed. Sign in again.",
  "password-changed":
    "Your password changed and this session was closed. Sign in again.",
  "role-changed":
    "Your account access changed and this session was closed. Sign in again.",
};

function LoginPageContent() {
  const [form] = Form.useForm<LoginFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [pendingCredentials, setPendingCredentials] =
    useState<PendingLoginCredentials | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const loginReason = searchParams.get("reason") as LoginReason | null;
  const loginInfoMessage = loginReason
    ? (LOGIN_REASON_MESSAGES[loginReason] ?? null)
    : null;
  const emailValue = Form.useWatch("email", form);

  const resetMfaStep = () => {
    setRequiresMfa(false);
    setPendingCredentials(null);
    setErrorMessage(null);
    form.setFieldValue("mfaCode", undefined);
  };

  const onFinish = async (values: LoginFormValues) => {
    setErrorMessage(null);
    setSubmitting(true);

    const email = requiresMfa
      ? (pendingCredentials?.email ?? values.email)
      : values.email;
    const password = requiresMfa
      ? (pendingCredentials?.password ?? values.password)
      : values.password;

    try {
      const result = await login(email, password, values.mfaCode);

      if (result.mfaRequired) {
        setRequiresMfa(true);
        setPendingCredentials({ email, password });
        form.setFieldValue("mfaCode", undefined);
        return;
      }

      if (result.auth?.mfaEnrollmentRequired) {
        router.replace("/profile");
        return;
      }

      router.replace(
        isCitizenSelfServiceUser(result.auth?.user.role)
          ? "/dashboard/incidents"
          : "/dashboard",
      );
    } catch (error) {
      if (isMfaRequiredError(error, Boolean(values.mfaCode))) {
        setRequiresMfa(true);
        setPendingCredentials({ email, password });
        setErrorMessage(null);
        form.setFieldValue("mfaCode", undefined);
        return;
      }

      const axiosError = error as AxiosError<ApiErrorPayload>;
      setErrorMessage(
        axiosError.response?.data?.message ??
          axiosError.message ??
          "Unable to sign in with provided credentials.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          LGU Incident Dashboard
        </Title>
        <Text type="secondary">
          {requiresMfa
            ? "Confirm your sign-in with your authenticator code."
            : "Sign in with your authorized account."}
        </Text>

        {loginInfoMessage ? (
          <Alert
            style={{ marginTop: 16 }}
            type="info"
            showIcon
            title="Sign-in required"
            description={loginInfoMessage}
          />
        ) : null}

        {errorMessage ? (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            title={requiresMfa ? "Verification Failed" : "Login Failed"}
            description={errorMessage}
          />
        ) : null}

        {requiresMfa ? (
          <Alert
            style={{ marginTop: 16 }}
            type="info"
            showIcon
            title="Step 2 of 2: Verify your sign-in"
            description={`Enter the 6-digit code from the authenticator app for ${pendingCredentials?.email?.trim() || emailValue?.trim() || "this account"}.`}
          />
        ) : null}

        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          style={{ marginTop: 18 }}
          onFinish={onFinish}
          requiredMark={false}
        >
          {!requiresMfa ? (
            <>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Enter your email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: "Password is required" }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter your password"
                />
              </Form.Item>
            </>
          ) : null}

          {requiresMfa ? (
            <Space
              orientation="vertical"
              size={12}
              style={{ width: "100%", marginBottom: 16 }}
            >
              <Form.Item
                name="mfaCode"
                label="Authentication code"
                rules={[
                  {
                    required: true,
                    message: "Authentication code is required",
                  },
                  {
                    len: 6,
                    message:
                      "Enter the 6-digit code from your authenticator app",
                  },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="Enter 6-digit MFA code"
                  maxLength={6}
                />
              </Form.Item>
            </Space>
          ) : null}

          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Button type="primary" htmlType="submit" loading={submitting} block>
              {requiresMfa ? "Verify And Sign In" : "Sign In"}
            </Button>

            {requiresMfa ? (
              <Button onClick={resetMfaStep} disabled={submitting} block>
                Use A Different Account
              </Button>
            ) : null}
          </Space>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <div style={{ marginBottom: 8 }}>
              <Link href="/register">Create a citizen account</Link>
            </div>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
