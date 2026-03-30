"use client";

import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  QRCode,
  Space,
  Tag,
  Typography,
} from "antd";
import { AxiosError } from "axios";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useAuthSessionsQuery,
  useCreateMfaSetupMutation,
  useDisableMfaMutation,
  useEnableMfaMutation,
  useRevokeAuthSessionMutation,
} from "@/features/auth/api";
import { CAN_MANAGE_MFA } from "@/lib/auth/permissions";
import { getRoleLabel } from "@/lib/auth/roles";
import type { ApiErrorPayload } from "@/types/api";
import type {
  AuthSessionSummary,
  MfaCodeRequest,
  MfaSetupResponse,
} from "@/types/auth";

const { Paragraph, Text, Title } = Typography;

function getDisplayError(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  return axiosError.response?.data?.message ?? axiosError.message ?? fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function getSessionTitle(session: AuthSessionSummary) {
  return session.userAgent?.trim() || `Session ${session.id}`;
}

function getSessionDescription(session: AuthSessionSummary) {
  const parts = [
    session.ipAddress?.trim(),
    `Expires ${formatDateTime(session.expiresAt)}`,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" | ");
}

function getSessionActionLabel(session: AuthSessionSummary) {
  return session.isCurrent ? "Sign Out This Session" : "Revoke Session";
}

function getSessionActionDescription(session: AuthSessionSummary) {
  if (session.isCurrent) {
    return "This immediately signs out the current device and returns you to the login screen.";
  }

  return "This removes access for that device session immediately. The user must sign in again to continue.";
}

function MfaSetupCard({ setup }: { setup: MfaSetupResponse }) {
  return (
    <Card size="small" style={{ marginTop: 16 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Text strong>Scan this code in your authenticator app</Text>
        <QRCode value={setup.otpauthUrl} size={180} />
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Issuer">{setup.issuer}</Descriptions.Item>
          <Descriptions.Item label="Account">
            {setup.accountName}
          </Descriptions.Item>
          <Descriptions.Item label="Secret">
            <Paragraph copyable style={{ marginBottom: 0 }}>
              {setup.secret}
            </Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="Enrollment URL">
            <Paragraph copyable style={{ marginBottom: 0 }}>
              {setup.otpauthUrl}
            </Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  );
}

export default function ProfilePage() {
  const { message } = App.useApp();
  const [enableForm] = Form.useForm<MfaCodeRequest>();
  const [disableForm] = Form.useForm<MfaCodeRequest>();
  const [mfaSetupIssue, setMfaSetupIssue] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const sessionsQuery = useAuthSessionsQuery(Boolean(user));
  const revokeSessionMutation = useRevokeAuthSessionMutation();
  const createMfaSetupMutation = useCreateMfaSetupMutation();
  const enableMfaMutation = useEnableMfaMutation();
  const disableMfaMutation = useDisableMfaMutation();

  const pendingSetup = createMfaSetupMutation.data;
  const canManageMfa = Boolean(
    user?.role && CAN_MANAGE_MFA.includes(user.role),
  );

  const handleRevokeSession = async (session: AuthSessionSummary) => {
    try {
      await revokeSessionMutation.mutateAsync(session.id);

      if (session.isCurrent) {
        await logout({
          revokeRemote: false,
          redirectTo: "/login?reason=session-revoked",
        });
        return;
      }

      message.success("Session revoked.");
    } catch (error) {
      message.error(getDisplayError(error, "Failed to revoke session."));
    }
  };

  const handleCreateMfaSetup = async () => {
    setMfaSetupIssue(null);

    try {
      await createMfaSetupMutation.mutateAsync();
      message.success("MFA setup generated.");
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;
      const issueMessage = getDisplayError(
        error,
        "MFA setup is unavailable until the API environment is configured.",
      );

      if (axiosError.response?.status === 503) {
        setMfaSetupIssue(issueMessage);
        return;
      }

      message.error(issueMessage);
    }
  };

  const handleEnableMfa = async (values: MfaCodeRequest) => {
    try {
      const response = await enableMfaMutation.mutateAsync(values);
      message.success(response.message || "MFA enabled.");
      enableForm.resetFields();
      await logout({
        revokeRemote: false,
        redirectTo: "/login?reason=mfa-updated",
      });
    } catch (error) {
      message.error(getDisplayError(error, "Failed to enable MFA."));
    }
  };

  const handleDisableMfa = async (values: MfaCodeRequest) => {
    try {
      const response = await disableMfaMutation.mutateAsync(values);
      message.success(response.message || "MFA disabled.");
      disableForm.resetFields();
      await logout({
        revokeRemote: false,
        redirectTo: "/login?reason=mfa-updated",
      });
    } catch (error) {
      message.error(getDisplayError(error, "Failed to disable MFA."));
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        Account Security
      </Title>

      <Card>
        <Descriptions column={1}>
          <Descriptions.Item label="ID">
            {String(user?.id ?? "N/A")}
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            {user?.email ?? "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Role">
            {user?.role ? getRoleLabel(user.role) : "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Name">
            {user?.name ?? "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="MFA status">
            {user?.mfaEnabled ? (
              <Tag color="green">Enabled</Tag>
            ) : (
              <Tag>Disabled</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="MFA enabled at">
            {formatDateTime(user?.mfaEnabledAt)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="Device Sessions"
        extra={
          <Button
            onClick={() => void sessionsQuery.refetch()}
            loading={sessionsQuery.isFetching}
          >
            Refresh
          </Button>
        }
      >
        <Alert
          style={{ marginBottom: 16 }}
          type="warning"
          showIcon
          message="Session controls affect live access"
          description="Revoking another session ends access on that device immediately. Signing out the current session returns you to the login screen."
        />

        {sessionsQuery.isLoading ? (
          <Text type="secondary">Loading your active sessions...</Text>
        ) : sessionsQuery.data && sessionsQuery.data.length > 0 ? (
          <List
            itemLayout="vertical"
            dataSource={sessionsQuery.data}
            renderItem={(session) => {
              const isRevoking =
                revokeSessionMutation.isPending &&
                revokeSessionMutation.variables === session.id;

              return (
                <List.Item
                  actions={[
                    <Button
                      key="revoke"
                      danger
                      loading={isRevoking}
                      disabled={Boolean(session.revokedAt)}
                      title={getSessionActionDescription(session)}
                      onClick={() => void handleRevokeSession(session)}
                    >
                      {getSessionActionLabel(session)}
                    </Button>,
                  ]}
                >
                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: "100%" }}
                  >
                    <Space wrap>
                      <Text strong>{getSessionTitle(session)}</Text>
                      {session.isCurrent ? (
                        <Tag color="blue">Current</Tag>
                      ) : null}
                      {session.revokedAt ? (
                        <Tag color="red">Revoked</Tag>
                      ) : (
                        <Tag color="green">Active</Tag>
                      )}
                    </Space>
                    <Text type="secondary">
                      {getSessionDescription(session)}
                    </Text>
                    <Space wrap>
                      <Text>Created {formatDateTime(session.createdAt)}</Text>
                      <Text>
                        Last used {formatDateTime(session.lastUsedAt)}
                      </Text>
                      <Text>
                        Refresh expires{" "}
                        {formatDateTime(session.refreshExpiresAt)}
                      </Text>
                      <Text>
                        IP {session.ipAddress?.trim() || "Not reported"}
                      </Text>
                      <Text>
                        User agent {session.userAgent?.trim() || "Not reported"}
                      </Text>
                    </Space>
                    <Text type="secondary">
                      {getSessionActionDescription(session)}
                    </Text>
                  </Space>
                </List.Item>
              );
            }}
          />
        ) : sessionsQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load sessions"
            description={getDisplayError(
              sessionsQuery.error,
              "Failed to load account sessions.",
            )}
          />
        ) : (
          <Empty description="No server-side sessions found." />
        )}
      </Card>

      <Card title="Multi-Factor Authentication">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            type={user?.mfaEnabled ? "success" : "info"}
            showIcon
            message={user?.mfaEnabled ? "MFA is enabled" : "MFA is not enabled"}
            description={
              canManageMfa
                ? "Privileged accounts can enroll an authenticator app and must sign in again after security settings change."
                : "MFA enrollment is only available to privileged accounts in this dashboard."
            }
          />

          {canManageMfa ? (
            <Alert
              type="warning"
              showIcon
              message="Security changes will sign out all active sessions"
              description="After MFA is enabled or disabled, the backend revokes active sessions and you must sign in again with the updated security settings."
            />
          ) : null}

          {mfaSetupIssue ? (
            <Alert
              type="error"
              showIcon
              message="MFA setup is unavailable on the API"
              description={`${mfaSetupIssue} Operator action is required on the backend before MFA enrollment can be used.`}
            />
          ) : null}

          {canManageMfa ? (
            user?.mfaEnabled ? (
              <Form<MfaCodeRequest>
                form={disableForm}
                layout="vertical"
                onFinish={(values) => void handleDisableMfa(values)}
                requiredMark={false}
              >
                <Form.Item
                  name="code"
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
                >
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Enter 6-digit code to disable MFA"
                  />
                </Form.Item>

                <Button
                  danger
                  htmlType="submit"
                  loading={disableMfaMutation.isPending}
                >
                  Disable MFA
                </Button>
              </Form>
            ) : (
              <>
                <Space wrap>
                  <Button
                    type="primary"
                    onClick={() => void handleCreateMfaSetup()}
                    loading={createMfaSetupMutation.isPending}
                  >
                    {pendingSetup ? "Regenerate Setup" : "Generate Setup"}
                  </Button>
                </Space>

                {pendingSetup ? <MfaSetupCard setup={pendingSetup} /> : null}

                {pendingSetup ? (
                  <Form<MfaCodeRequest>
                    form={enableForm}
                    layout="vertical"
                    onFinish={(values) => void handleEnableMfa(values)}
                    requiredMark={false}
                  >
                    <Form.Item
                      name="code"
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
                    >
                      <Input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="Enter 6-digit code to enable MFA"
                      />
                    </Form.Item>

                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={enableMfaMutation.isPending}
                    >
                      Enable MFA
                    </Button>
                  </Form>
                ) : null}
              </>
            )
          ) : null}
        </Space>
      </Card>
    </Space>
  );
}
