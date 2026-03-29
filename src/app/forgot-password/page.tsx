"use client";

import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { AxiosError } from "axios";
import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/features/auth/api";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import type { ApiErrorPayload } from "@/types/api";
import type { PasswordResetRequestResponse } from "@/types/auth";

const { Paragraph, Text, Title } = Typography;

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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 460 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Reset your password
        </Title>
        <Text type="secondary">
          If an account exists, reset instructions are available.
        </Text>

        {successResponse ? (
          <Alert
            style={{ marginTop: 16 }}
            type="success"
            showIcon
            message="Request accepted"
            description={successResponse.message}
          />
        ) : null}

        {errorMessage ? (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            message="Unable to request reset"
            description={errorMessage}
          />
        ) : null}

        {successResponse && isDevelopmentResetPreview(successResponse) ? (
          <Card size="small" style={{ marginTop: 16 }}>
            <Text strong>Local development reset token</Text>
            <Paragraph copyable style={{ marginTop: 8, marginBottom: 8 }}>
              {successResponse.resetToken}
            </Paragraph>
            <Text type="secondary">
              Expires {successResponse.resetExpiresAt}
            </Text>
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
            <Input placeholder="Enter your email" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={submitting} block>
            Request password reset
          </Button>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Link href="/login">Back to sign in</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
