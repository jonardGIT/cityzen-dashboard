"use client";

import { MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { AxiosError } from "axios";
import Link from "next/link";
import { useState } from "react";
import { AuthExperienceShell } from "@/components/auth/AuthExperienceShell";
import { requestPasswordReset } from "@/features/auth/api";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import type { ApiErrorPayload } from "@/types/api";
import type { PasswordResetRequestResponse } from "@/types/auth";

const { Paragraph, Text } = Typography;

interface ForgotPasswordFormValues {
  email: string;
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

function isDevelopmentResetPreview(response: PasswordResetRequestResponse) {
  return (
    process.env.NODE_ENV !== "production" &&
    Boolean(response.resetToken && response.resetExpiresAt)
  );
}

export default function ForgotPasswordPage() {
  const [form] = Form.useForm<ForgotPasswordFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResponse, setSuccessResponse] =
    useState<PasswordResetRequestResponse | null>(null);

  const onFinish = async (values: ForgotPasswordFormValues) => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const response = await requestPasswordReset(values);
      setSuccessResponse(response);
      form.resetFields();
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;
      const mapped = mapValidationErrorsToForm(form, error);

      if (mapped) {
        setErrorMessage(
          axiosError.response?.data?.message ??
            "Please correct the highlighted fields.",
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
            "Unable to process password reset right now.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthExperienceShell
      eyebrow="Recovery flow, same trust signals"
      heroTitle="Request access recovery from the same responsive, low-noise interface."
      heroDescription="Password recovery keeps the same security-first presentation while making rate limits, delivery status, and token previews clear when they affect the next step."
      cardTitle="Reset your password"
      cardDescription="If an account exists, reset instructions are available."
      securityPrompt="Recovery is rate limited and may depend on backend delivery configuration. We surface that status near the action so users know whether to wait or retry."
    >
      {successResponse ? (
        <Alert
          style={{ marginTop: 16 }}
          type="success"
          showIcon
          title="Request accepted"
          description={successResponse.message}
        />
      ) : null}

      {errorMessage ? (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          title="Unable to request reset"
          description={errorMessage}
        />
      ) : null}

      {successResponse && isDevelopmentResetPreview(successResponse) ? (
        <Card size="small" style={{ marginTop: 16 }}>
          <Text strong>Local development reset token</Text>
          <Paragraph copyable style={{ marginTop: 8, marginBottom: 8 }}>
            {successResponse.resetToken}
          </Paragraph>
          <Text type="secondary">Expires {successResponse.resetExpiresAt}</Text>
        </Card>
      ) : null}

      <Form<ForgotPasswordFormValues>
        form={form}
        layout="vertical"
        style={{ marginTop: 18 }}
        onFinish={onFinish}
        requiredMark={false}
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Email is required" },
            { type: "email", message: "Enter a valid email" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Enter your email" />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={submitting} block>
          Request password reset
        </Button>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Link href="/login">Back to sign in</Link>
        </div>
      </Form>
    </AuthExperienceShell>
  );
}
