"use client";

import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Typography } from "antd";
import { AxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthExperienceShell } from "@/components/auth/AuthExperienceShell";
import { useAuth } from "@/context/AuthContext";
import { isCitizenSelfServiceUser } from "@/lib/auth/roles";
import type { ApiErrorPayload } from "@/types/api";

const { Paragraph } = Typography;

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
    <AuthExperienceShell
      eyebrow="Citizen access, protected by design"
      heroTitle="Create a self-service account without leaving the secure flow."
      heroDescription="Registration uses the same responsive, security-forward experience as sign-in so citizens can create accounts, confirm access, and continue into incident reporting with less friction."
      cardTitle="Create Citizen Account"
      cardDescription="Register a citizen self-service account to link your profile and report incidents."
      securityPrompt="Use a strong password and a valid email address. Some accounts will need email confirmation before access is granted."
    >
      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
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
          <Input prefix={<UserOutlined />} placeholder="Enter your full name" />
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
    </AuthExperienceShell>
  );
}
