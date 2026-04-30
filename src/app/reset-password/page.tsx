"use client";

import { KeyOutlined, LockOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input } from "antd";
import { AxiosError } from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthExperienceShell } from "@/components/auth/AuthExperienceShell";
import { useAuth } from "@/context/AuthContext";
import { confirmPasswordReset } from "@/features/auth/api";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import type { ApiErrorPayload } from "@/types/api";

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
    const token =
      window.sessionStorage.getItem("xypes_password_reset_token") ??
      searchParams.get("token");
    if (token) {
      form.setFieldValue("token", token);
      if (searchParams.get("token")) {
        window.history.replaceState(null, "", "/reset-password");
      }
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
      window.sessionStorage.removeItem("xypes_password_reset_token");
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
        window.sessionStorage.removeItem("xypes_password_reset_token");
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
    <AuthExperienceShell
      eyebrow="Token verification, clear and contained"
      heroTitle="Complete password recovery without losing the security context."
      heroDescription="The reset flow keeps the token, password policy, and invalid-token states visible in one place so users can recover access without guessing what failed."
      cardTitle="Choose a new password"
      cardDescription="Enter your reset token and a strong new password to regain access."
      securityPrompt="Reset tokens can expire or be revoked. Invalid-token, policy, and retry-limit states are shown inline so recovery stays explicit and trustworthy."
    >
      {tokenState === "success" ? (
        <Alert
          style={{ marginTop: 16 }}
          type="success"
          showIcon
          title="Password reset complete"
          description="Your password has been updated. You will be redirected to sign in again."
        />
      ) : null}

      {tokenState === "invalid" ? (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          title="Invalid or expired reset token"
          description={errorMessage}
        />
      ) : errorMessage ? (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          title="Unable to reset password"
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
          <Input
            prefix={<KeyOutlined />}
            placeholder="Paste your reset token"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="New password"
          rules={[{ required: true, message: "New password is required" }]}
          extra="Use at least 12 characters with uppercase, lowercase, number, and special character."
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter a strong new password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm new password"
          rules={[
            { required: true, message: "Please confirm your new password" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Re-enter your new password"
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={submitting} block>
          Reset password
        </Button>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Link href="/login">Back to sign in</Link>
        </div>
      </Form>
    </AuthExperienceShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
