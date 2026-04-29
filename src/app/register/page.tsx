"use client";

import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { AxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isCitizenSelfServiceUser } from "@/lib/auth/roles";
import type { ApiErrorPayload } from "@/types/api";

const { Title, Text, Paragraph } = Typography;

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [form] = Form.useForm<RegisterFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { register } = useAuth();
  const router = useRouter();

  const onFinish = async (values: RegisterFormValues) => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await register(values.name, values.email, values.password);

      if (result.emailConfirmationRequired) {
        const email = result.user?.email ?? values.email;
        router.replace(
          `/auth/confirm-email?mode=pending&email=${encodeURIComponent(email)}`,
        );
        return;
      }

      router.replace(
        isCitizenSelfServiceUser(result.auth?.user.role)
          ? "/dashboard/incidents"
          : "/dashboard",
      );
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;
      setErrorMessage(
        axiosError.response?.data?.message ??
          axiosError.message ??
          "Unable to create your account.",
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
      <Card style={{ width: "100%", maxWidth: 440 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Create Citizen Account
        </Title>
        <Text type="secondary">
          Register a citizen self-service account to link your profile and
          report incidents.
        </Text>

        <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          Passwords must be at least 12 characters and include uppercase,
          lowercase, a number, and a special character.
        </Paragraph>

        {errorMessage ? (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            title="Registration Failed"
            description={errorMessage}
          />
        ) : null}

        <Form<RegisterFormValues>
          form={form}
          layout="vertical"
          style={{ marginTop: 18 }}
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Full name"
            rules={[{ required: true, message: "Full name is required" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Enter your full name"
            />
          </Form.Item>

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

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Create a strong password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Re-enter your password"
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={submitting} block>
            Create account
          </Button>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Link href="/login">Already have an account? Sign in</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
