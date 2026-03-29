"use client";

import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { AxiosError } from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { confirmPasswordReset } from "@/features/auth/api";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import type { ApiErrorPayload } from "@/types/api";

const { Text, Title } = Typography;

interface ResetPasswordFormValues {
  token: string;
  password: string;
  confirmPassword: string;
}

function parseRetryAfter(error: AxiosError<ApiErrorPayload>) {
  const retryAfterHeader = error.response?.headers?.["retry-after"];
  if (!retryAfterHeader) {
    return null;
  }

  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return `${retryAfterSeconds} seconds`;
  }

  return String(retryAfterHeader);
}

function ResetPasswordPageContent() {
  const [form] = Form.useForm<ResetPasswordFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tokenState, setTokenState] = useState<"idle" | "invalid" | "success">(
    "idle",
  );
  const { clearSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      form.setFieldValue("token", token);
    }
  }, [form, searchParams]);

  const onFinish = async (values: ResetPasswordFormValues) => {
    setErrorMessage(null);
    setTokenState("idle");
    setSubmitting(true);

    if (values.password !== values.confirmPassword) {
      form.setFields([
        {
          name: "confirmPassword",
          errors: ["Passwords do not match"],
        },
      ]);
      setSubmitting(false);
      return;
    }

    try {
      await confirmPasswordReset({
        token: values.token,
        password: values.password,
      });
      clearSession();
      setTokenState("success");
      form.resetFields();
      window.setTimeout(() => {
        router.replace("/login?reason=password-changed");
      }, 1600);
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;
      const mapped = mapValidationErrorsToForm(form, error);

      if (axiosError.response?.status === 401) {
        setTokenState("invalid");
        setErrorMessage(
          axiosError.response?.data?.message ??
            "This reset token is invalid or has expired.",
        );
      } else if (mapped) {
        setErrorMessage(
          axiosError.response?.data?.message ??
            "Please correct the highlighted fields.",
        );
      } else if (axiosError.response?.status === 422) {
        setErrorMessage(
          axiosError.response?.data?.message ??
            "Password must meet the required policy.",
        );
      } else if (axiosError.response?.status === 429) {
        const retryAfter = parseRetryAfter(axiosError);
        setErrorMessage(
          retryAfter
            ? `Too many reset attempts. Try again in ${retryAfter}.`
            : "Too many reset attempts. Try again shortly.",
        );
      } else if (axiosError.response?.status === 503) {
        setErrorMessage(
          "Password reset is temporarily unavailable because the API recovery service is not configured.",
        );
      } else {
        setErrorMessage(
          axiosError.response?.data?.message ??
            axiosError.message ??
            "Unable to reset password right now.",
        );
      }
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
      <Card style={{ width: "100%", maxWidth: 480 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Choose a new password
        </Title>
        <Text type="secondary">
          Enter your reset token and a strong new password to regain access.
        </Text>

        {tokenState === "success" ? (
          <Alert
            style={{ marginTop: 16 }}
            type="success"
            showIcon
            message="Password reset complete"
            description="Your password has been updated. You will be redirected to sign in again."
          />
        ) : null}

        {tokenState === "invalid" ? (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            message="Invalid or expired reset token"
            description={errorMessage}
          />
        ) : errorMessage ? (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            message="Unable to reset password"
            description={errorMessage}
          />
        ) : null}

        <Form<ResetPasswordFormValues>
          form={form}
          layout="vertical"
          style={{ marginTop: 18 }}
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            name="token"
            label="Reset token"
            rules={[{ required: true, message: "Reset token is required" }]}
          >
            <Input placeholder="Paste your reset token" />
          </Form.Item>

          <Form.Item
            name="password"
            label="New password"
            rules={[{ required: true, message: "New password is required" }]}
            extra="Use at least 12 characters with uppercase, lowercase, number, and special character."
          >
            <Input.Password placeholder="Enter a strong new password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm new password"
            rules={[
              { required: true, message: "Please confirm your new password" },
            ]}
          >
            <Input.Password placeholder="Re-enter your new password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={submitting} block>
            Reset password
          </Button>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Link href="/login">Back to sign in</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
