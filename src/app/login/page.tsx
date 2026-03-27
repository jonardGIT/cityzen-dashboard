"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { ApiErrorPayload } from "@/types/api";

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const onFinish = async (values: LoginFormValues) => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await login(values.email, values.password);
      router.replace("/dashboard");
    } catch (error) {
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
        <Text type="secondary">Sign in with your authorized account.</Text>

        {errorMessage ? (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            title="Login Failed"
            description={errorMessage}
          />
        ) : null}

        <Form<LoginFormValues>
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

          <Button type="primary" htmlType="submit" loading={submitting} block>
            Sign In
          </Button>
        </Form>
      </Card>
    </div>
  );
}
